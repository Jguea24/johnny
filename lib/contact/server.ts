import "server-only";

import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { headers } from "next/headers";
import { getConfiguredSiteUrl } from "@/lib/site-url";
import { getGoogleAppsScriptContactUrl } from "@/lib/contact/google-apps-script";

const CONTACT_RATE_LIMIT = 4;
const CONTACT_RATE_WINDOW_SECONDS = 600;
const localContactRateLimits = new Map<string, { count: number; expiresAt: number }>();

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
  "error-codes"?: unknown;
};

export function getContactSubmissionConfigurationIssues(): string[] {
  const issues: string[] = [];
  if (!getGoogleAppsScriptContactUrl()) {
    issues.push("GOOGLE_APPS_SCRIPT_CONTACT_URL (valid Apps Script /exec URL)");
  }

  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  const turnstileSecretKey = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (turnstileSiteKey && turnstileSecretKey && !getConfiguredSiteUrl()) {
    issues.push("NEXT_PUBLIC_SITE_URL (valid URL for Turnstile verification)");
  }

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  if (redisUrl) {
    try {
      const url = new URL(redisUrl);
      if (
        url.protocol !== "https:" ||
        !url.hostname ||
        url.username ||
        url.password ||
        url.search ||
        url.hash
      ) {
        issues.push("UPSTASH_REDIS_REST_URL (must be a valid HTTPS URL)");
      }
    } catch {
      issues.push("UPSTASH_REDIS_REST_URL (must be a valid HTTPS URL)");
    }
  }

  return [...new Set(issues)];
}

export function isContactSubmissionConfigured(): boolean {
  return getGoogleAppsScriptContactUrl() !== null;
}

export function getContactFormAvailability(): {
  enabled: boolean;
  turnstileSiteKey: string;
  configurationIssues: string[];
} {
  const configurationIssues = getContactSubmissionConfigurationIssues();
  const enabled = getGoogleAppsScriptContactUrl() !== null;
  const hasTurnstile = Boolean(
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() &&
    process.env.TURNSTILE_SECRET_KEY?.trim() &&
    getConfiguredSiteUrl(),
  );
  return {
    enabled,
    configurationIssues,
    turnstileSiteKey: hasTurnstile
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

type TurnstileVerification =
  | "verified"
  | "invalid-captcha"
  | "unavailable"
  | "configuration-error";

async function verifyTurnstile(
  token: string,
): Promise<TurnstileVerification> {
  if (!token || token.length > 2048) return "invalid-captcha";
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  const siteUrl = getConfiguredSiteUrl();
  if (!secret || !siteUrl) return "configuration-error";

  try {
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
    if (!response.ok) return "unavailable";
    const result: TurnstileResponse = await response.json();
    if (result.success === true) {
      return result.hostname === siteUrl.hostname
        ? "verified"
        : "invalid-captcha";
    }
    if (Array.isArray(result["error-codes"])) {
      const errorCodes = result["error-codes"].filter(
        (code): code is string => typeof code === "string",
      );
      if (
        errorCodes.includes("invalid-input-secret") ||
        errorCodes.includes("missing-input-secret") ||
        errorCodes.includes("bad-request")
      ) {
        console.error(
          `Turnstile rejected its server configuration. Error codes: ${errorCodes.join(", ")}.`,
        );
        return "configuration-error";
      }
      if (errorCodes.includes("internal-error")) return "unavailable";
    }
    return "invalid-captcha";
  } catch (error) {
    console.error(
      `Turnstile verification connection failed. Error type: ${error instanceof Error ? error.name : "unknown"}.`,
    );
    return "unavailable";
  }
}

type RateLimitResult =
  | { status: "allowed"; allowed: boolean }
  | { status: "unavailable" | "configuration-error" };

async function consumeDistributedRateLimit(
  ip: string,
): Promise<RateLimitResult> {
  const endpoint = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!endpoint || !token) return { status: "configuration-error" };

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
    if (response.status === 401 || response.status === 403) {
      return { status: "configuration-error" };
    }
    if (!response.ok) return { status: "unavailable" };
    const result: { result?: unknown; error?: unknown } =
      await response.json();
    if (result.error) return { status: "configuration-error" };
    if (typeof result.result !== "number" || !Number.isSafeInteger(result.result)) {
      return { status: "unavailable" };
    }
    return {
      status: "allowed",
      allowed: result.result <= CONTACT_RATE_LIMIT,
    };
  } catch (error) {
    console.error(
      `Upstash rate-limit connection failed. Error type: ${error instanceof Error ? error.name : "unknown"}.`,
    );
    return { status: "unavailable" };
  }
}

function consumeLocalRateLimit(ip: string): boolean {
  const now = Date.now();
  const key = createHash("sha256").update(ip).digest("hex");
  let entry = localContactRateLimits.get(key);
  if (!entry || entry.expiresAt <= now) {
    entry = { count: 0, expiresAt: now + CONTACT_RATE_WINDOW_SECONDS * 1000 };
    localContactRateLimits.set(key, entry);
  }
  entry.count += 1;

  if (localContactRateLimits.size > 2048) {
    for (const [storedKey, storedEntry] of localContactRateLimits) {
      if (storedEntry.expiresAt <= now) localContactRateLimits.delete(storedKey);
    }
  }
  return entry.count <= CONTACT_RATE_LIMIT;
}

export async function protectContactSubmission(
  token: string,
): Promise<
  | "allowed"
  | "invalid-captcha"
  | "rate-limited"
  | "unavailable"
  | "configuration-error"
> {
  if (!getGoogleAppsScriptContactUrl()) return "configuration-error";

  const hasTurnstile = Boolean(
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() &&
    process.env.TURNSTILE_SECRET_KEY?.trim() &&
    getConfiguredSiteUrl(),
  );
  if (hasTurnstile) {
    const captcha = await verifyTurnstile(token);
    if (captcha !== "verified") return captcha;
  }

  const ip = getClientIp(await headers()) ?? "unknown-client";

  const endpoint = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (endpoint && redisToken) {
    const limit = await consumeDistributedRateLimit(ip);
    if (limit.status !== "allowed") return limit.status;
    return limit.allowed ? "allowed" : "rate-limited";
  }
  return consumeLocalRateLimit(ip) ? "allowed" : "rate-limited";
}
