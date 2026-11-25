"use client";

import { useActionState, useState, type FormEvent } from "react";
import {
  createAppointmentSlotsForDateRangeAction,
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
    createAppointmentSlotsForDateRangeAction,
    {},
  );
  const timeZone = "America/Guayaquil";
  const [selectedDays, setSelectedDays] = useState(["1", "2", "3", "4", "5", "6"]);
  const activeServices = services.filter((service) => service.status === "ACTIVE");
  const weekdays = [
    { value: "1", label: "Lun" },
    { value: "2", label: "Mar" },
    { value: "3", label: "Mié" },
    { value: "4", label: "Jue" },
    { value: "5", label: "Vie" },
    { value: "6", label: "Sáb" },
    { value: "0", label: "Dom" },
  ];

  function toggleDay(day: string) {
    setSelectedDays((current) =>
      current.includes(day) ? current.filter((value) => value !== day) : [...current, day],
    );
  }

  function prepareSchedule(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const startDateValue = (form.elements.namedItem("start_date") as HTMLInputElement).value;
    const endDateValue = (form.elements.namedItem("end_date") as HTMLInputElement).value;
    const startTimeValue = (form.elements.namedItem("start_time") as HTMLInputElement).value;
    const endTimeValue = (form.elements.namedItem("end_time") as HTMLInputElement).value;
    const days = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="weekday"]:checked'))
      .map((input) => input.value);
    const [startHour, startMinute] = startTimeValue.split(":").map(Number);
    const [endHour, endMinute] = endTimeValue.split(":").map(Number);
    const firstDay = new Date(`${startDateValue}T12:00:00Z`);
    const lastDay = new Date(`${endDateValue}T12:00:00Z`);
    const dayCount = Math.floor((lastDay.getTime() - firstDay.getTime()) / 86400000);
    const slots: { starts_at: string; ends_at: string }[] = [];

    for (let dayOffset = 0; dayOffset <= dayCount; dayOffset += 1) {
      const day = new Date(firstDay);
      day.setUTCDate(firstDay.getUTCDate() + dayOffset);
      if (!days.includes(String(day.getUTCDay()))) continue;

      for (let minuteOfDay = startHour * 60 + startMinute;
        minuteOfDay + 60 <= endHour * 60 + endMinute;
        minuteOfDay += 60) {
        const dateValue = [
          day.getUTCFullYear(),
          String(day.getUTCMonth() + 1).padStart(2, "0"),
          String(day.getUTCDate()).padStart(2, "0"),
        ].join("-");
        const timeValue = `${String(Math.floor(minuteOfDay / 60)).padStart(2, "0")}:${String(minuteOfDay % 60).padStart(2, "0")}`;
        const startsAt = new Date(`${dateValue}T${timeValue}:00-05:00`);
        const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
        if (startsAt.getTime() <= Date.now()) continue;
        slots.push({ starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString() });
      }
    }

    (form.elements.namedItem("slots_json") as HTMLInputElement).value = JSON.stringify(slots);
    (form.elements.namedItem("time_zone") as HTMLInputElement).value = timeZone;
  }

  return (
    <form action={action} onSubmit={prepareSchedule} className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:grid-cols-2 sm:p-5">
      <input type="hidden" name="time_zone" value={timeZone} readOnly />
      <input type="hidden" name="slots_json" value="[]" readOnly />
      <div className="sm:col-span-2">
        <label htmlFor="slot-service" className="mb-2 block text-sm font-medium text-slate-200">Servicio activo</label>
        <select id="slot-service" name="service_id" required disabled={!activeServices.length} className="field-control" defaultValue="">
          <option value="" disabled>Selecciona un servicio</option>
          {activeServices.map((service) => <option key={service.id} value={service.id}>{service.title}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="slot-start-date" className="mb-2 block text-sm font-medium text-slate-200">Fecha desde</label>
        <input id="slot-start-date" name="start_date" type="date" required className="field-control" />
      </div>
      <div>
        <label htmlFor="slot-end-date" className="mb-2 block text-sm font-medium text-slate-200">Fecha hasta</label>
        <input id="slot-end-date" name="end_date" type="date" required className="field-control" />
      </div>
      <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm text-slate-300 sm:col-span-2">
        <input type="checkbox" name="replace_outside_range" defaultChecked className="mt-1 accent-cyan-300" />
        <span>Pausar horarios futuros de este servicio fuera del rango. Las reservas existentes se conservan.</span>
      </label>
      <div className="sm:col-span-2">
        <span className="mb-2 block text-sm font-medium text-slate-200">Duración por cita</span>
        <p className="field-control text-slate-200">60 minutos</p>
      </div>
      <fieldset className="sm:col-span-2">
        <legend className="mb-2 text-sm font-medium text-slate-200">Días disponibles</legend>
        <div className="flex flex-wrap gap-2">
          {weekdays.map((day) => {
            const checked = selectedDays.includes(day.value);
            return (
              <label key={day.value} className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm ${checked ? "border-cyan-300/50 bg-cyan-300/10 text-cyan-100" : "border-white/10 text-slate-300"}`}>
                <input type="checkbox" name="weekday" value={day.value} checked={checked} onChange={() => toggleDay(day.value)} className="accent-cyan-300" />
                {day.label}
              </label>
            );
          })}
        </div>
      </fieldset>
      <div>
        <label htmlFor="slot-start-time" className="mb-2 block text-sm font-medium text-slate-200">Hora de inicio</label>
        <input id="slot-start-time" name="start_time" type="time" required defaultValue="19:00" className="field-control" />
      </div>
      <div>
        <label htmlFor="slot-end-time" className="mb-2 block text-sm font-medium text-slate-200">Hora de fin</label>
        <input id="slot-end-time" name="end_time" type="time" required defaultValue="23:00" className="field-control" />
      </div>
      <p className="text-xs text-slate-400 sm:col-span-2">
        Se crearán citas solo dentro del rango indicado, en la zona horaria de Ecuador: {timeZone}.
      </p>
      {state.error ? <p className="text-sm text-rose-200 sm:col-span-2" role="alert">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-200 sm:col-span-2" role="status">{state.success}</p> : null}
      <button type="submit" disabled={pending || !activeServices.length} className="button-primary min-h-11 sm:col-span-2 disabled:opacity-50">
        {pending ? "Publicando…" : "Publicar disponibilidad"}
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
  const reservedSlotIds = new Set(
    appointments
      .filter((appointment) => appointment.status === "PENDING" || appointment.status === "CONFIRMED")
      .map((appointment) => appointment.slot_id),
  );
  const dailyCapacity = new Map<string, {
    label: string;
    timeZone: string;
    slots: Map<number, boolean>;
  }>();

  for (const slot of slots) {
    if (!slot.active) continue;
    const dateKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: slot.time_zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(slot.starts_at));
    const summary = dailyCapacity.get(dateKey) ?? {
      label: new Intl.DateTimeFormat("es-EC", {
        timeZone: slot.time_zone,
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date(slot.starts_at)),
      timeZone: slot.time_zone,
      slots: new Map<number, boolean>(),
    };
    const start = new Date(slot.starts_at).getTime();
    summary.slots.set(start, (summary.slots.get(start) ?? false) || reservedSlotIds.has(slot.id));
    dailyCapacity.set(dateKey, summary);
  }
  const dailyCapacityRows = Array.from(dailyCapacity.entries())
    .map(([date, summary]) => [date, {
      label: summary.label,
      timeZone: summary.timeZone,
      total: summary.slots.size,
      reserved: Array.from(summary.slots.values()).filter(Boolean).length,
    }] as const)
    .sort(([first], [second]) => first.localeCompare(second));

  return (
    <div className="space-y-9">
      <section className="space-y-4" aria-labelledby="new-appointment-slot">
        <div>
          <h2 id="new-appointment-slot" className="text-xl font-semibold text-white">Publicar disponibilidad</h2>
          <p className="mt-1 text-sm text-slate-400">Elige las fechas y los días disponibles; cada fecha tendrá cuatro cupos de una hora.</p>
        </div>
        <CreateSlotForm services={services} />
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Cupos por fecha</h3>
          {dailyCapacityRows.length ? dailyCapacityRows.map(([date, summary]) => (
            <article key={date} className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-medium capitalize text-white">{summary.label}</p>
              <p className="text-sm text-slate-300">
                {summary.total} cupos · {summary.reserved} reservados · {summary.total - summary.reserved} disponibles
                <span className="ml-2 text-xs text-slate-500">{summary.timeZone}</span>
              </p>
            </article>
          )) : <p className="rounded-xl border border-white/10 p-4 text-sm text-slate-400">Elige un rango y publica horarios para ver los cupos por fecha.</p>}
        </div>
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
