import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/identity";
import { defaultHeroCarouselSettings } from "@/lib/hero-carousel";
import HeroCarouselManager, {
  type AdminHeroSlide,
} from "@/components/admin/HeroCarouselManager";

export const metadata: Metadata = {
  title: "Carrusel",
};

export default async function AdminCarouselPage() {
  const { supabase } = await requireAdmin();
  const [slidesResult, settingsResult] = await Promise.all([
    supabase
      .from("hero_slides")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true }),
    supabase
      .from("hero_carousel_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle(),
  ]);

  if (slidesResult.error || settingsResult.error || !settingsResult.data) {
    console.error(
      `Unable to load admin carousel. Supabase code: ${
        slidesResult.error?.code ?? settingsResult.error?.code ?? "NO_SETTINGS"
      }`,
    );
    return (
      <main>
        <header className="mb-8">
          <p className="section-eyebrow">
            Administración
          </p>
          <h1 className="section-title">Carrusel</h1>
        </header>
        <p
          className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-5 text-sm leading-6 text-rose-200"
          role="alert"
        >
          No se pudo cargar el carrusel. Comprueba que la migración local del
          carrusel se haya aplicado en este proyecto de Supabase y que sus
          políticas administrativas estén configuradas.
        </p>
      </main>
    );
  }

  const slides: AdminHeroSlide[] = slidesResult.data.map((slide) => ({
    ...slide,
    media_url: supabase.storage
      .from("site-media")
      .getPublicUrl(slide.media_path).data.publicUrl,
    poster_url: slide.poster_path
      ? supabase.storage
          .from("site-media")
          .getPublicUrl(slide.poster_path).data.publicUrl
      : null,
  }));

  return (
    <main>
      <header className="mb-8">
        <p className="section-eyebrow">
          Administración
        </p>
        <h1 className="section-title">Carrusel</h1>
        <p className="mt-3 max-w-3xl text-slate-400">
          Gestiona el contenido multimedia de portada. Solo las diapositivas
          activas se muestran públicamente.
        </p>
      </header>
      <HeroCarouselManager
        slides={slides}
        settings={settingsResult.data ?? defaultHeroCarouselSettings}
      />
    </main>
  );
}
