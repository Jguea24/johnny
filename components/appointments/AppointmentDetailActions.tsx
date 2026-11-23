"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  cancelAppointmentAction,
  rescheduleAppointmentAction,
  type AppointmentActionState,
} from "@/lib/appointments/actions";
import type { AppointmentSlotOption } from "./AppointmentBookingForm";

function slotLabel(slot: AppointmentSlotOption) {
  const formatter = new Intl.DateTimeFormat("es", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: slot.time_zone,
  });
  return `${formatter.format(new Date(slot.starts_at))} · ${slot.time_zone}`;
}

function RescheduleForm({
  appointmentId,
  slots,
}: {
  appointmentId: string;
  slots: AppointmentSlotOption[];
}) {
  const [state, action, pending] = useActionState<AppointmentActionState, FormData>(
    rescheduleAppointmentAction,
    {},
  );

  if (slots.length === 0) {
    return <p className="text-sm text-slate-400">No hay otros horarios disponibles para este servicio.</p>;
  }

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
      <input type="hidden" name="appointment_id" value={appointmentId} />
      <label className="sr-only" htmlFor="reschedule-slot">Nuevo horario</label>
      <select id="reschedule-slot" name="slot_id" required className="field-control" defaultValue="">
        <option value="" disabled>Elige otro horario</option>
        {slots.map((slot) => (
          <option key={slot.id} value={slot.id}>{slotLabel(slot)}</option>
        ))}
      </select>
      <button type="submit" disabled={pending} className="button-secondary min-h-11 disabled:opacity-50">
        {pending ? "Guardando…" : "Reagendar"}
      </button>
      {state.error ? <p className="text-sm text-rose-200 sm:col-span-2" role="alert">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-200 sm:col-span-2" role="status">{state.success}</p> : null}
    </form>
  );
}

function CancelForm({ appointmentId }: { appointmentId: string }) {
  const [state, action, pending] = useActionState<AppointmentActionState, FormData>(
    cancelAppointmentAction,
    {},
  );

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm("¿Confirmas que deseas cancelar esta cita? El registro permanecerá en tu historial.")) {
          event.preventDefault();
        }
      }}
      className="space-y-3"
    >
      <input type="hidden" name="appointment_id" value={appointmentId} />
      <button type="submit" disabled={pending} className="min-h-11 rounded-lg border border-rose-400/30 px-4 text-sm font-semibold text-rose-200 transition hover:bg-rose-400/10 disabled:opacity-50">
        {pending ? "Cancelando…" : "Cancelar cita"}
      </button>
      {state.error ? <p className="text-sm text-rose-200" role="alert">{state.error}</p> : null}
      {state.success ? (
        <p className="text-sm text-emerald-200" role="status">
          {state.success} <Link href="/citas/mis-citas" className="underline underline-offset-4">Ir a mis citas</Link>
        </p>
      ) : null}
    </form>
  );
}

export default function AppointmentDetailActions({
  appointmentId,
  slots,
}: {
  appointmentId: string;
  slots: AppointmentSlotOption[];
}) {
  return (
    <section className="surface-card space-y-6 p-5 sm:p-7" aria-labelledby="appointment-actions">
      <h2 id="appointment-actions" className="text-xl font-semibold text-white">Gestionar cita</h2>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-200">Reagendar</h3>
        <RescheduleForm appointmentId={appointmentId} slots={slots} />
      </div>
      <div className="border-t border-white/10 pt-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-200">Cancelar</h3>
        <CancelForm appointmentId={appointmentId} />
      </div>
    </section>
  );
}
