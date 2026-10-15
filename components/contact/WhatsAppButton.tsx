"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const whatsappPhone = "593989894314";
const defaultWhatsAppMessage =
  "Hola Johnny, estoy interesado en tus servicios tecnológicos.";

function getWhatsAppUrl(message: string, pageUrl?: string) {
  const phone = whatsappPhone.replace(/\D/g, "");
  if (phone.length < 8 || phone.length > 15) return null;
  const text = pageUrl ? `${message}\n${pageUrl}` : message;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

function WhatsAppIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12.04 2a9.86 9.86 0 0 0-8.47 14.91L2 22l5.23-1.37A9.93 9.93 0 0 0 12.04 22 10 10 0 0 0 12.04 2Zm0 18.2a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.1.81.83-3.02-.2-.31a8.18 8.18 0 1 1 6.95 3.84Zm4.49-6.13c-.25-.13-1.48-.73-1.71-.81-.23-.08-.4-.13-.57.13-.17.26-.65.81-.79.98-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.24-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.52.12-.12.25-.29.37-.43.12-.14.16-.25.25-.42.08-.17.04-.32-.02-.45-.06-.13-.57-1.37-.78-1.88-.2-.5-.41-.43-.57-.44h-.49c-.17 0-.45.06-.68.32-.23.26-.89.87-.89 2.11 0 1.24.91 2.44 1.03 2.61.12.17 1.79 2.73 4.33 3.83.61.26 1.08.42 1.45.54.61.19 1.16.16 1.6.1.49-.07 1.48-.61 1.69-1.2.21-.59.21-1.09.15-1.2-.06-.11-.23-.17-.48-.3Z" />
    </svg>
  );
}

export function WhatsAppLink({
  className,
  message = defaultWhatsAppMessage,
  pagePath,
  label = "Escríbeme por WhatsApp",
}: {
  className: string;
  message?: string;
  pagePath?: string;
  label?: string;
}) {
  const href = getWhatsAppUrl(message);
  if (!href) {
    return (
      <span className={className} role="status">
        WhatsApp no está disponible por el momento.
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={(event) => {
        if (!pagePath) return;
        event.preventDefault();
        const pageUrl = new URL(pagePath, window.location.origin).toString();
        const destination = getWhatsAppUrl(message, pageUrl);
        if (destination) window.open(destination, "_blank", "noopener,noreferrer");
      }}
    >
      <WhatsAppIcon />
      <span>{label}</span>
    </a>
  );
}

export default function WhatsAppButton() {
  const pathname = usePathname();
  const [obstructingSectionVisible, setObstructingSectionVisible] =
    useState(true);
  const isPrivateRoute =
    pathname === "/login" ||
    pathname === "/registro" ||
    pathname === "/recuperar-contrasena" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/perfil") ||
    pathname.startsWith("/mis-solicitudes");

  useEffect(() => {
    const obstructingSections = ["inicio", "contacto"]
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null);

    if (obstructingSections.length === 0) {
      const frame = requestAnimationFrame(() =>
        setObstructingSectionVisible(false),
      );
      return () => cancelAnimationFrame(frame);
    }

    if (!("IntersectionObserver" in window)) {
      const frame = requestAnimationFrame(() =>
        setObstructingSectionVisible(false),
      );
      return () => cancelAnimationFrame(frame);
    }

    const visibleSections = new Set<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visibleSections.add(entry.target);
          } else {
            visibleSections.delete(entry.target);
          }
        }
        setObstructingSectionVisible(visibleSections.size > 0);
      },
      { threshold: 0 },
    );
    obstructingSections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [pathname]);

  if (isPrivateRoute || obstructingSectionVisible) return null;

  const whatsappUrl = getWhatsAppUrl(defaultWhatsAppMessage);
  if (!whatsappUrl) return null;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="¿Hablamos por WhatsApp? Se abre en una pestaña nueva."
      className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-[calc(1rem+env(safe-area-inset-right))] z-40 inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-full bg-[#25D366] px-3 text-white shadow-lg shadow-black/30 transition-colors hover:bg-[#1ebe5d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 motion-reduce:transition-none sm:px-4"
    >
      <WhatsAppIcon />
      <span className="hidden text-sm font-semibold sm:inline">
        ¿Hablamos por WhatsApp?
      </span>
      <span className="sr-only sm:hidden">¿Hablamos por WhatsApp?</span>
    </a>
  );
}
