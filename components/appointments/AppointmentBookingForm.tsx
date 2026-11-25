"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createAppointmentAction } from "@/lib/appointments/actions";
import type { AppointmentActionState } from "@/lib/appointments/actions";

export type AppointmentServiceOption = {
  id: string;
  title: string;
};

export type AppointmentSlotOption = {
  id: string;
  service_id: string;
  starts_at: string;
  ends_at: string;
  time_zone: string;
};

function slotLabel(slot: AppointmentSlotOption) {
  const formatter = new Intl.DateTimeFormat("es", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: slot.time_zone,
  });
  return `${formatter.format(new Date(slot.starts_at))} · ${slot.time_zone}`;
}

export default function AppointmentBookingForm({
  services,
  slots,
  customer,
}: {
  services: AppointmentServiceOption[];
  slots: AppointmentSlotOption[];
  customer: { name: string; email: string; phone: string };
}) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const router = useRouter();
  const [state, action, pending] = useActionState<AppointmentActionState, FormData>(
    createAppointmentAction,
    {},
  );
  useEffect(() => {
    if (state.appointmentId) {
      const timeout = window.setTimeout(
        () => router.push(`/citas/${state.appointmentId}`),
        state.notificationWarning ? 4500 : 2200,
      );
      return () => window.clearTimeout(timeout);
    }
  }, [router, state.appointmentId, state.notificationWarning]);
  const serviceSlots = slots.filter((slot) => slot.service_id === serviceId);

  if (services.length === 0) {
    return (
      <p className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm leading-6 text-slate-300">
        No hay servicios activos disponibles para agendar.
      </p>
    );
  }

  return (
    <div className="surface-card p-5 sm:p-7">
      {slots.length === 0 ? (
        <p className="mb-5 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm leading-6 text-amber-100">
          Aún no hay horarios publicados. Vuelve a consultar más tarde; no se
          muestran horarios estimados.
        </p>
      ) : null}
      <form action={action} className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="appointment-service" className="mb-2 block text-sm font-medium text-slate-200">
            Servicio
          </label>
          <select
            id="appointment-service"
            name="service_id"
            required
            value={serviceId}
            onChange={(event) => setServiceId(event.target.value)}
            className="field-control"
          >
            {services.map((service) => (
              <option key={service.id} value={service.id}>{service.title}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="appointment-slot" className="mb-2 block text-sm font-medium text-slate-200">
            Fecha y hora disponibles
          </label>
          <select
            id="appointment-slot"
            name="slot_id"
            required
            disabled={serviceSlots.length === 0}
            className="field-control"
            defaultValue=""
          >
            <option value="" disabled>Selecciona un horario</option>
            {serviceSlots.map((slot) => (
              <option key={slot.id} value={slot.id}>{slotLabel(slot)}</option>
            ))}
          </select>
          {serviceSlots.length === 0 ? (
            <p className="mt-2 text-xs text-slate-400">No hay horarios publicados para este servicio.</p>
          ) : null}
        </div>
        <div>
          <label htmlFor="appointment-name" className="mb-2 block text-sm font-medium text-slate-200">
            Nombre de contacto
          </label>
          <input
            id="appointment-name"
            name="customer_name"
            required
            maxLength={120}
            defaultValue={customer.name}
            autoComplete="name"
            className="field-control"
          />
        </div>
        <div>
          <label htmlFor="appointment-email" className="mb-2 block text-sm font-medium text-slate-200">
            Correo de contacto
          </label>
          <input
            id="appointment-email"
            name="customer_email"
            type="email"
            required
            maxLength={254}
            defaultValue={customer.email}
            autoComplete="email"
            className="field-control"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="appointment-phone" className="mb-2 block text-sm font-medium text-slate-200">
            Teléfono (opcional)
          </label>
          <input
            id="appointment-phone"
            name="customer_phone"
            type="tel"
            maxLength={40}
            defaultValue={customer.phone}
            autoComplete="tel"
            className="field-control"
          />
        </div>
        {state.error ? (
          <p className="sm:col-span-2 rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200" role="alert">
            {state.error}
          </p>
        ) : null}
        {state.success && state.appointmentId ? (
          <div className="sm:col-span-2 rounded-lg border border-emerald-300/25 bg-emerald-300/[0.07] p-4 text-sm text-emerald-100">
            <p role="status">{state.success}</p>
            {state.notificationWarning ? (
              <p className="mt-2 rounded-md border border-amber-300/20 bg-amber-300/[0.08] p-3 text-amber-100" role="alert">
                {state.notificationWarning}
              </p>
            ) : null}
            <Link className="mt-2 inline-block font-semibold underline underline-offset-4" href={`/citas/${state.appointmentId}`}>
              Ver detalle de la cita
            </Link>
          </div>
        ) : null}
        <button
          type="submit"
          disabled={pending || slots.length === 0}
          className="button-primary min-h-12 sm:col-span-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Solicitar cita"}
        </button>
      </form>
    </div>
  );
}
