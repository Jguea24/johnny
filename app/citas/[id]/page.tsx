import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AppointmentDetailActions from "@/components/appointments/AppointmentDetailActions";
import type { AppointmentSlotOption } from "@/components/appointments/AppointmentBookingForm";
import { getAuthenticatedUserId } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";

type PageProps = { params: Promise<{ id: string }> };
export const instant = false;

const statusLabels = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
  COMPLETED: "Completada",
} as const;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Detalle de cita ${id}` };
}

export default async function DetalleCitaPage({ params }: PageProps) {
  const [{ id }, userId] = await Promise.all([params, getAuthenticatedUserId()]);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: appointment, error } = await supabase
    .from("appointments")
    .select("id,user_id,service_id,service_title,slot_id,starts_at,ends_at,time_zone,customer_name,customer_email,customer_phone,status,created_at,cancelled_at")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error(`Unable to load appointment detail. Supabase code: ${error.code}.`);
    return <p className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-5 text-rose-100" role="alert">No se pudo cargar el detalle de la cita.</p>;
  }
  if (!appointment) notFound();

  const slotsResult = await (
    ["PENDING", "CONFIRMED"].includes(appointment.status)
      ? supabase
          .from("appointment_slots")
          .select("id,service_id,starts_at,ends_at,time_zone")
          .eq("service_id", appointment.service_id)
          .eq("active", true)
          .gt("starts_at", new Date().toISOString())
          .order("starts_at", { ascending: true })
          .limit(100)
      : Promise.resolve({ data: [] as AppointmentSlotOption[], error: null })
  );
  if (slotsResult.error) {
    console.error(`Unable to load appointment detail data. Supabase code: ${slotsResult.error.code}.`);
    return <p className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-5 text-rose-100" role="alert">No se pudieron cargar los detalles de la cita.</p>;
  }

  const canManage = appointment.status === "PENDING" || appointment.status === "CONFIRMED";
  const slots = (slotsResult.data ?? []).filter((slot) => slot.id !== appointment.slot_id);
  return (
    <div className="space-y-7">
      <header>
        <p className="section-eyebrow">Detalle de reserva</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Tu cita</h1>
      </header>
      <section className="surface-card p-5 sm:p-7">
        <dl className="grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Servicio</dt>
            <dd className="mt-1 text-base font-medium text-white">{appointment.service_title}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Estado</dt>
            <dd className="mt-1 text-base font-medium text-cyan-200">{statusLabels[appointment.status]}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fecha y hora</dt>
            <dd className="mt-1 text-slate-200">
              {new Date(appointment.starts_at).toLocaleString("es", { dateStyle: "full", timeStyle: "short", timeZone: appointment.time_zone })}
              <span className="ml-2 text-sm text-slate-500">{appointment.time_zone}</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Duración</dt>
            <dd className="mt-1 text-slate-200">
              {Math.round((new Date(appointment.ends_at).getTime() - new Date(appointment.starts_at).getTime()) / 60000)} min
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Nombre de contacto</dt>
            <dd className="mt-1 text-slate-200">{appointment.customer_name}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Correo</dt>
            <dd className="mt-1 break-all text-slate-200">{appointment.customer_email}</dd>
          </div>
          {appointment.customer_phone ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Teléfono</dt>
              <dd className="mt-1 text-slate-200">{appointment.customer_phone}</dd>
            </div>
          ) : null}
          {appointment.cancelled_at ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cancelada el</dt>
              <dd className="mt-1 text-slate-200">{new Date(appointment.cancelled_at).toLocaleString("es", { dateStyle: "medium", timeStyle: "short", timeZone: appointment.time_zone })}</dd>
            </div>
          ) : null}
        </dl>
      </section>
      {canManage ? <AppointmentDetailActions appointmentId={appointment.id} slots={slots} /> : null}
    </div>
  );
}
