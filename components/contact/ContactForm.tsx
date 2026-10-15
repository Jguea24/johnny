"use client";

import Script from "next/script";
import { useActionState, useEffect, useRef } from "react";
import {
  sendContactMessageAction,
  type AuthActionState,
} from "@/lib/auth/actions";

const initialState: AuthActionState = {};

const inputClass = "field-control";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      theme: "dark";
    },
  ) => string;
  reset: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export default function ContactForm({
  turnstileSiteKey,
  enabled,
}: {
  turnstileSiteKey: string;
  enabled: boolean;
}) {
  const [state, action, pending] = useActionState(
    sendContactMessageAction,
    initialState,
  );
  const captchaContainer = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  function mountCaptcha() {
    if (!window.turnstile || !captchaContainer.current || widgetId.current) {
      return;
    }
    widgetId.current = window.turnstile.render(captchaContainer.current, {
      sitekey: turnstileSiteKey,
      theme: "dark",
    });
  }

  useEffect(() => {
    if (!state.error && !state.success) return;
    if (widgetId.current) window.turnstile?.reset(widgetId.current);
  }, [state]);

  return (
    <form action={action} className="space-y-5">
      {enabled ? (
        <>
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
            strategy="afterInteractive"
            onReady={mountCaptcha}
          />
          <div ref={captchaContainer} />
        </>
      ) : (
        <p
          className="rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100"
          role="status"
        >
          El formulario está temporalmente fuera de servicio. Puedes contactarme
          por WhatsApp o volver a intentarlo más tarde.
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="mb-2 block text-sm font-medium text-slate-200">
            Nombre <span aria-hidden="true">*</span>
          </label>
          <input
            id="contact-name"
            name="name"
            required
            minLength={2}
            maxLength={120}
            autoComplete="name"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="mb-2 block text-sm font-medium text-slate-200">
            Correo electrónico <span aria-hidden="true">*</span>
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            className={inputClass}
          />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-phone" className="mb-2 block text-sm font-medium text-slate-200">
            Teléfono <span className="text-slate-500">(opcional)</span>
          </label>
          <input
            id="contact-phone"
            name="phone"
            type="tel"
            maxLength={40}
            autoComplete="tel"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="contact-subject" className="mb-2 block text-sm font-medium text-slate-200">
            Asunto <span aria-hidden="true">*</span>
          </label>
          <input
            id="contact-subject"
            name="subject"
            required
            minLength={3}
            maxLength={160}
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label htmlFor="contact-message" className="mb-2 block text-sm font-medium text-slate-200">
          Mensaje <span aria-hidden="true">*</span>
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={6}
          className={`${inputClass} resize-y py-3`}
        />
      </div>
      <div
        className="absolute -left-[10000px] h-px w-px overflow-hidden"
        aria-hidden="true"
      >
        <label htmlFor="contact-website">Deja este campo vacío</label>
        <input
          id="contact-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      {state.error || state.success ? (
        <p
          className={`rounded-xl border px-4 py-3 text-sm ${
            state.error
              ? "border-rose-400/30 bg-rose-400/10 text-rose-200"
              : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
          }`}
          role={state.error ? "alert" : "status"}
          aria-live="polite"
        >
          {state.error || state.success}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending || !enabled}
        className="button-primary w-full sm:w-auto"
      >
        {pending ? "Enviando…" : "Enviar mensaje"}
      </button>
    </form>
  );
}
