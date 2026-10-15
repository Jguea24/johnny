"use client";

import { useActionState } from "react";
import type { Database } from "@/types/database";
import { updateDigitalOrderAction } from "@/lib/digital-orders/actions";

type DigitalOrder = Database["public"]["Tables"]["digital_orders"]["Row"];

const paymentLabels = {
  PENDING: "Pago pendiente de verificar",
  VERIFIED: "Pago verificado",
  REJECTED: "Pago rechazado",
  CANCELLED: "Cancelado",
} as const;

const deliveryLabels = {
  PENDING: "Pendiente de entrega",
  DELIVERED: "Entregado",
  CANCELLED: "Entrega cancelada",
} as const;

function dateInputValue(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

function DigitalOrderCard({ order }: { order: DigitalOrder }) {
  const [state, action, pending] = useActionState(updateDigitalOrderAction, {});

  return (
    <article className="surface-card p-5 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">Pedido {order.id.slice(0, 8).toUpperCase()}</p>
          <h2 className="mt-2 text-lg font-semibold text-white">{order.service_title} · {order.plan_name}</h2>
          <p className="mt-1 text-sm text-slate-400">{order.brand}{order.family_name ? ` · ${order.family_name}` : ""} · {order.duration_unit === "PERMANENT" ? "Acceso permanente" : `${order.duration_value} ${order.duration_unit === "DAY" ? "día(s)" : order.duration_unit === "MONTH" ? "mes(es)" : "año(s)"}`}</p>
          <p className="mt-2 text-sm text-slate-300">{order.customer_name} · {order.customer_email} · {order.customer_phone}</p>
        </div>
        <p className="text-xl font-bold text-white">USD {order.amount.toFixed(2)}</p>
      </header>
      <dl className="mt-4 grid gap-3 border-t border-white/10 pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div><dt className="text-slate-500">Pago</dt><dd className="mt-1 text-slate-200">{paymentLabels[order.payment_status]}</dd></div>
        <div><dt className="text-slate-500">Entrega</dt><dd className="mt-1 text-slate-200">{deliveryLabels[order.delivery_status]}</dd></div>
        <div><dt className="text-slate-500">Creado</dt><dd className="mt-1 text-slate-200">{new Date(order.created_at).toLocaleString("es-EC", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Guayaquil" })}</dd></div>
        <div><dt className="text-slate-500">Fecha de expiración</dt><dd className="mt-1 text-slate-200">{order.expires_at ? new Date(order.expires_at).toLocaleDateString("es-EC", { dateStyle: "medium", timeZone: "America/Guayaquil" }) : "No aplica / pendiente"}</dd></div>
      </dl>
      <details className="mt-5 border-t border-white/10 pt-4">
        <summary className="cursor-pointer font-medium text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Verificar pago y registrar entrega</summary>
        <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="order_id" value={order.id} />
          <label className="text-sm font-medium text-slate-200">Estado del pago
            <select name="payment_status" defaultValue={order.payment_status} className="field-control mt-1">
              <option value="PENDING">Pendiente de verificar</option>
              <option value="VERIFIED">Verificado manualmente</option>
              <option value="REJECTED">Rechazado</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-200">Estado de la entrega
            <select name="delivery_status" defaultValue={order.delivery_status} className="field-control mt-1">
              <option value="PENDING">Pendiente</option>
              <option value="DELIVERED">Entregado</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-200">Fecha de entrega
            <input name="delivered_at" type="date" defaultValue={dateInputValue(order.delivered_at)} className="field-control mt-1" />
          </label>
          <label className="text-sm font-medium text-slate-200">Fecha de expiración (opcional)
            <input name="expires_at" type="date" defaultValue={dateInputValue(order.expires_at)} className="field-control mt-1" />
          </label>
          <label className="text-sm font-medium text-slate-200 sm:col-span-2">Nota interna de entrega
            <textarea name="delivery_notes" defaultValue={order.delivery_notes} maxLength={2000} rows={3} className="field-control mt-1 resize-y py-2" />
          </label>
          <p className="text-xs leading-5 text-slate-400 sm:col-span-2">La entrega solo se puede marcar después de verificar el pago. Si no indicas expiración, se calcula según la duración del plan; el acceso permanente no expira.</p>
          {state.error || state.success ? <p className={`rounded-lg border px-3 py-2 text-sm sm:col-span-2 ${state.error ? "border-rose-300/30 bg-rose-300/10 text-rose-100" : "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"}`} role={state.error ? "alert" : "status"} aria-live="polite">{state.error || state.success}</p> : null}
          <button type="submit" disabled={pending} className="button-primary sm:col-span-2">{pending ? "Guardando…" : "Guardar seguimiento del pedido"}</button>
        </form>
      </details>
    </article>
  );
}

export default function DigitalOrdersManager({ orders }: { orders: DigitalOrder[] }) {
  if (orders.length === 0) {
    return <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-slate-300" role="status">Todavía no hay pedidos digitales.</p>;
  }
  return <section aria-label="Pedidos digitales" className="space-y-4">{orders.map((order) => <DigitalOrderCard key={order.id} order={order} />)}</section>;
}
