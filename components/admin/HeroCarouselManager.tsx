"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useState } from "react";
import {
  deleteHeroSlideAction,
  reorderHeroSlideAction,
  saveHeroCarouselSettingsAction,
  saveHeroSlideAction,
  type HeroActionState,
} from "@/lib/admin/hero-actions";
import type { HeroCarouselSettings } from "@/lib/hero-carousel";
import type { Database, HeroMediaType } from "@/types/database";

type SlideRow = Database["public"]["Tables"]["hero_slides"]["Row"];
export type AdminHeroSlide = SlideRow & {
  media_url: string;
  poster_url: string | null;
};

type SlideDraft = {
  title: string;
  description: string;
  media_type: HeroMediaType;
  alt_text: string;
  cta_text: string;
  cta_url: string;
  sort_order: string;
  is_active: boolean;
};

const blankDraft: SlideDraft = {
  title: "",
  description: "",
  media_type: "image",
  alt_text: "",
  cta_text: "",
  cta_url: "",
  sort_order: "0",
  is_active: false,
};

const fieldClass =
  "min-h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-cyan-400";
const labelClass = "mb-1.5 block text-xs font-medium text-slate-300";
const buttonClass =
  "inline-flex min-h-10 items-center justify-center rounded-lg border border-white/15 px-3 text-sm font-medium text-slate-200 transition hover:border-cyan-300/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-50";

function ResultMessage({ state }: { state: HeroActionState }) {
  if (!state.error && !state.success && !state.warning) return null;
  return (
    <div
      className={`space-y-1 rounded-lg border px-3 py-2 text-sm ${
        state.error
          ? "border-rose-400/30 bg-rose-400/10 text-rose-200"
          : state.warning
            ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
            : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
      }`}
      role={state.error ? "alert" : "status"}
      aria-live="polite"
    >
      {state.error ?? state.warning ?? state.success}
    </div>
  );
}

function SlideMediaPreview({
  mediaType,
  mediaPreviewUrl,
  mediaUrl,
  posterPreviewUrl,
  posterUrl,
  alt,
}: {
  mediaType: HeroMediaType;
  mediaPreviewUrl: string | null;
  mediaUrl: string;
  posterPreviewUrl: string | null;
  posterUrl: string | null;
  alt: string;
}) {
  const src = mediaPreviewUrl ?? mediaUrl;
  const poster = posterPreviewUrl ?? posterUrl;

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-white/10 bg-slate-950">
      {mediaType === "image" && src ? (
        <Image
          src={src}
          alt={alt || "Vista previa de la imagen"}
          fill
          unoptimized
          sizes="(max-width: 768px) 100vw, 40vw"
          className="object-cover"
        />
      ) : mediaType === "video" && src ? (
        <video
          key={src}
          controls
          playsInline
          muted
          preload="metadata"
          poster={poster ?? undefined}
          className="h-full w-full object-contain"
        >
          <source src={src} />
          Tu navegador no puede reproducir este video.
        </video>
      ) : (
        <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_70%_25%,rgba(34,211,238,0.2),transparent_40%),linear-gradient(145deg,#0f172a,#020617)] p-6 text-center text-sm text-slate-400">
          La vista previa del recurso aparecerá aquí.
        </div>
      )}
    </div>
  );
}

