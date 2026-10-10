"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function subscribeToNothing() {
  return () => {};
}

function subscribeToNetwork(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function getOfflineState() {
  return !navigator.onLine;
}

function subscribeToInstalledState(onChange: () => void) {
  const displayMode = window.matchMedia("(display-mode: standalone)");
  displayMode.addEventListener("change", onChange);
  window.addEventListener("appinstalled", onChange);
  return () => {
    displayMode.removeEventListener("change", onChange);
    window.removeEventListener("appinstalled", onChange);
  };
}

function getInstalledState() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function getManualInstallInstructions(): string | null {
  const userAgent = navigator.userAgent;
  const isAppleMobile =
    /iPhone|iPad|iPod/.test(userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (
    isAppleMobile &&
    /Safari/.test(userAgent) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent)
  ) {
    return "En Safari, toca Compartir y elige “Añadir a pantalla de inicio”.";
  }
  if (/Android/.test(userAgent) && /Chrome/.test(userAgent)) {
    return "En Chrome, abre el menú ⋮ y elige “Instalar aplicación” o “Añadir a pantalla de inicio”.";
  }
  if (/Edg\//.test(userAgent)) {
    return "En Microsoft Edge, abre el menú y elige Aplicaciones → Instalar este sitio como una aplicación.";
  }
  if (/Chrome\//.test(userAgent)) {
    return "En Chrome, abre el menú y elige “Instalar Johnny” o “Instalar página como aplicación”.";
  }
  return null;
}

export default function PwaControls() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(
    null,
  );
  const isOffline = useSyncExternalStore(
    subscribeToNetwork,
    getOfflineState,
    () => false,
  );
  const manualInstructions = useSyncExternalStore(
    subscribeToNothing,
    getManualInstallInstructions,
    () => null,
  );
  const isInstalled = useSyncExternalStore(
    subscribeToInstalledState,
    getInstalledState,
    () => false,
  );

  useEffect(() => {
    const onInstallPrompt = (event: Event) => {
      const candidate = event as InstallPromptEvent;
      if (typeof candidate.prompt !== "function") return;
      event.preventDefault();
      setInstallPrompt(candidate);
    };
    const onInstalled = () => {
      setInstallPrompt(null);
    };
    let disposed = false;
    let registration: ServiceWorkerRegistration | null = null;
    const updateRegistration = () => {
      if (!registration || !navigator.onLine) return;
      void registration
        .update()
        .catch((error: unknown) =>
          console.warn("No se pudo comprobar una actualización de Johnny.", error),
        );
    };

    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((activeRegistration) => {
          if (disposed) return;
          registration = activeRegistration;
          updateRegistration();
          document.addEventListener("visibilitychange", updateRegistration);
          window.addEventListener("online", updateRegistration);
        })
        .catch((error: unknown) => {
          console.warn("No se pudo registrar el service worker de Johnny.", error);
        });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      disposed = true;
      document.removeEventListener("visibilitychange", updateRegistration);
      window.removeEventListener("online", updateRegistration);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) return;
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
    } catch (error) {
      console.warn("No se pudo iniciar la instalación de Johnny.", error);
    } finally {
      setInstallPrompt(null);
    }
  }

  const showInstall = !isInstalled;
  const showManualHelp =
    showInstall && !installPrompt && Boolean(manualInstructions);

  if (!isOffline && !installPrompt && !showManualHelp) return null;

  return (
    <aside
      className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-[calc(1rem+env(safe-area-inset-right))] z-[60] flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2"
      aria-label="Estado de la aplicación"
    >
      {isOffline ? (
        <p
          className="max-w-sm rounded-xl border border-amber-300/30 bg-slate-950/95 px-4 py-3 text-sm text-amber-100 shadow-xl"
          role="status"
          aria-live="polite"
        >
          Parece que estás sin conexión. Los formularios y los datos
          actualizados requieren Internet.
        </p>
      ) : null}
      {showInstall && installPrompt ? (
        <button
          type="button"
          onClick={() => void installApp()}
          className="min-h-11 rounded-full border border-cyan-200/30 bg-slate-950/95 px-4 text-sm font-semibold text-cyan-100 shadow-xl hover:border-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        >
          Instalar Johnny
        </button>
      ) : null}
      {showManualHelp && manualInstructions ? (
        <details className="max-w-sm rounded-xl border border-white/15 bg-slate-950/95 px-4 py-2 text-sm text-slate-200 shadow-xl">
          <summary className="min-h-7 cursor-pointer font-medium text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
            Añadir Johnny al dispositivo
          </summary>
          <p className="pt-2 leading-6 text-slate-300">
            {manualInstructions}
          </p>
        </details>
      ) : null}
    </aside>
  );
}
