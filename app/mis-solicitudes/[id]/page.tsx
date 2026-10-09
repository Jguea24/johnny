import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getAuthenticatedUserId } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import {
  formatRequestDate,
  requestStatusLabels,
} from "@/lib/requests";

export const metadata: Metadata = {
  title: "Detalle de solicitud",
  description: "Consulta el estado y los datos de tu solicitud de servicio.",
};

type PageProps = { params: Promise<{ id: string }> };
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function RequestDetailContent({ params }: PageProps) {
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();
  const userId = await getAuthenticatedUserId();
  const supabase = await createClient();
  const { data: request, error } = await supabase
    .from("service_requests")
    .select("id,service_id,name,email,phone,company,description,budget,status,priority,created_at,updated_at")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl border border-rose-400/30 bg-rose-400/10 p-6">
          <h1 className="text-xl font-semibold">No fue posible cargar la solicitud</h1>
          <p className="mt-2 text-rose-100" role="alert">
            Revisa la política service_requests_read_own_or_admin. La consulta
            limita la fila al usuario autenticado y RLS debe conservar esa
            restricción.
          </p>
        </div>
      </main>
    );
  }
  if (!request) notFound();

  let serviceTitle: string | null = null;
  if (request.service_id) {
    const { data: service } = await supabase
      .from("services")
      .select("title")
      .eq("id", request.service_id)
      .maybeSingle();
    serviceTitle = service?.title ?? null;
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <article className="mx-auto max-w-3xl">
        <Link
          href="/mis-solicitudes"
          className="text-sm text-cyan-300 hover:text-cyan-200"
        >
          ← Mis solicitudes
        </Link>
        <header className="mt-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">
              Enviada el {formatRequestDate(request.created_at)}
            </p>
            <h1 className="mt-2 text-3xl font-bold">Detalle de solicitud</h1>
          </div>
          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-sm font-medium text-cyan-100">
            {requestStatusLabels[request.status]}
          </span>
        </header>
        <section className="mt-8 space-y-6 rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
          {serviceTitle ? (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Servicio
              </h2>
              <p className="mt-1 text-white">{serviceTitle}</p>
            </div>
          ) : null}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Descripción
            </h2>
            <p className="mt-2 whitespace-pre-line leading-7 text-slate-200">
              {request.description}
            </p>
          </div>
          <dl className="grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Contacto
              </dt>
              <dd className="mt-1 text-slate-200">{request.name}</dd>
              <dd className="text-slate-400">{request.email}</dd>
            </div>
            {request.phone || request.company ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Datos adicionales
                </dt>
                {request.phone ? (
                  <dd className="mt-1 text-slate-200">{request.phone}</dd>
                ) : null}
                {request.company ? (
                  <dd className="text-slate-400">{request.company}</dd>
                ) : null}
              </div>
            ) : null}
            {request.budget !== null ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Presupuesto aproximado
                </dt>
                <dd className="mt-1 text-slate-200">
                  {request.budget.toLocaleString("es", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </dd>
              </div>
            ) : null}
          </dl>
          <p className="border-t border-white/10 pt-5 text-sm text-slate-500">
            Última actualización: {formatRequestDate(request.updated_at)}
          </p>
        </section>
      </article>
    </main>
  );
}

export default function MyRequestDetailPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 px-6 py-24 text-center text-slate-300" aria-busy="true">
          Cargando solicitud…
        </main>
      }
    >
      <RequestDetailContent params={params} />
    </Suspense>
  );
}
