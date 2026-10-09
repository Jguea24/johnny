import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/types/database";

export const publicSiteSettingKeys = [
  "site.title",
  "site.description",
  "contact.email",
  "contact.phone",
  "contact.location",
  "social.github",
  "social.linkedin",
  "social.instagram",
  "social.facebook",
] as const;

export type PublicSiteSettings = {
  title: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  contactLocation: string;
  social: {
    github: string | null;
    linkedin: string | null;
    instagram: string | null;
    facebook: string | null;
  };
};

const defaults: PublicSiteSettings = {
  title: "Johnny",
  description:
    "Portafolio profesional de Johnny. Desarrollo web, soluciones tecnológicas, seguridad TI, soporte técnico y capacitación.",
  contactEmail: "",
  contactPhone: "",
  contactLocation: "",
  social: {
    github: null,
    linkedin: null,
    instagram: null,
    facebook: null,
  },
};

function textSetting(
  values: Map<string, unknown>,
  key: string,
  fallback: string,
  maxLength: number,
): string {
  const value = values.get(key);
  if (typeof value !== "string") return fallback;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maxLength
    ? normalized
    : fallback;
}

function urlSetting(
  values: Map<string, unknown>,
  key: string,
): string | null {
  const value = values.get(key);
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

async function loadPublicSiteSettings(
  url: string,
  publishableKey: string,
): Promise<PublicSiteSettings> {
  "use cache";
  cacheLife("hours");
  cacheTag("public-site-settings");

  const supabase = createClient<Database>(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  const { data, error } = await supabase
    .from("site_settings")
    .select("key,value")
    .in("key", [...publicSiteSettingKeys]);
  if (error) {
    console.error(
      `Unable to load public site settings. Supabase code: ${error.code}`,
    );
    return defaults;
  }

  const values = new Map<string, unknown>(
    (data ?? []).map((row) => [row.key, row.value]),
  );
  const email = textSetting(values, "contact.email", "", 254);
  return {
    title: textSetting(values, "site.title", defaults.title, 80),
    description: textSetting(
      values,
      "site.description",
      defaults.description,
      300,
    ),
    contactEmail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "",
    contactPhone: textSetting(values, "contact.phone", "", 40),
    contactLocation: textSetting(values, "contact.location", "", 120),
    social: {
      github: urlSetting(values, "social.github"),
      linkedin: urlSetting(values, "social.linkedin"),
      instagram: urlSetting(values, "social.instagram"),
      facebook: urlSetting(values, "social.facebook"),
    },
  };
}

export async function getPublicSiteSettings(): Promise<PublicSiteSettings> {
  const config = getSupabaseConfig();
  if (!config) return defaults;
  return loadPublicSiteSettings(config.url, config.publishableKey);
}
