import "server-only";

import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/types/database";

const CONTACT_RATE_LIMIT = 4;
const CONTACT_RATE_WINDOW_SECONDS = 600;

const contactRateLimitScript = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
return count
`;

type TurnstileResponse = {
  success?: unknown;
  hostname?: unknown;
};

export function isContactSubmissionConfigured(): boolean {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  let validSiteUrl = false;
  if (siteUrl) {
    try {
      const parsedUrl = new URL(siteUrl);
      validSiteUrl =
        parsedUrl.protocol === "https:" || parsedUrl.hostname === "localhost";
    } catch {
      validSiteUrl = false;
    }
  }

  return Boolean(
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() &&
      process.env.TURNSTILE_SECRET_KEY?.trim() &&
      validSiteUrl &&
      process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim(),
  );
}

export function getContactFormAvailability(): {
  enabled: boolean;
  turnstileSiteKey: string;
} {
  const enabled = isContactSubmissionConfigured();
  return {
    enabled,
    turnstileSiteKey: enabled
      ? process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? ""
      : "",
  };
}

function getClientIp(requestHeaders: Headers): string | null {
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  const candidates = forwardedFor ? forwardedFor.split(",").reverse() : [];
  return candidates
    .map((candidate) => candidate?.trim())
    .find((candidate): candidate is string => Boolean(candidate && isIP(candidate))) ?? null;
}

async function verifyTurnstile(token: string): Promise<boolean> {
  if (!isContactSubmissionConfigured() || !token || token.length > 2048) {
    return false;
  }
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!secret || !siteOrigin) return false;

  try {
    const configuredOrigin = new URL(siteOrigin);
    if (
      configuredOrigin.protocol !== "https:" &&
      configuredOrigin.hostname !== "localhost"
    ) {
      return false;
    }
    const expectedHostname = configuredOrigin.hostname;
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, response: token }),
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!response.ok) return false;
    const result: TurnstileResponse = await response.json();
    return result.success === true && result.hostname === expectedHostname;
  } catch {
    return false;
  }
}

async function consumeDistributedRateLimit(ip: string): Promise<boolean | null> {
  if (!isContactSubmissionConfigured()) return null;
  const endpoint = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!endpoint || !token) return null;

  const key = `contact:rate:${createHash("sha256").update(ip).digest("hex")}`;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        "EVAL",
        contactRateLimitScript,
        1,
        key,
        CONTACT_RATE_WINDOW_SECONDS,
      ]),
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return null;
    const result: { result?: unknown } = await response.json();
    if (typeof result.result !== "number" || !Number.isSafeInteger(result.result)) {
      return null;
    }
    return result.result <= CONTACT_RATE_LIMIT;
  } catch {
    return null;
  }
}

export async function protectContactSubmission(
  token: string,
): Promise<"allowed" | "invalid-captcha" | "rate-limited" | "unavailable"> {
  if (!isContactSubmissionConfigured()) return "unavailable";
  if (!(await verifyTurnstile(token))) return "invalid-captcha";

  const ip = getClientIp(await headers());
  if (!ip) return "unavailable";

  const allowed = await consumeDistributedRateLimit(ip);
  if (allowed === null) return "unavailable";
  return allowed ? "allowed" : "rate-limited";
}

export async function insertPublicContactMessage(message: {
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
}): Promise<{ success: true } | { success: false; code?: string }> {
  const config = getSupabaseConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!isContactSubmissionConfigured() || !config || !serviceRoleKey) {
    return { success: false };
  }

  const supabase = createClient<Database>(config.url.trim(), serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  const { error } = await supabase.from("contact_messages").insert({
    ...message,
    status: "NUEVO",
  });
  if (error) return { success: false, code: error.code };
  return { success: true };
}
