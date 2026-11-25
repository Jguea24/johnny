import type { Metadata } from "next";
import Link from "next/link";
import { getAuthenticatedUserId } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mis citas" };
export const instant = false;

const statusLabels = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
  COMPLETED: "Completada",
} as const;

export default async function MisCitasPage() {
  const userId = await getAuthenticatedUserId("/citas/mis-citas");
  const supabase = await createClient();
  const { data: appointments, error } = await supabase
    .from("appointments")
    .select("id,service_title,starts_at,ends_at,time_zone,status,created_at")
    .eq("user_id", userId)
    .order("starts_at", { ascending: false })
    .limit(100);
  if (error) {
    console.error(`Unable to load user appointments. Supabase code: ${error.code}.`);
    return <p className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-5 text-rose-100" role="alert">No se pudieron cargar tus citas.</p>;
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="section-eyebrow">Tu cuenta</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Mis citas</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">Aquí solo aparecen las reservas asociadas a tu cuenta.</p>
        <Link href="/citas/agendar" className="button-primary mt-5 inline-flex min-h-11 items-center justify-center px-5">
          Agendar otra cita
        </Link>
      </header>
      {!appointments?.length ? (
        <section className="surface-card p-6">
          <p className="text-slate-300">Todavía no tienes citas registradas.</p>
          <Link href="/citas/agendar" className="mt-4 inline-flex min-h-11 items-center font-semibold text-cyan-200 hover:text-cyan-100">Agendar una cita →</Link>
        </section>
      ) : (
        <section className="grid gap-4" aria-label="Lista de citas">
          {appointments.map((appointment) => (
            <article key={appointment.id} className="surface-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-white">{appointment.service_title}</h2>
                <p className="mt-1 text-sm text-slate-300">
                  {new Date(appointment.starts_at).toLocaleString("es", { dateStyle: "full", timeStyle: "short", timeZone: appointment.time_zone })}
                  <span className="ml-2 text-slate-500">{appointment.time_zone}</span>
                </p>
                <p className="mt-2 text-sm text-cyan-200">{statusLabels[appointment.status]}</p>
              </div>
              <Link href={`/citas/${appointment.id}`} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-white/15 px-4 text-sm font-semibold text-slate-100 transition hover:border-cyan-300/40 hover:text-cyan-100">
                Ver detalle
              </Link>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
