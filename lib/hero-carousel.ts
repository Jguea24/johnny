import "server-only";

import { io } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/types/database";

type SlideRow = Database["public"]["Tables"]["hero_slides"]["Row"];
type SettingsRow =
  Database["public"]["Tables"]["hero_carousel_settings"]["Row"];

export type PublicHeroSlide = Pick<
  SlideRow,
  | "id"
  | "title"
  | "description"
  | "media_type"
  | "alt_text"
  | "cta_text"
  | "cta_url"
  | "sort_order"
> & {
  media_url: string;
  poster_url: string | null;
};

export type HeroCarouselSettings = Pick<
  SettingsRow,
  | "autoplay_enabled"
  | "autoplay_interval_ms"
  | "show_arrows"
  | "show_indicators"
>;

export type PublicHeroCarousel = {
  status: "ready" | "empty" | "error" | "unconfigured";
  slides: PublicHeroSlide[];
  settings: HeroCarouselSettings;
};

export const defaultHeroCarouselSettings: HeroCarouselSettings = {
  autoplay_enabled: true,
  autoplay_interval_ms: 3000,
  show_arrows: true,
  show_indicators: true,
};

function safeCallToAction(url: string | null): string | null {
  if (!url) return null;
  if (
    url.startsWith("/") &&
    !url.startsWith("//") &&
    !url.includes("\\") &&
    !/[\u0000-\u001f\u007f]/.test(url)
  ) {
    try {
      const parsed = new URL(url, "https://johnny.invalid");
      return parsed.origin === "https://johnny.invalid"
        ? `${parsed.pathname}${parsed.search}${parsed.hash}`
        : null;
    } catch {
      return null;
    }
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export async function getPublicHeroCarousel(): Promise<PublicHeroCarousel> {
  if (!getSupabaseConfig()) {
    return {
      status: "unconfigured",
      slides: [],
      settings: defaultHeroCarouselSettings,
    };
  }

  try {
    await io();
    const supabase = await createClient();
    const [slidesResult, settingsResult] = await Promise.all([
      supabase
        .from("hero_slides")
        .select(
          "id,title,description,media_type,media_path,alt_text,poster_path,cta_text,cta_url,sort_order",
        )
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
        .order("id", { ascending: true }),
      supabase
        .from("hero_carousel_settings")
        .select(
          "autoplay_enabled,autoplay_interval_ms,show_arrows,show_indicators",
        )
        .eq("id", 1)
        .maybeSingle(),
    ]);

    if (slidesResult.error) {
      console.error(
        `Unable to load public hero slides. Supabase code: ${slidesResult.error.code}`,
      );
      return {
        status: "error",
        slides: [],
        settings: defaultHeroCarouselSettings,
      };
    }
    const settings = settingsResult.error
      ? defaultHeroCarouselSettings
      : settingsResult.data
        ? {
            autoplay_enabled: settingsResult.data.autoplay_enabled,
            autoplay_interval_ms: Math.max(
              3000,
              Math.min(60000, settingsResult.data.autoplay_interval_ms),
            ),
            show_arrows: settingsResult.data.show_arrows,
            show_indicators: settingsResult.data.show_indicators,
          }
        : defaultHeroCarouselSettings;

    if (settingsResult.error) {
      console.error(
        `Unable to load hero carousel settings. Supabase code: ${settingsResult.error.code}`,
      );
    }

    const slides = (slidesResult.data ?? []).map((slide) => {
      const ctaUrl = safeCallToAction(slide.cta_url);
      return {
        id: slide.id,
        title: slide.title,
        description: slide.description,
        media_type: slide.media_type,
        alt_text: slide.alt_text,
        cta_text: ctaUrl ? slide.cta_text : null,
        cta_url: ctaUrl,
        sort_order: slide.sort_order,
        media_url: supabase.storage
          .from("site-media")
          .getPublicUrl(slide.media_path).data.publicUrl,
        poster_url: slide.poster_path
          ? supabase.storage
              .from("site-media")
              .getPublicUrl(slide.poster_path).data.publicUrl
          : null,
      };
    });

    return {
      status: slides.length > 0 ? "ready" : "empty",
      slides,
      settings,
    };
  } catch (error) {
    console.error(
      `Unable to connect while loading the public hero carousel. Error type: ${
        error instanceof Error ? error.name : "UnknownError"
      }.`,
    );
    return {
      status: "error",
      slides: [],
      settings: defaultHeroCarouselSettings,
    };
  }
}
