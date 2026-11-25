"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

type SplashPhase = "visible" | "exiting" | "hidden";

const SPLASH_SESSION_KEY = "johnny-app-splash-seen";
const MINIMUM_SPLASH_DURATION_MS = 2000;
const RESOURCE_WAIT_LIMIT_MS = 1500;
const EXIT_TRANSITION_MS = 480;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function waitForPageLoad(maximumWait: number): Promise<void> {
  if (document.readyState === "complete") return Promise.resolve();

  return new Promise((resolve) => {
    const finish = () => {
      window.clearTimeout(timeout);
      window.removeEventListener("load", finish);
      resolve();
    };
    const timeout = window.setTimeout(finish, maximumWait);
    window.addEventListener("load", finish, { once: true });
  });
}

function hasSeenSplash(): boolean {
  try {
    return window.sessionStorage.getItem(SPLASH_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberSplash(): void {
  try {
    window.sessionStorage.setItem(SPLASH_SESSION_KEY, "1");
  } catch {
    // The splash still works when browser storage is unavailable.
  }
}

export default function AppSplash({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<SplashPhase>("visible");
  const [contentReady, setContentReady] = useState(false);
  const logoRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (hasSeenSplash()) {
      const frame = window.requestAnimationFrame(() => setPhase("hidden"));
      return () => window.cancelAnimationFrame(frame);
    }

    let cancelled = false;
    let exitTimer: number | undefined;

    const logoReady = logoRef.current
      ? Promise.race([
          logoRef.current.decode().catch(() => undefined),
          wait(RESOURCE_WAIT_LIMIT_MS),
        ])
      : Promise.resolve();
    const fontsReady = document.fonts
      ? Promise.race([
          document.fonts.ready.then(() => undefined).catch(() => undefined),
          wait(1000),
        ])
      : Promise.resolve();

    void Promise.all([
      wait(MINIMUM_SPLASH_DURATION_MS),
      waitForPageLoad(RESOURCE_WAIT_LIMIT_MS),
      logoReady,
      fontsReady,
    ]).then(() => {
      if (cancelled) return;
      rememberSplash();
      setPhase("exiting");
      exitTimer = window.setTimeout(() => {
        setPhase("hidden");
        setContentReady(true);
      }, EXIT_TRANSITION_MS);
    });

    return () => {
      cancelled = true;
      if (exitTimer !== undefined) window.clearTimeout(exitTimer);
    };
  }, []);

  return (
    <>
      <div className={`app-entry-content${contentReady ? " app-entry-content--ready" : ""}`}>
        {children}
      </div>
      {phase !== "hidden" ? (
        <div
          className={`app-splash app-splash--${phase}`}
          role="status"
          aria-live="polite"
          aria-label="Cargando aplicación"
        >
          <div className="app-splash__content">
            <div className="app-splash__logo-wrap" aria-hidden="true">
              <Image
                ref={logoRef}
                src="/icons/johnny-mark.svg"
                alt=""
                width={128}
                height={128}
                preload
                unoptimized
                className="app-splash__logo"
              />
            </div>
            <p className="app-splash__brand">Johnny Grefa</p>
            <p className="app-splash__tagline">Asesoría Tecnológica</p>
            <p className="app-splash__loading">
              Preparando tu experiencia
              <span className="app-splash__dots" aria-hidden="true">
                <span>.</span><span>.</span><span>.</span>
              </span>
            </p>
            <div
              className="app-splash__progress"
              role="progressbar"
              aria-label="Preparando la aplicación"
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
