"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  createServiceRequestAction,
  type AuthActionState,
} from "@/lib/auth/actions";

const initialState: AuthActionState = {};
const inputClass = "field-control";

export default function ServiceRequestForm({
  serviceId,
  serviceTitle,
}: {
  serviceId: string;
  serviceTitle: string;
}) {
  const [state, action, pending] = useActionState(
    createServiceRequestAction,
    initialState,
  );
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="service_id" value={serviceId} />
      <p className="text-sm text-slate-400">
        Solicitud para <span className="font-medium text-white">{serviceTitle}</span>
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="request-name" className="mb-2 block text-sm font-medium text-slate-200">
            Nombre completo *
          </label>
          <input
            id="request-name"
            name="name"
            required
            minLength={2}
            maxLength={120}
            autoComplete="name"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="request-email" className="mb-2 block text-sm font-medium text-slate-200">
            Correo electrónico *
          </label>
          <input
            id="request-email"
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            className={inputClass}
          />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="request-phone" className="mb-2 block text-sm font-medium text-slate-200">
            Teléfono
          </label>
          <input
            id="request-phone"
            name="phone"
            type="tel"
            maxLength={40}
            autoComplete="tel"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="request-company" className="mb-2 block text-sm font-medium text-slate-200">
            Empresa
          </label>
          <input
            id="request-company"
            name="company"
            maxLength={160}
            autoComplete="organization"
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label htmlFor="request-description" className="mb-2 block text-sm font-medium text-slate-200">
          Describe lo que necesitas *
        </label>
        <textarea
          id="request-description"
          name="description"
          required
          minLength={20}
          maxLength={5000}
          rows={5}
          className={`${inputClass} resize-y py-3`}
        />
      </div>
      <div>
        <label htmlFor="request-budget" className="mb-2 block text-sm font-medium text-slate-200">
          Presupuesto aproximado <span className="text-slate-500">(opcional)</span>
        </label>
        <input
          id="request-budget"
          name="budget"
          type="number"
          min="0"
          max="9999999999.99"
          step="0.01"
          className={inputClass}
        />
      </div>
      {state.error || state.success ? (
        <p
          className={`rounded-xl border px-4 py-3 text-sm ${
            state.error
              ? "border-rose-400/30 bg-rose-400/10 text-rose-200"
              : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
          }`}
          role={state.error ? "alert" : "status"}
          aria-live="polite"
        >
          {state.error || state.success}
          {state.error?.includes("Inicia sesión") ? (
            <>
              {" "}
              <Link
                href="/login?next=%2Fmis-solicitudes"
                className="font-semibold underline"
              >
                Iniciar sesión
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="button-primary w-full sm:w-auto"
      >
        {pending ? "Enviando solicitud…" : "Enviar solicitud"}
      </button>
    </form>
  );
}
