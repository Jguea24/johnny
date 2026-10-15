"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

type CheckoutResponse = {
  checkoutId?: string;
  widgetUrl?: string;
  resultUrl?: string;
  error?: string;
};

export default function DatafastCheckout({
  serviceId,
  serviceTitle,
  amount,
}: {
  serviceId: string;
  serviceTitle: string;
  amount: number;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [widget, setWidget] = useState<{ url: string; resultUrl: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const paymentForm = formRef.current;
    if (!widget || !paymentForm) return;
    let disposed = false;
    const scripts: HTMLScriptElement[] = [];
    const load = (src: string) => new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("No se pudo cargar el formulario seguro de Datafast."));
      document.body.appendChild(script);
      scripts.push(script);
    });
    void load("https://www.datafast.com.ec/js/dfAdditionalValidations1.js")
      .then(() => load(widget.url))
      .catch((loadError: unknown) => {
        if (!disposed) setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el formulario de pago.");
      });
    return () => {
      disposed = true;
      scripts.forEach((script) => script.remove());
      paymentForm.replaceChildren();
    };
  }, [widget]);

  async function beginPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || widget) return;
    setLoading(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    const payload = {
      serviceId,
      givenName: formData.get("givenName"),
      middleName: formData.get("middleName"),
      surname: formData.get("surname"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      identification: formData.get("identification"),
      address: formData.get("address"),
      postcode: formData.get("postcode"),
    };
    try {
      const response = await fetch("/api/payments/datafast/checkouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json() as CheckoutResponse;
      if (!response.ok || !data.checkoutId || !data.widgetUrl || !data.resultUrl) {
        throw new Error(data.error || "No se pudo iniciar el pago. Inténtalo otra vez.");
      }
      setWidget({ url: data.widgetUrl, resultUrl: data.resultUrl });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo conectar con el servidor de pagos.");
    } finally {
      setLoading(false);
    }
  }

  const fieldClass = "mt-1 min-h-11 w-full rounded-xl border border-white/15 bg-slate-950 px-3 text-white outline-none focus-visible:ring-2 focus-visible:ring-cyan-300";

  return (
    <section id="datafast" className="mt-7 scroll-mt-28 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.04] p-4 sm:p-6" aria-labelledby="datafast-heading">
      <h3 id="datafast-heading" className="text-lg font-semibold">Comprar este servicio</h3>
      <p className="mt-2 text-sm text-slate-300">
        Total: <strong className="text-white">USD {amount.toFixed(2)}</strong>. Pago con tarjeta procesado en el formulario seguro de Datafast.
      </p>
      {!widget ? (
        <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={beginPayment}>
          <label className="text-sm text-slate-200">Primer nombre (según documento)<input className={fieldClass} name="givenName" required minLength={3} maxLength={48} autoComplete="given-name" /></label>
          <label className="text-sm text-slate-200">Segundo nombre<input className={fieldClass} name="middleName" required minLength={2} maxLength={50} autoComplete="additional-name" /></label>
          <label className="text-sm text-slate-200">Apellidos<input className={fieldClass} name="surname" required minLength={3} maxLength={48} autoComplete="family-name" /></label>
          <label className="text-sm text-slate-200">Correo electrónico<input className={fieldClass} name="email" required type="email" maxLength={128} autoComplete="email" /></label>
          <label className="text-sm text-slate-200">Teléfono<input className={fieldClass} name="phone" required type="tel" minLength={7} maxLength={25} autoComplete="tel" /></label>
          <label className="text-sm text-slate-200">Cédula ecuatoriana<input className={fieldClass} name="identification" required minLength={10} maxLength={10} pattern="[0-9]{10}" autoComplete="off" inputMode="numeric" /></label>
          <label className="text-sm text-slate-200 sm:col-span-2">Dirección de facturación<input className={fieldClass} name="address" required minLength={3} maxLength={100} autoComplete="street-address" /></label>
          <label className="text-sm text-slate-200">Código postal<input className={fieldClass} name="postcode" required minLength={3} maxLength={20} autoComplete="postal-code" /></label>
          <p className="self-center text-xs leading-5 text-slate-400 sm:col-span-2">Estos datos se enviarán a Datafast para procesar el pago y se guardarán con la orden para conciliación y atención. No ingreses datos de tarjeta en este formulario.</p>
          <button type="submit" disabled={loading} className="button-primary inline-flex min-h-12 items-center justify-center rounded-xl px-5 font-semibold disabled:cursor-wait disabled:opacity-60 sm:col-span-2">
            {loading ? "Conectando con Datafast…" : `Continuar al pago · USD ${amount.toFixed(2)}`}
          </button>
        </form>
      ) : (
        <div className="mt-5 rounded-xl border border-white/10 bg-slate-950 p-4" aria-live="polite">
          <p className="mb-4 text-sm text-slate-300">Completa el pago en el formulario seguro de Datafast para “{serviceTitle}”.</p>
          <form ref={formRef} action={widget.resultUrl} className="paymentWidgets" data-brands="VISA MASTER AMEX DINERS DISCOVER" />
        </div>
      )}
      {error ? <p role="alert" className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p> : null}
    </section>
  );
}
