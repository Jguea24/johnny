import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAuthenticatedUserId } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import {
  formatRequestDate,
  requestStatusLabels,
} from "@/lib/requests";

export const metadata: Metadata = {
  title: "Mis solicitudes",
  description: "Consulta el estado de tus solicitudes de servicio.",
};

async function RequestsContent() {
  const userId = await getAuthenticatedUserId();
  const supabase = await createClient();
  const { data: requests, error } = await supabase
    .from("service_requests")
    .select("id,service_id,name,description,budget,status,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-5xl">
        <Link href="/perfil" className="text-sm text-cyan-300 hover:text-cyan-200">
          ← Mi perfil
        </Link>
        <p className="mt-8 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">
          Cuenta
        </p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Mis solicitudes</h1>
        <p className="mt-3 text-slate-400">
          Consulta tus solicitudes y el estado más reciente registrado.
        </p>
        {error ? (
          <p className="mt-8 rounded-2xl border border-rose-400/30 bg-rose-400/10 p-6 text-rose-200" role="alert">
            No fue posible cargar tus solicitudes. Revisa que
            service_requests_read_own_or_admin permita consultar filas con
            user_id igual a tu usuario.
          </p>
        ) : requests.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <p className="text-lg font-semibold">Todavía no tienes solicitudes.</p>
            <p className="mt-2 text-slate-400">
              Explora los servicios publicados para enviar una solicitud.
            </p>
            <Link
              href="/servicios"
              className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-cyan-400 px-5 font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Ver servicios
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-4">
            {requests.map((request) => (
              <article
                key={request.id}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Solicitud · {formatRequestDate(request.created_at)}
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-white">
                      {request.description.slice(0, 120)}
                      {request.description.length > 120 ? "…" : ""}
                    </h2>
                  </div>
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-sm font-medium text-cyan-100">
                    {requestStatusLabels[request.status]}
                  </span>
                </div>
                {request.budget !== null ? (
                  <p className="mt-3 text-sm text-slate-400">
                    Presupuesto indicado:{" "}
                    {request.budget.toLocaleString("es", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                ) : null}
                <Link
                  href={`/mis-solicitudes/${request.id}`}
                  className="mt-5 inline-flex min-h-10 items-center font-semibold text-cyan-300 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                >
                  Ver solicitud <span className="ml-2" aria-hidden="true">→</span>
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function MyRequestsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 px-6 py-24 text-center text-slate-300" aria-busy="true">
          Cargando solicitudes…
        </main>
      }
    >
      <RequestsContent />
    </Suspense>
  );
}
