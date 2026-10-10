import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import AuthCard from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/AuthForms";
import { getAuthenticatedProfileRole } from "@/lib/auth/identity";
import {
  getAuthenticatedDestination,
  getSafeNextPath,
} from "@/lib/auth/redirects";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  description: "Accede a tu perfil de Johnny.",
};

async function LoginContent({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string | string[];
    error?: string | string[];
  }>;
}) {
  const { next, error } = await searchParams;
  const identity = await getAuthenticatedProfileRole();
  const nextPath = getSafeNextPath(typeof next === "string" ? next : null);
  if (identity.status === "authenticated") {
    redirect(getAuthenticatedDestination(identity.role, nextPath));
  }

  const errorCode = typeof error === "string" ? error : null;
  return (
    <AuthCard
      eyebrow="Tu espacio"
      title="Iniciar sesión"
      description="Accede a tu perfil y consulta tu información."
    >
      {errorCode === "callback" ? (
        <p
          className="mb-5 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200"
          role="alert"
        >
          No se pudo verificar el enlace. Solicita uno nuevo o vuelve a iniciar
          sesión.
        </p>
      ) : null}
      {errorCode === "auth-required" ? (
        <p
          className="mb-5 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100"
          role="status"
        >
          Inicia sesión para acceder al panel administrativo.
        </p>
      ) : null}
      {errorCode === "role" ||
      errorCode === "profile" ||
      identity.status === "profile-missing" ||
      identity.status === "profile-error" ? (
        <p
          className="mb-5 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200"
          role="alert"
        >
          No se pudo comprobar el perfil o el rol de tu cuenta. Comprueba que
          tu perfil exista y vuelve a intentarlo.
        </p>
      ) : null}
      {errorCode === "session" ||
      identity.status === "claims-error" ? (
        <p
          className="mb-5 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200"
          role="alert"
        >
          No se pudo verificar la sesión. Inténtalo nuevamente más tarde.
        </p>
      ) : null}
      {errorCode === "connection" ||
      identity.status === "connection-error" ? (
        <p
          className="mb-5 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200"
          role="alert"
        >
          El servicio de autenticación no está disponible temporalmente.
          Inténtalo más tarde.
        </p>
      ) : null}
      <LoginForm nextPath={nextPath ?? undefined} />
    </AuthCard>
  );
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string | string[];
    error?: string | string[];
  }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 px-4 py-16 text-center text-slate-300 sm:px-6 sm:py-24">
          Cargando acceso…
        </main>
      }
    >
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}
