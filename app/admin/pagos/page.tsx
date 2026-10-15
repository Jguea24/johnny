import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/identity";

export const metadata: Metadata = {
  title: "Pagos | Administración",
  robots: { index: false, follow: false },
};

const labels = {
  PENDING: "Pendiente de confirmación",
  PAID: "Pagado",
  FAILED: "No aprobado",
} as const;

export default async function AdminPaymentsPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("service_orders")
    .select("id,service_title,amount,currency,status,customer_given_name,customer_surname,customer_email,merchant_transaction_id,datafast_payment_brand,created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <main className="space-y-7">
      <header>
        <p className="section-eyebrow">Administración</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Pagos Datafast</h1>
        <p className="mt-3 max-w-2xl text-slate-300">Consulta las órdenes y su confirmación. El estado pagado solo se establece después de verificarlo con Datafast.</p>
      </header>
      {error ? (
        <p className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-5 text-sm text-rose-200" role="alert">
          No se pudieron cargar los pagos. Aplica la migración de Datafast en Supabase y verifica que tu cuenta tenga rol de administrador.
        </p>
      ) : data?.length ? (
        <section aria-label="Órdenes de servicio" className="space-y-4">
          {data.map((order) => (
            <article key={order.id} className="surface-card p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">{order.service_title}</h2>
                  <p className="mt-1 text-sm text-slate-300">{order.customer_given_name} {order.customer_surname} · {order.customer_email}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${order.status === "PAID" ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200" : order.status === "FAILED" ? "border-rose-300/30 bg-rose-300/10 text-rose-200" : "border-amber-300/30 bg-amber-300/10 text-amber-100"}`}>
                  {labels[order.status]}
                </span>
              </div>
              <dl className="mt-5 grid gap-3 border-t border-white/10 pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div><dt className="text-slate-500">Total</dt><dd className="mt-1 font-semibold text-white">{order.currency} {Number(order.amount).toFixed(2)}</dd></div>
                <div><dt className="text-slate-500">Método</dt><dd className="mt-1 text-slate-200">Datafast{order.datafast_payment_brand ? ` · ${order.datafast_payment_brand}` : ""}</dd></div>
                <div><dt className="text-slate-500">Fecha</dt><dd className="mt-1 text-slate-200">{new Date(order.created_at).toLocaleString("es-EC", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Guayaquil" })}</dd></div>
                <div><dt className="text-slate-500">Referencia de orden</dt><dd className="mt-1 break-all font-mono text-xs text-slate-300">{order.merchant_transaction_id}</dd></div>
              </dl>
            </article>
          ))}
        </section>
      ) : (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center text-slate-300" role="status">Todavía no hay órdenes de pago.</p>
      )}
    </main>
  );
}
