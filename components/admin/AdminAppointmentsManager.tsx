"use client";

import { useActionState, useState } from "react";
import {
  createAppointmentSlotAction,
  setAppointmentSlotActiveAction,
  updateAppointmentAsAdminAction,
  type AppointmentActionState,
} from "@/lib/appointments/actions";
import type { AppointmentStatus, ServiceStatus } from "@/types/database";

type ServiceOption = { id: string; title: string; status: ServiceStatus };
type Slot = {
  id: string;
  service_id: string;
  starts_at: string;
  ends_at: string;
  time_zone: string;
  active: boolean;
};
type Appointment = {
  id: string;
  user_id: string;
  service_title: string;
  service_id: string;
  slot_id: string;
  starts_at: string;
  ends_at: string;
  time_zone: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  status: AppointmentStatus;
  created_at: string;
  cancelled_at: string | null;
};

const statusLabels: Record<AppointmentStatus, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
  COMPLETED: "Completada",
};

function formatDate(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("es", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

function CreateSlotForm({ services }: { services: ServiceOption[] }) {
  const [state, action, pending] = useActionState<AppointmentActionState, FormData>(
    createAppointmentSlotAction,
    {},
  );
  const [timeZone, setTimeZone] = useState("UTC");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const activeServices = services.filter((service) => service.status === "ACTIVE");

  function localDateTimeToIso(value: string) {
    const timestamp = new Date(value);
    return value && !Number.isNaN(timestamp.getTime()) ? timestamp.toISOString() : "";
  }

  function updateTimeZone() {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  }

  return (
    <form action={action} className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:grid-cols-2 sm:p-5">
      <input type="hidden" name="time_zone" value={timeZone} />
      <input type="hidden" name="starts_at" value={startsAt} />
      <input type="hidden" name="ends_at" value={endsAt} />
      <div className="sm:col-span-2">
        <label htmlFor="slot-service" className="mb-2 block text-sm font-medium text-slate-200">Servicio activo</label>
        <select id="slot-service" name="service_id" required disabled={!activeServices.length} className="field-control" defaultValue="">
          <option value="" disabled>Selecciona un servicio</option>
          {activeServices.map((service) => <option key={service.id} value={service.id}>{service.title}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="slot-start" className="mb-2 block text-sm font-medium text-slate-200">Inicio</label>
        <input
          id="slot-start"
          type="datetime-local"
          required
          onFocus={updateTimeZone}
          onChange={(event) => {
            updateTimeZone();
            setStartsAt(localDateTimeToIso(event.target.value));
          }}
          className="field-control"
        />
      </div>
      <div>
        <label htmlFor="slot-end" className="mb-2 block text-sm font-medium text-slate-200">Fin</label>
        <input
          id="slot-end"
          type="datetime-local"
          required
          onFocus={updateTimeZone}
          onChange={(event) => {
            updateTimeZone();
            setEndsAt(localDateTimeToIso(event.target.value));
          }}
          className="field-control"
        />
      </div>
      <p className="text-xs text-slate-400 sm:col-span-2">
        Las fechas se guardan como instantes absolutos y se muestran en la zona horaria de tu navegador: {timeZone}.
      </p>
      {state.error ? <p className="text-sm text-rose-200 sm:col-span-2" role="alert">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-200 sm:col-span-2" role="status">{state.success}</p> : null}
      <button type="submit" disabled={pending || !activeServices.length} className="button-primary min-h-11 sm:col-span-2 disabled:opacity-50">
        {pending ? "Publicando…" : "Publicar horario"}
      </button>
      {!activeServices.length ? <p className="text-sm text-amber-200 sm:col-span-2">No hay servicios activos para asociar horarios.</p> : null}
    </form>
  );
}

function SlotActiveForm({ slot }: { slot: Slot }) {
  const [state, action, pending] = useActionState<AppointmentActionState, FormData>(
    setAppointmentSlotActiveAction,
    {},
  );
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="slot_id" value={slot.id} />
      <input type="hidden" name="active" value={String(!slot.active)} />
      <span className={slot.active ? "text-xs text-emerald-200" : "text-xs text-slate-400"}>
        {slot.active ? "Publicado" : "Pausado"}
      </span>
      <button type="submit" disabled={pending} className="min-h-9 rounded-lg border border-white/15 px-3 text-xs font-semibold text-slate-200 hover:border-cyan-300/40 disabled:opacity-50">
        {pending ? "Guardando…" : slot.active ? "Pausar" : "Publicar"}
      </button>
      {state.error ? <span className="text-xs text-rose-200" role="alert">{state.error}</span> : null}
    </form>
  );
}

function AppointmentStatusForm({ appointment }: { appointment: Appointment }) {
  const [state, action, pending] = useActionState<AppointmentActionState, FormData>(
    updateAppointmentAsAdminAction,
    {},
  );
  const options = appointment.status === "PENDING"
    ? [{ value: "CONFIRMED", label: "Confirmada" }, { value: "CANCELLED", label: "Cancelada" }]
    : appointment.status === "CONFIRMED"
      ? [{ value: "COMPLETED", label: "Completada" }, { value: "CANCELLED", label: "Cancelada" }]
      : [];

  if (!options.length) {
    return <span className="text-sm text-slate-400">{statusLabels[appointment.status]}</span>;
  }
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="appointment_id" value={appointment.id} />
      <select name="status" aria-label={`Nuevo estado de ${appointment.customer_name}`} className="field-control min-h-10 min-w-36 text-sm" defaultValue="">
        <option value="" disabled>Actualizar estado</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <button type="submit" disabled={pending} className="button-secondary min-h-10 px-3 text-sm disabled:opacity-50">
        {pending ? "Guardando…" : "Guardar"}
      </button>
      {state.error ? <p className="w-full text-xs text-rose-200" role="alert">{state.error}</p> : null}
      {state.success ? <p className="w-full text-xs text-emerald-200" role="status">{state.success}</p> : null}
    </form>
  );
}

export default function AdminAppointmentsManager({
  services,
  slots,
  appointments,
}: {
  services: ServiceOption[];
  slots: Slot[];
  appointments: Appointment[];
}) {
  const serviceNames = new Map(services.map((service) => [service.id, service.title]));

  return (
    <div className="space-y-9">
      <section className="space-y-4" aria-labelledby="new-appointment-slot">
        <div>
          <h2 id="new-appointment-slot" className="text-xl font-semibold text-white">Publicar disponibilidad</h2>
          <p className="mt-1 text-sm text-slate-400">Cada horario es una opción concreta; no se generan horas automáticamente.</p>
        </div>
        <CreateSlotForm services={services} />
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Horarios futuros</h3>
          {slots.length ? slots.map((slot) => (
            <article key={slot.id} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-white">{serviceNames.get(slot.service_id) ?? "Servicio"}</p>
                <p className="mt-1 text-sm text-slate-400">
                  {formatDate(slot.starts_at, slot.time_zone)} – {formatDate(slot.ends_at, slot.time_zone)} · {slot.time_zone}
                </p>
              </div>
              <SlotActiveForm slot={slot} />
            </article>
          )) : <p className="rounded-xl border border-white/10 p-4 text-sm text-slate-400">No hay horarios futuros registrados.</p>}
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="appointment-reservations">
        <div>
          <h2 id="appointment-reservations" className="text-xl font-semibold text-white">Reservas</h2>
          <p className="mt-1 text-sm text-slate-400">Las citas canceladas se conservan como historial.</p>
        </div>
        {appointments.length ? appointments.map((appointment) => (
          <article key={appointment.id} className="grid gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="min-w-0">
              <h3 className="font-semibold text-white">{appointment.service_title}</h3>
              <p className="mt-1 text-sm text-slate-300">
                {formatDate(appointment.starts_at, appointment.time_zone)} · {appointment.time_zone}
              </p>
              <p className="mt-1 break-words text-sm text-slate-400">
                {appointment.customer_name} · <a href={`mailto:${appointment.customer_email}`} className="hover:text-cyan-200">{appointment.customer_email}</a>
                {appointment.customer_phone ? ` · ${appointment.customer_phone}` : ""}
              </p>
              <p className="mt-1 text-xs text-slate-500">Cuenta: {appointment.user_id} · {statusLabels[appointment.status]}</p>
            </div>
            <AppointmentStatusForm appointment={appointment} />
          </article>
        )) : <p className="rounded-xl border border-white/10 p-5 text-sm text-slate-400">Todavía no hay reservas.</p>}
      </section>
    </div>
  );
}
