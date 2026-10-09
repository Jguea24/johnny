"use client";

import { useActionState } from "react";
import {
  updateProfileAction,
  type AuthActionState,
} from "@/lib/auth/actions";

const initialState: AuthActionState = {};

export default function ProfileForm({
  fullName,
  phone,
  avatarUrl,
}: {
  fullName: string;
  phone: string;
  avatarUrl: string;
}) {
  const [state, action, pending] = useActionState(
    updateProfileAction,
    initialState,
  );
  return (
    <form action={action} className="space-y-5">
      <div>
        <label
          htmlFor="full_name"
          className="mb-2 block text-sm font-medium text-slate-200"
        >
          Nombre completo
        </label>
        <input
          id="full_name"
          name="full_name"
          required
          maxLength={120}
          defaultValue={fullName}
          autoComplete="name"
          className="min-h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 text-white outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        />
      </div>
      <div>
        <label
          htmlFor="phone"
          className="mb-2 block text-sm font-medium text-slate-200"
        >
          Teléfono <span className="text-slate-500">(opcional)</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          maxLength={40}
          defaultValue={phone}
          autoComplete="tel"
          className="min-h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 text-white outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        />
      </div>
      <div>
        <label
          htmlFor="avatar_url"
          className="mb-2 block text-sm font-medium text-slate-200"
        >
          URL de imagen de perfil <span className="text-slate-500">(opcional)</span>
        </label>
        <input
          id="avatar_url"
          name="avatar_url"
          type="url"
          maxLength={2048}
          defaultValue={avatarUrl}
          autoComplete="url"
          className="min-h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 text-white outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
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
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="min-h-12 rounded-xl bg-cyan-400 px-6 font-semibold text-slate-950 transition hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
