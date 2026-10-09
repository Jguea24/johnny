import type { Metadata } from "next";
import { Suspense } from "react";
import AuthCard from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/AuthForms";

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
  const callbackFailed = error === "callback";
  return (
    <AuthCard
      eyebrow="Tu espacio"
      title="Iniciar sesión"
      description="Accede a tu perfil y consulta tu información."
    >
      {callbackFailed ? (
        <p
          className="mb-5 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200"
          role="alert"
        >
          No se pudo verificar el enlace. Solicita uno nuevo o vuelve a iniciar
          sesión.
        </p>
      ) : null}
      <LoginForm nextPath={typeof next === "string" ? next : undefined} />
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
        <main className="min-h-screen bg-slate-950 px-6 py-24 text-center text-slate-300">
          Cargando acceso…
        </main>
      }
    >
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}
