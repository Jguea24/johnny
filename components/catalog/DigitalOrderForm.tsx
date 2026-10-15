"use client";

import Script from "next/script";
import { useActionState, useEffect, useRef, useState } from "react";
import { WhatsAppLink } from "@/components/contact/WhatsAppButton";
import { createDigitalOrderAction } from "@/lib/digital-orders/actions";

export default function DigitalOrderForm({
  serviceId,
  serviceTitle,
  amount,
  turnstileSiteKey,
  enabled,
}: {
  serviceId: string;
  serviceTitle: string;
  amount: number;
  turnstileSiteKey: string;
  enabled: boolean;
}) {
  const [state, action, pending] = useActionState(createDigitalOrderAction, {});
  const [captchaToken, setCaptchaToken] = useState("");
  const captchaContainer = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  function mountCaptcha() {
    if (!window.turnstile || !captchaContainer.current || widgetId.current) return;
    widgetId.current = window.turnstile.render(captchaContainer.current, {
      sitekey: turnstileSiteKey,
      theme: "dark",
      callback: setCaptchaToken,
      "expired-callback": () => setCaptchaToken(""),
    });
  }

  useEffect(() => {
    if ((!state.error && !state.orderId) || !widgetId.current) return;
    window.turnstile?.reset(widgetId.current);
    setCaptchaToken("");
  }, [state]);

  return (
    <section id="pedido" className="surface-card mt-10 scroll-mt-28 border-cyan-300/20 p-4 sm:p-7" aria-labelledby="digital-order-heading">
      <p className="section-eyebrow">Pedido seguro</p>
      <h2 id="digital-order-heading" className="mt-2 text-2xl font-semibold text-white">Solicitar este plan</h2>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/15 p-4">
        <div>
          <p className="font-semibold text-white">{serviceTitle}</p>
          <p className="mt-1 text-sm text-slate-400">El pedido se registra pendiente. El pago se coordina y verifica manualmente.</p>
        </div>
        <p className="text-xl font-bold text-white">Total USD {amount.toFixed(2)}</p>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">Este es el total del pedido; no se añade ningún impuesto automáticamente. El pago se coordina antes de activar el producto.</p>

      {state.orderId ? (
        <div className="mt-5 rounded-xl border border-emerald-300/25 bg-emerald-300/[0.06] p-4" role="status">
          <h3 className="font-semibold text-emerald-100">Pedido registrado · {state.orderId.slice(0, 8).toUpperCase()}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">Todavía no se ha confirmado el pago ni la entrega. Escríbenos para acordar el método de pago y los pasos de activación.</p>
          <WhatsAppLink className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 font-semibold text-slate-950 hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" message={`Hola Johnny, registré el pedido ${state.orderId.slice(0, 8).toUpperCase()} para ${serviceTitle} por USD ${amount.toFixed(2)}. Quiero coordinar el método de pago y la entrega.`} pagePath="/servicios-digitales" label="Continuar por WhatsApp" />
        </div>
      ) : !enabled ? (
        <div className="mt-5 rounded-xl border border-amber-300/25 bg-amber-300/[0.06] p-4" role="status">
          <p className="text-sm leading-6 text-amber-100">El registro de pedidos está temporalmente desactivado. Puedes consultar este plan por WhatsApp.</p>
          <WhatsAppLink className="mt-3 inline-flex min-h-11 items-center gap-2 font-semibold text-emerald-300 hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300" message={`Hola Johnny, quiero consultar el plan ${serviceTitle} por USD ${amount.toFixed(2)} y coordinar pago y entrega.`} pagePath="/servicios-digitales" label="Consultar por WhatsApp" />
        </div>
      ) : (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={mountCaptcha} />
          <form action={action} className="mt-5 space-y-4">
            <input type="hidden" name="service_id" value={serviceId} />
            <input type="hidden" name="cf-turnstile-response" value={captchaToken} />
            <div className="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true">
              <label htmlFor="digital-order-website">Deja este campo vacío</label>
              <input id="digital-order-website" name="website" tabIndex={-1} autoComplete="off" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-200">Nombre completo
                <input name="customer_name" required minLength={2} maxLength={120} autoComplete="name" className="field-control mt-1" />
              </label>
              <label className="text-sm font-medium text-slate-200">Correo electrónico
                <input name="customer_email" required type="email" maxLength={254} autoComplete="email" className="field-control mt-1" />
              </label>
              <label className="text-sm font-medium text-slate-200 sm:col-span-2">Teléfono de contacto
                <input name="customer_phone" required type="tel" minLength={7} maxLength={40} autoComplete="tel" className="field-control mt-1" />
              </label>
            </div>
            <fieldset className="rounded-xl border border-white/10 p-4">
              <legend className="px-1 text-sm font-semibold text-white">Método de pago disponible</legend>
              <label className="flex min-h-10 items-center gap-3 text-sm text-slate-300">
                <input type="radio" checked readOnly className="accent-cyan-300" />
                Coordinar el pago con Johnny por WhatsApp
              </label>
              <p className="mt-1 text-xs leading-5 text-slate-400">No se realiza un cobro automático. El pedido queda pendiente hasta que el administrador verifique el pago.</p>
            </fieldset>
            <div ref={captchaContainer} aria-label="Verificación de seguridad" />
            <WhatsAppLink className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-emerald-300 hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300" message={`Hola Johnny, quiero solicitar ${serviceTitle} por USD ${amount.toFixed(2)}. La verificación del pedido no cargó y quiero coordinar por WhatsApp.`} pagePath="/servicios-digitales" label="Solicitar directamente por WhatsApp" />
            {state.error ? <p className="rounded-lg border border-rose-300/30 bg-rose-300/10 p-3 text-sm text-rose-100" role="alert" aria-live="polite">{state.error}</p> : null}
            <button type="submit" disabled={pending || !captchaToken} className="button-primary w-full disabled:cursor-not-allowed">
              {pending ? "Registrando pedido…" : "Confirmar pedido · WhatsApp"}
            </button>
            <p className="text-xs leading-5 text-slate-500">Solo pedimos nombre, correo y teléfono para identificar la solicitud. Nunca compartas contraseñas personales ni claves de activación.</p>
          </form>
        </>
      )}
    </section>
  );
}