function SlideEditor({
  slide,
  onSaved,
}: {
  slide?: AdminHeroSlide;
  onSaved: (created: boolean) => void;
}) {
  const [state, action, pending] = useActionState<HeroActionState, FormData>(
    saveHeroSlideAction,
    {},
  );
  const [draft, setDraft] = useState<SlideDraft>(
    slide
      ? {
          title: slide.title,
          description: slide.description,
          media_type: slide.media_type,
          alt_text: slide.alt_text ?? "",
          cta_text: slide.cta_text ?? "",
          cta_url: slide.cta_url ?? "",
          sort_order: String(slide.sort_order),
          is_active: slide.is_active,
        }
      : blankDraft,
  );
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [posterPreviewUrl, setPosterPreviewUrl] = useState<string | null>(null);
  const [clearPoster, setClearPoster] = useState(false);

  useEffect(() => {
    if (state.success) {
      onSaved(!slide);
    }
  }, [onSaved, slide, state]);

  useEffect(
    () => () => {
      if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
      if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl);
    },
    [mediaPreviewUrl, posterPreviewUrl],
  );

  function updateDraft<Key extends keyof SlideDraft>(
    key: Key,
    value: SlideDraft[Key],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function selectMediaFile(file: File | null) {
    setMediaFile(file);
    setMediaPreviewUrl(file ? URL.createObjectURL(file) : null);
  }

  function selectPosterFile(file: File | null) {
    setPosterFile(file);
    setPosterPreviewUrl(file ? URL.createObjectURL(file) : null);
  }

  return (
    <form
      action={action}
      className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)]"
    >
      <input
        type="hidden"
        name="operation"
        value={slide ? "update" : "create"}
      />
      {slide ? (
        <input type="hidden" name="slide_id" value={slide.id} />
      ) : null}
      <div className="grid content-start gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor={`slide-title-${slide?.id ?? "new"}`}>
            Título
          </label>
          <input
            id={`slide-title-${slide?.id ?? "new"}`}
            name="title"
            required
            minLength={2}
            maxLength={120}
            value={draft.title}
            onChange={(event) => updateDraft("title", event.target.value)}
            className={fieldClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label
            className={labelClass}
            htmlFor={`slide-description-${slide?.id ?? "new"}`}
          >
            Descripción
          </label>
          <textarea
            id={`slide-description-${slide?.id ?? "new"}`}
            name="description"
            required
            minLength={2}
            maxLength={1000}
            rows={4}
            value={draft.description}
            onChange={(event) => updateDraft("description", event.target.value)}
            className={`${fieldClass} resize-y py-2`}
          />
        </div>
        <div>
          <label
            className={labelClass}
            htmlFor={`slide-type-${slide?.id ?? "new"}`}
          >
            Tipo de medio
          </label>
          <select
            id={`slide-type-${slide?.id ?? "new"}`}
            name="media_type"
            value={draft.media_type}
            onChange={(event) => {
              const nextType = event.target.value as HeroMediaType;
              updateDraft("media_type", nextType);
              setMediaFile(null);
              setPosterFile(null);
              setMediaPreviewUrl(null);
              setPosterPreviewUrl(null);
              setClearPoster(nextType === "image");
            }}
            className={fieldClass}
          >
            <option value="image">Imagen</option>
            <option value="video">Video</option>
          </select>
        </div>
        <div>
          <label
            className={labelClass}
            htmlFor={`slide-media-${slide?.id ?? "new"}`}
          >
            Archivo multimedia {slide ? "(opcional)" : ""}
          </label>
          <input
            key={draft.media_type}
            id={`slide-media-${slide?.id ?? "new"}`}
            name="media_file"
            type="file"
            required={!slide}
            accept={
              draft.media_type === "image"
                ? "image/jpeg,image/png,image/webp,image/avif"
                : "video/mp4,video/webm"
            }
            onChange={(event) =>
              selectMediaFile(event.currentTarget.files?.[0] ?? null)
            }
            className="block min-h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-2 text-xs text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-cyan-400 file:px-3 file:py-2 file:font-semibold file:text-slate-950"
          />
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Imagen hasta 8 MB; video hasta 30 MB. JPEG, PNG, WebP, AVIF, MP4 o
            WebM.
          </p>
        </div>
        {draft.media_type === "image" ? (
          <div className="sm:col-span-2">
            <label
              className={labelClass}
              htmlFor={`slide-alt-${slide?.id ?? "new"}`}
            >
              Texto alternativo
            </label>
            <input
              id={`slide-alt-${slide?.id ?? "new"}`}
              name="alt_text"
              required
              minLength={2}
              maxLength={300}
              value={draft.alt_text}
              onChange={(event) => updateDraft("alt_text", event.target.value)}
              className={fieldClass}
            />
          </div>
        ) : (
          <input type="hidden" name="alt_text" value="" />
        )}
        {draft.media_type === "video" ? (
          <div className="space-y-3 sm:col-span-2">
            <div>
              <label
                className={labelClass}
                htmlFor={`slide-poster-${slide?.id ?? "new"}`}
              >
                Portada del video (opcional)
              </label>
              <input
                    key="video-poster"
                    id={`slide-poster-${slide?.id ?? "new"}`}
                    name="poster_file"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={(event) =>
                  selectPosterFile(event.currentTarget.files?.[0] ?? null)
                }
                className="block min-h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-2 text-xs text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-cyan-400 file:px-3 file:py-2 file:font-semibold file:text-slate-950"
              />
            </div>
            {slide?.poster_path ? (
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  name="clear_poster"
                  checked={clearPoster}
                  onChange={(event) => setClearPoster(event.target.checked)}
                  className="h-4 w-4 accent-cyan-400"
                />
                Eliminar la portada actual
              </label>
            ) : null}
          </div>
        ) : null}
        <div>
          <label
            className={labelClass}
            htmlFor={`slide-cta-text-${slide?.id ?? "new"}`}
          >
            Texto del botón
          </label>
          <input
            id={`slide-cta-text-${slide?.id ?? "new"}`}
            name="cta_text"
            maxLength={60}
            value={draft.cta_text}
            onChange={(event) => updateDraft("cta_text", event.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label
            className={labelClass}
            htmlFor={`slide-cta-url-${slide?.id ?? "new"}`}
          >
            Destino del botón
          </label>
          <input
            id={`slide-cta-url-${slide?.id ?? "new"}`}
            name="cta_url"
            type="text"
            maxLength={2048}
            placeholder="/contacto o https://…"
            value={draft.cta_url}
            onChange={(event) => updateDraft("cta_url", event.target.value)}
            className={fieldClass}
          />
          <p className="mt-1 text-xs text-slate-500">
            Se permiten rutas internas y URLs HTTPS.
          </p>
        </div>
        <div>
          <label
            className={labelClass}
            htmlFor={`slide-order-${slide?.id ?? "new"}`}
          >
            Orden
          </label>
          <input
            id={`slide-order-${slide?.id ?? "new"}`}
            name="sort_order"
            type="number"
            min={0}
            max={100000}
            step={1}
            required
            value={draft.sort_order}
            onChange={(event) => updateDraft("sort_order", event.target.value)}
            className={fieldClass}
          />
        </div>
        <label className="flex min-h-11 items-center gap-3 text-sm text-slate-200">
          <input
            type="checkbox"
            name="is_active"
            checked={draft.is_active}
            onChange={(event) => updateDraft("is_active", event.target.checked)}
            className="h-4 w-4 accent-cyan-400"
          />
          Publicar esta diapositiva
        </label>
      </div>
      <div className="space-y-3">
        <p className={labelClass}>Vista previa</p>
        <SlideMediaPreview
          mediaType={draft.media_type}
          mediaPreviewUrl={mediaPreviewUrl}
          mediaUrl={
            slide?.media_type === draft.media_type ? slide.media_url : ""
          }
          posterPreviewUrl={posterPreviewUrl}
          posterUrl={slide?.poster_url ?? null}
          alt={draft.alt_text}
        />
        <div className="rounded-xl border border-white/10 bg-slate-950/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
            {draft.is_active ? "Publicado" : "Borrador"}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-white">
            {draft.title || "Título de la diapositiva"}
          </h3>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-300">
            {draft.description || "La descripción aparecerá aquí."}
          </p>
          {draft.cta_text ? (
            <span className="mt-4 inline-flex min-h-10 items-center rounded-full bg-cyan-400 px-4 text-sm font-semibold text-slate-950">
              {draft.cta_text}
            </span>
          ) : null}
        </div>
      </div>
      <div className="space-y-3 xl:col-span-2">
        <ResultMessage state={state} />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-cyan-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 disabled:opacity-60"
        >
          {pending
            ? "Guardando…"
            : slide
              ? "Guardar cambios"
              : "Crear diapositiva"}
        </button>
      </div>
    </form>
  );
}

function SlideActions({
  slide,
  onChanged,
}: {
  slide: AdminHeroSlide;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [deleteState, deleteAction, deletePending] = useActionState<
    HeroActionState,
    FormData
  >(deleteHeroSlideAction, {});
  const [orderState, orderAction, orderPending] = useActionState<
    HeroActionState,
    FormData
  >(reorderHeroSlideAction, {});

  useEffect(() => {
    if (deleteState.success || orderState.success) {
      onChanged();
      router.refresh();
    }
  }, [deleteState, onChanged, orderState, router]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(["up", "down"] as const).map((direction) => (
          <form key={direction} action={orderAction}>
            <input type="hidden" name="slide_id" value={slide.id} />
            <input type="hidden" name="direction" value={direction} />
            <button
              type="submit"
              disabled={orderPending}
              aria-label={`${direction === "up" ? "Subir" : "Bajar"} ${slide.title}`}
              className={buttonClass}
            >
              {direction === "up" ? "↑ Subir" : "↓ Bajar"}
            </button>
          </form>
        ))}
        <form
          action={deleteAction}
          onSubmit={(event) => {
            if (
              !window.confirm(
                `¿Eliminar “${slide.title}” y sus archivos multimedia? Esta acción no se puede deshacer.`,
              )
            ) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="slide_id" value={slide.id} />
          <button
            type="submit"
            disabled={deletePending}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-rose-400/30 px-3 text-sm font-medium text-rose-200 transition hover:bg-rose-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:opacity-50"
          >
            {deletePending ? "Eliminando…" : "Eliminar"}
          </button>
        </form>
      </div>
      <ResultMessage
        state={
          orderState.error || orderState.success ? orderState : deleteState
        }
      />
    </div>
  );
}

function CarouselSettingsForm({
  settings,
  onSaved,
}: {
  settings: HeroCarouselSettings;
  onSaved: () => void;
}) {
  const [state, action, pending] = useActionState<HeroActionState, FormData>(
    saveHeroCarouselSettingsAction,
    {},
  );
  useEffect(() => {
    if (state.success) onSaved();
  }, [onSaved, state]);

  return (
    <form
      action={action}
      className="grid gap-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:grid-cols-2 sm:p-6"
    >
      <div className="sm:col-span-2">
        <h2 className="text-lg font-semibold text-white">
          Configuración global
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          La duración mínima del intervalo es de 3.000 ms.
        </p>
      </div>
      <div>
        <label className={labelClass} htmlFor="carousel-interval">
          Intervalo (ms)
        </label>
        <input
          id="carousel-interval"
          name="autoplay_interval_ms"
          type="number"
          min={3000}
          max={60000}
          step={500}
          required
          defaultValue={settings.autoplay_interval_ms}
          className={fieldClass}
        />
      </div>
      <div className="space-y-3">
        <label className="flex min-h-8 items-center gap-3 text-sm text-slate-200">
          <input
            type="checkbox"
            name="autoplay_enabled"
            defaultChecked={settings.autoplay_enabled}
            className="h-4 w-4 accent-cyan-400"
          />
          Activar reproducción automática
        </label>
        <label className="flex min-h-8 items-center gap-3 text-sm text-slate-200">
          <input
            type="checkbox"
            name="show_arrows"
            defaultChecked={settings.show_arrows}
            className="h-4 w-4 accent-cyan-400"
          />
          Mostrar flechas
        </label>
        <label className="flex min-h-8 items-center gap-3 text-sm text-slate-200">
          <input
            type="checkbox"
            name="show_indicators"
            defaultChecked={settings.show_indicators}
            className="h-4 w-4 accent-cyan-400"
          />
          Mostrar indicadores
        </label>
      </div>
      <div className="space-y-3 sm:col-span-2">
        <ResultMessage state={state} />
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Guardando…" : "Guardar configuración"}
        </button>
      </div>
    </form>
  );
}

export default function HeroCarouselManager({
  slides,
  settings,
}: {
  slides: AdminHeroSlide[];
  settings: HeroCarouselSettings;
}) {
  const router = useRouter();
  const [createFormVersion, setCreateFormVersion] = useState(0);
  const refresh = useCallback(
    (created = false) => {
      if (created) setCreateFormVersion((version) => version + 1);
      router.refresh();
    },
    [router],
  );
  return (
    <div className="space-y-9">
      <CarouselSettingsForm
        key={JSON.stringify(settings)}
        settings={settings}
        onSaved={refresh}
      />
      <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.04] p-5 sm:p-6">
        <h2 className="text-xl font-semibold text-white">
          Crear diapositiva
        </h2>
        <p className="mb-5 mt-1 text-sm text-slate-400">
          Las imágenes admitidas son JPEG, PNG, WebP y AVIF; los videos, MP4 y
          WebM. El servidor valida el MIME, la extensión y la firma del archivo.
        </p>
        <SlideEditor
          key={`new-slide-${createFormVersion}`}
          onSaved={refresh}
        />
      </section>

      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Diapositivas existentes
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {slides.length} diapositiva(s), ordenadas como se mostrarán.
            </p>
          </div>
        </div>
        {slides.length === 0 ? (
          <p
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-slate-400"
            role="status"
          >
            Aún no hay diapositivas. Crea una para reemplazar el Hero
            institucional de respaldo.
          </p>
        ) : (
          <div className="space-y-5">
            {slides.map((slide) => (
              <article
                key={`${slide.id}-${slide.updated_at}`}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
              >
                <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-slate-950">
                      {slide.media_type === "image" ? (
                        <Image
                          src={slide.media_url}
                          alt={slide.alt_text ?? ""}
                          fill
                          unoptimized
                          sizes="112px"
                          className="object-cover"
                        />
                      ) : slide.poster_url ? (
                        <Image
                          src={slide.poster_url}
                          alt=""
                          fill
                          unoptimized
                          sizes="112px"
                          className="object-cover"
                        />
                      ) : (
                        <div
                          className="flex h-full items-center justify-center text-xs font-semibold text-cyan-200"
                          aria-hidden="true"
                        >
                          VIDEO
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-white">
                          {slide.title}
                        </h3>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            slide.is_active
                              ? "bg-emerald-400/10 text-emerald-200"
                              : "bg-slate-400/10 text-slate-300"
                          }`}
                        >
                          {slide.is_active ? "Publicado" : "Borrador"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-400">
                        {slide.media_type === "image" ? "Imagen" : "Video"} ·
                        {" "}Orden {slide.sort_order}
                      </p>
                    </div>
                  </div>
                  <SlideActions slide={slide} onChanged={refresh} />
                </header>
                <details>
                  <summary className="cursor-pointer border-t border-white/10 pt-4 text-sm font-medium text-cyan-300 outline-none hover:text-cyan-200 focus-visible:ring-2 focus-visible:ring-cyan-300">
                    Editar diapositiva
                  </summary>
                  <div className="mt-5">
                    <SlideEditor
                      key={`${slide.id}-${slide.updated_at}`}
                      slide={slide}
                      onSaved={refresh}
                    />
                  </div>
                </details>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
