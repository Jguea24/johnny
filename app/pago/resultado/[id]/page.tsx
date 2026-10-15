import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import PublicPageFrame from "@/components/layout/PublicPageFrame";
import { getPublicSiteSettings } from "@/lib/site-settings";
import { getSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/types/database";

export const metadata: Metadata = { title: "Estado del pago", robots: { index: false, follow: false } };

type PageProps = { params: Promise<{ id: string }> };

export default function PaymentResultPage({ params }: PageProps) {
  return (
    <Suspense fallback={<main className="min-h-screen px-4 py-20 text-center text-slate-300" aria-busy="true">Consultando estado del pago…</main>}>
      <PaymentResultContent params={params} />
    </Suspense>
  );
}

async function PaymentResultContent({ params }: PageProps) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [settings, config] = await Promise.all([getPublicSiteSettings(), Promise.resolve(getSupabaseConfig())]);
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!config || !secret) {
    return <PublicPageFrame settings={settings}><main className="mx-auto max-w-2xl px-4 py-20 text-white"><h1 className="text-2xl font-bold">Pago en proceso</h1><p className="mt-3 text-slate-300">No pudimos consultar el estado. No vuelvas a pagar todavía; comunícate con nosotros para verificarlo.</p></main></PublicPageFrame>;
  }
  const supabase = createSupabaseClient<Database>(config.url, secret, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const { data: order, error } = await supabase
    .from("service_orders")
    .select("id,service_title,amount,currency,status")
    .eq("id", id)
    .maybeSingle();
  if (error || !order) notFound();

  const state = order.status === "PAID" ? "confirmed" : order.status === "FAILED" ? "failed" : "pending";
  const content = {
    confirmed: {
      title: "Pago confirmado",
      text: "Datafast confirmó el pago. Guarda esta página como comprobante de referencia.",
      color: "text-emerald-300",
    },
    pending: {
      title: "Pago en verificación",
      text: "Aún no recibimos una confirmación definitiva. No realices otro pago; vuelve a consultar o contáctanos.",
      color: "text-amber-200",
    },
    failed: {
      title: "Pago no aprobado",
      text: "Datafast no confirmó el cobro. Puedes revisar los datos e intentar nuevamente.",
      color: "text-rose-300",
    },
  }[state];

  return (
    <PublicPageFrame settings={settings}>
      <main className="mx-auto max-w-2xl px-4 py-16 text-white sm:px-6 sm:py-24">
        <section className="surface-card p-6 sm:p-9">
          <p className={`text-sm font-semibold uppercase tracking-widest ${content.color}`}>Datafast</p>
          <h1 className="mt-3 text-3xl font-bold">{content.title}</h1>
          <p className="mt-4 leading-7 text-slate-300">{content.text}</p>
          <dl className="mt-8 space-y-3 border-t border-white/10 pt-6">
            <div className="flex flex-wrap justify-between gap-3"><dt className="text-slate-400">Servicio</dt><dd className="font-semibold">{order.service_title}</dd></div>
            <div className="flex flex-wrap justify-between gap-3"><dt className="text-slate-400">Total</dt><dd className="font-semibold">{order.currency} {Number(order.amount).toFixed(2)}</dd></div>
            <div className="flex flex-wrap justify-between gap-3"><dt className="text-slate-400">Orden</dt><dd className="font-mono text-sm">{order.id}</dd></div>
          </dl>
          <Link href="/servicios-digitales" className="button-primary mt-8 inline-flex min-h-11 items-center rounded-full px-5">Volver a servicios digitales</Link>
        </section>
      </main>
    </PublicPageFrame>
  );
}
