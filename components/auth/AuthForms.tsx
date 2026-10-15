"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  requestPasswordResetAction,
  signInAction,
  signUpAction,
  updatePasswordAction,
  type AuthActionState,
} from "@/lib/auth/actions";

const initialState: AuthActionState = {};

function FormFeedback({ state }: { state: AuthActionState }) {
  if (!state.error && !state.success) return null;
  return (
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
  );
}

function FormField({
  id,
  label,
  type = "text",
  autoComplete,
  required = true,
}: {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-slate-200">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        required={required}
        className="field-control"
      />
    </div>
  );
}

function SubmitButton({
  children,
  disabled,
}: {
  children: string;
  disabled: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="button-primary w-full"
    >
      {children}
    </button>
  );
}

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const [state, action, pending] = useActionState(signInAction, initialState);
  return (
    <form action={action} className="space-y-5">
      {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
      <FormField id="email" label="Correo electrónico" type="email" autoComplete="email" />
      <FormField
        id="password"
        label="Contraseña"
        type="password"
        autoComplete="current-password"
      />
      <FormFeedback state={state} />
      <SubmitButton disabled={pending}>
        {pending ? "Iniciando sesión…" : "Iniciar sesión"}
      </SubmitButton>
      <div className="flex flex-wrap justify-between gap-3 text-sm">
        <Link
          href="/recuperar-contrasena"
          className="text-cyan-300 hover:text-cyan-200"
        >
          ¿Olvidaste tu contraseña?
        </Link>
        <Link href="/registro" className="text-slate-300 hover:text-white">
          Crear cuenta
        </Link>
      </div>
    </form>
  );
}

export function RegistrationForm() {
  const [state, action, pending] = useActionState(signUpAction, initialState);
  return (
    <form action={action} className="space-y-5">
      <FormField id="full_name" label="Nombre completo" autoComplete="name" />
      <FormField id="email" label="Correo electrónico" type="email" autoComplete="email" />
      <FormField
        id="password"
        label="Contraseña (mínimo 8 caracteres)"
        type="password"
        autoComplete="new-password"
      />
      <FormField
        id="password_confirm"
        label="Confirmar contraseña"
        type="password"
        autoComplete="new-password"
      />
      <FormFeedback state={state} />
      <SubmitButton disabled={pending}>
        {pending ? "Creando cuenta…" : "Crear cuenta"}
      </SubmitButton>
      <p className="text-center text-sm text-slate-400">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-cyan-300 hover:text-cyan-200">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}

export function PasswordRecoveryForm() {
  const [state, action, pending] = useActionState(
    requestPasswordResetAction,
    initialState,
  );
  return (
    <form action={action} className="space-y-5">
      <FormField id="email" label="Correo electrónico" type="email" autoComplete="email" />
      <FormFeedback state={state} />
      <SubmitButton disabled={pending}>
        {pending ? "Enviando solicitud…" : "Enviar enlace de recuperación"}
      </SubmitButton>
      <Link href="/login" className="block text-center text-sm text-cyan-300 hover:text-cyan-200">
        Volver a iniciar sesión
      </Link>
    </form>
  );
}

export function SetNewPasswordForm() {
  const [state, action, pending] = useActionState(
    updatePasswordAction,
    initialState,
  );
  return (
    <form action={action} className="space-y-5">
      <FormField
        id="password"
        label="Nueva contraseña (mínimo 8 caracteres)"
        type="password"
        autoComplete="new-password"
      />
      <FormFeedback state={state} />
      <SubmitButton disabled={pending}>
        {pending ? "Actualizando contraseña…" : "Guardar contraseña nueva"}
      </SubmitButton>
    </form>
  );
}
