"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import type { PublicHeroCarousel, PublicHeroSlide } from "@/lib/hero-carousel";

const fallbackSlides: PublicHeroSlide[] = [
  {
    id: "fallback-existing-hero",
    title: "Transformo ideas en soluciones digitales.",
    description:
      "Desarrollo soluciones tecnológicas modernas para personas, emprendimientos, empresas e instituciones que buscan mejorar sus procesos mediante la tecnología.",
    media_type: "image",
    alt_text: "",
    cta_text: "Solicitar un servicio",
    cta_url: "/#contacto",
    sort_order: 0,
    media_url: "",
    poster_url: null,
  },
];

const fallbackSettings = {
  autoplay_enabled: true,
  autoplay_interval_ms: 3000,
  show_arrows: true,
  show_indicators: true,
};

type NetworkInformation = EventTarget & { saveData?: boolean };

function subscribeToMotionPreference(onChange: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getMotionPreference() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function subscribeToVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

function getDocumentVisibility() {
  return document.visibilityState === "visible";
}

function getNetworkInformation() {
  return (navigator as Navigator & { connection?: NetworkInformation })
    .connection;
}

function subscribeToSaveData(onChange: () => void) {
  const connection = getNetworkInformation();
  connection?.addEventListener("change", onChange);
  return () => connection?.removeEventListener("change", onChange);
}

function getSaveDataPreference() {
  return getNetworkInformation()?.saveData === true;
}

function ArrowIcon({ direction }: { direction: "previous" | "next" }) {
  return (
    <svg
      className={`h-5 w-5 ${direction === "previous" ? "rotate-180" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 12h14m-6-6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SlideArtwork({ title }: { title: string }) {
  return (
    <div
      className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_72%_25%,rgba(34,211,238,0.22),transparent_36%),linear-gradient(145deg,#0f172a,#020617)] p-8 shadow-2xl shadow-cyan-950/30 sm:p-12"
      aria-hidden="true"
    >
      <div className="relative flex h-full w-full items-center justify-center rounded-[1.5rem] border border-white/[0.06]">
        <div className="absolute h-[72%] w-[72%] rounded-full border border-cyan-300/20" />
        <div className="absolute h-[52%] w-[52%] rounded-full border border-dashed border-cyan-300/20" />
        <div className="relative flex h-28 w-28 items-center justify-center rounded-3xl border border-cyan-300/40 bg-cyan-400/10 shadow-[0_0_90px_rgba(34,211,238,0.15)] sm:h-36 sm:w-36">
          <svg
            className="h-14 w-14 text-cyan-200 sm:h-20 sm:w-20"
            viewBox="0 0 64 64"
            fill="none"
          >
            <path
              d="M16 18h32a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4V22a4 4 0 0 1 4-4Z"
              stroke="currentColor"
              strokeWidth="2.5"
            />
            <path d="M12 27h40" stroke="currentColor" strokeWidth="2" />
            <circle cx="19" cy="22.5" r="1.5" fill="currentColor" />
            <circle cx="25" cy="22.5" r="1.5" fill="currentColor" />
            <path
              d="m26 35-5 5 5 5m12-10 5 5-5 5m-3-12-4 14"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className="absolute bottom-4 rounded-full border border-white/10 bg-slate-950/80 px-4 py-2 text-xs font-medium text-cyan-100 backdrop-blur">
          {title}
        </p>
      </div>
    </div>
  );
}

function SlideMedia({
  slide,
  canAutoplay,
  onPlaybackPaused,
  onMediaError,
}: {
  slide: PublicHeroSlide;
  canAutoplay: boolean;
  onPlaybackPaused: () => void;
  onMediaError: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const carouselPausedVideo = useRef(false);
  const [videoReady, setVideoReady] = useState(false);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!canAutoplay) {
      if (!video.paused) {
        carouselPausedVideo.current = true;
        video.pause();
      }
      return;
    }
    void video.play().catch(onPlaybackPaused);
  }, [canAutoplay, onPlaybackPaused]);

  if (!slide.media_url) return <SlideArtwork title={slide.title} />;
  if (slide.media_type === "image") {
    return (
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900 shadow-2xl shadow-cyan-950/30">
        <Image
          src={slide.media_url}
          alt={slide.alt_text ?? ""}
          fill
          unoptimized
          fetchPriority="high"
          sizes="(max-width: 1024px) 100vw, 48vw"
          onError={onMediaError}
          className="object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent" />
      </div>
    );
  }

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900 shadow-2xl shadow-cyan-950/30">
      {!videoReady && slide.poster_url ? (
        <Image
          src={slide.poster_url}
          alt=""
          fill
          unoptimized
          aria-hidden="true"
          className="object-cover"
        />
      ) : null}
      {!videoReady && !slide.poster_url ? (
        <div className="absolute inset-0">
          <SlideArtwork title={slide.title} />
        </div>
      ) : null}
      <video
        ref={videoRef}
        key={slide.id}
        controls
        autoPlay={canAutoplay}
        muted
        loop
        playsInline
        preload="metadata"
        poster={slide.poster_url ?? undefined}
        onCanPlay={() => setVideoReady(true)}
        onPause={() => {
          if (carouselPausedVideo.current) {
            carouselPausedVideo.current = false;
          } else if (canAutoplay) {
            onPlaybackPaused();
          }
        }}
        onError={onMediaError}
        className={`relative h-full w-full object-cover transition-opacity motion-reduce:transition-none ${
          videoReady ? "opacity-100" : "opacity-0"
        }`}
      >
        <source
          src={slide.media_url}
          type={
            slide.media_url.toLowerCase().endsWith(".webm")
              ? "video/webm"
              : "video/mp4"
          }
        />
        Tu navegador no puede reproducir este video.
      </video>
    </div>
  );
}

export default function Hero({
  carousel,
}: {
  carousel?: PublicHeroCarousel | null;
}) {
  const hasPublishedSlides =
    carousel?.status === "ready" && carousel.slides.length > 0;
  const slides = hasPublishedSlides ? carousel.slides : fallbackSlides;
  const settings = carousel?.settings ?? fallbackSettings;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [pointerInside, setPointerInside] = useState(false);
  const [focusInside, setFocusInside] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribeToMotionPreference,
    getMotionPreference,
    () => false,
  );
  const documentVisible = useSyncExternalStore(
    subscribeToVisibility,
    getDocumentVisibility,
    () => true,
  );
  const saveData = useSyncExternalStore(
    subscribeToSaveData,
    getSaveDataPreference,
    () => false,
  );
  const [failedMediaId, setFailedMediaId] = useState<string | null>(null);
  const activeIndex = selectedIndex % slides.length;
  const activeSlide = slides[activeIndex];

  const canAutoplay =
    settings.autoplay_enabled &&
    slides.length > 1 &&
    !userPaused &&
    !pointerInside &&
    !focusInside &&
    !reducedMotion &&
    documentVisible;

  useEffect(() => {
    if (!canAutoplay) return;
    const intervalId = window.setInterval(() => {
      setSelectedIndex(
        (index) => ((index % slides.length) + 1) % slides.length,
      );
    }, Math.max(3000, settings.autoplay_interval_ms));
    return () => window.clearInterval(intervalId);
  }, [canAutoplay, settings.autoplay_interval_ms, slides.length]);

  function showSlide(index: number) {
    setSelectedIndex((index + slides.length) % slides.length);
    setUserPaused(true);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (
      event.target instanceof HTMLElement &&
      event.target.closest(
        "a, button, input, select, textarea, video, [contenteditable='true']",
      )
    ) {
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showSlide(activeIndex - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      showSlide(activeIndex + 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      showSlide(0);
    } else if (event.key === "End") {
      event.preventDefault();
      showSlide(slides.length - 1);
    }
  }

  const mediaFailed = failedMediaId === activeSlide.id;

  return (
    <section
      id="inicio"
      aria-label="Presentación de soluciones tecnológicas"
      aria-roledescription="carrusel"
      className="relative isolate overflow-hidden bg-slate-950"
      onPointerEnter={() => setPointerInside(true)}
      onPointerLeave={() => setPointerInside(false)}
      onFocusCapture={() => setFocusInside(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocusInside(false);
        }
      }}
      onKeyDown={handleKeyDown}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_18%,rgba(6,182,212,0.16),transparent_32%),radial-gradient(circle_at_12%_88%,rgba(37,99,235,0.12),transparent_35%)]" />
      <div className="pointer-events-none absolute -right-40 top-1/4 h-96 w-96 rounded-full border border-cyan-400/10" />
      <div className="pointer-events-none absolute -right-24 top-[30%] h-64 w-64 rounded-full border border-cyan-400/[0.07]" />

      <div className="relative mx-auto flex min-h-[calc(100svh-5rem)] w-full max-w-7xl flex-col justify-center px-6 pb-14 pt-28 sm:px-8 lg:px-10 lg:pb-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:gap-12">
          <div className="order-2 min-w-0 lg:order-1">
            <p className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300 sm:text-sm">
              <span className="h-px w-8 bg-cyan-400" />
              Soluciones tecnológicas
            </p>
            {!hasPublishedSlides && carousel?.status !== "unconfigured" ? (
              <p className="mb-3 text-xs text-slate-500" role="status">
                Mostrando la presentación principal.
              </p>
            ) : null}
            <div className="relative min-h-[15rem] sm:min-h-[14rem] lg:min-h-[17rem]">
              {slides.map((slide, index) => (
                <article
                  key={slide.id}
                  aria-hidden={index !== activeIndex}
                  aria-roledescription="diapositiva"
                  aria-label={`${index + 1} de ${slides.length}: ${slide.title}`}
                  inert={index !== activeIndex}
                  className={`absolute inset-0 transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none ${
                    index === activeIndex
                      ? "translate-y-0 opacity-100"
                      : "pointer-events-none translate-y-3 opacity-0"
                  }`}
                >
                  <h1 className="max-w-2xl text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl">
                    {slide.title}
                  </h1>
                  <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
                    {slide.description}
                  </p>
                </article>
              ))}
            </div>
            {activeSlide.cta_text && activeSlide.cta_url ? (
              <div className="mt-7 flex flex-wrap gap-3">
                {activeSlide.cta_url.startsWith("/") ? (
                  <Link
                    href={activeSlide.cta_url}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-cyan-400 px-6 py-3 text-center font-semibold text-slate-950 transition hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 motion-reduce:transition-none"
                  >
                    {activeSlide.cta_text}
                    <span aria-hidden="true">→</span>
                  </Link>
                ) : (
                  <a
                    href={activeSlide.cta_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-cyan-400 px-6 py-3 text-center font-semibold text-slate-950 transition hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 motion-reduce:transition-none"
                  >
                    {activeSlide.cta_text}
                    <span aria-hidden="true">↗</span>
                  </a>
                )}
                {!hasPublishedSlides ? (
                  <Link
                    href="/#proyectos"
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 px-6 py-3 text-center font-semibold text-white transition hover:border-cyan-300 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 motion-reduce:transition-none"
                  >
                    Ver proyectos
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="order-1 min-w-0 lg:order-2">
            {mediaFailed || (saveData && activeSlide.media_type === "video") ? (
              <SlideArtwork title={activeSlide.title} />
            ) : (
              <SlideMedia
                key={activeSlide.id}
                slide={activeSlide}
                canAutoplay={canAutoplay && !saveData}
                onPlaybackPaused={() => setUserPaused(true)}
                onMediaError={() => setFailedMediaId(activeSlide.id)}
              />
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 sm:mt-10">
          <div className="flex items-center gap-3">
            {settings.show_arrows && slides.length > 1 ? (
              <>
                <button
                  type="button"
                  aria-label="Diapositiva anterior"
                  onClick={() => showSlide(activeIndex - 1)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-white transition hover:border-cyan-300/60 hover:bg-cyan-300/10 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 motion-reduce:transition-none"
                >
                  <ArrowIcon direction="previous" />
                </button>
                <button
                  type="button"
                  aria-label="Diapositiva siguiente"
                  onClick={() => showSlide(activeIndex + 1)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-white transition hover:border-cyan-300/60 hover:bg-cyan-300/10 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 motion-reduce:transition-none"
                >
                  <ArrowIcon direction="next" />
                </button>
              </>
            ) : null}
            {settings.show_indicators && slides.length > 1 ? (
              <div
                className="ml-1 flex items-center gap-2"
                role="group"
                aria-label="Elegir diapositiva"
              >
                {slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    aria-label={`Mostrar diapositiva ${index + 1}: ${slide.title}`}
                    aria-current={index === activeIndex ? "true" : undefined}
                    onClick={() => showSlide(index)}
                    className={`h-2.5 rounded-full transition-[width,background-color] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 motion-reduce:transition-none ${
                      index === activeIndex
                        ? "w-8 bg-cyan-300"
                        : "w-2.5 bg-white/30 hover:bg-white/60"
                    }`}
                  />
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
              {slides.length > 1 ? (
                <span
                  className="text-sm font-medium tabular-nums text-slate-300"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <span className="text-white">
                    {String(activeIndex + 1).padStart(2, "0")}
                  </span>
                  <span className="px-1.5 text-slate-500">/</span>
                  {String(slides.length).padStart(2, "0")}
                </span>
              ) : null}
            {settings.autoplay_enabled && slides.length > 1 ? (
              <button
                type="button"
                aria-label={userPaused ? "Reanudar reproducción" : "Pausar reproducción"}
                aria-pressed={userPaused}
                onClick={() => setUserPaused((paused) => !paused)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-slate-300 transition hover:border-cyan-300/60 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 motion-reduce:transition-none"
              >
                {userPaused ? (
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M5 3.5a.75.75 0 0 1 1.14-.64l6 3.75a1.63 1.63 0 0 1 0 2.78l-6 3.75A.75.75 0 0 1 5 12.5v-9Z" />
                  </svg>
                ) : (
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M4 3.5A1.5 1.5 0 0 1 5.5 2h1A1.5 1.5 0 0 1 8 3.5v9A1.5 1.5 0 0 1 6.5 14h-1A1.5 1.5 0 0 1 4 12.5v-9Zm4 0A1.5 1.5 0 0 1 9.5 2h1A1.5 1.5 0 0 1 12 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-1A1.5 1.5 0 0 1 8 12.5v-9Z" />
                  </svg>
                )}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
