import type { Metadata } from "next";
import { Suspense } from "react";
import AuthCard from "@/components/auth/AuthCard";
import {
  PasswordRecoveryForm,
  SetNewPasswordForm,
} from "@/components/auth/AuthForms";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
  description: "Solicita un enlace seguro para recuperar tu contraseña.",
};

async function RecoveryContent({
  searchParams,
}: {
  searchParams: Promise<{ actualizar?: string | string[] }>;
}) {
  const { actualizar } = await searchParams;
  const isUpdatingPassword = actualizar === "1";
  return (
    <AuthCard
      eyebrow="Seguridad de cuenta"
      title={isUpdatingPassword ? "Define una contraseña nueva" : "Recuperar contraseña"}
      description={
        isUpdatingPassword
          ? "Elige una contraseña nueva para completar la recuperación."
          : "Te enviaremos un enlace si existe una cuenta con el correo indicado."
      }
    >
      {isUpdatingPassword ? <SetNewPasswordForm /> : <PasswordRecoveryForm />}
    </AuthCard>
  );
}

export default function PasswordRecoveryPage({
  searchParams,
}: {
  searchParams: Promise<{ actualizar?: string | string[] }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 px-4 py-16 text-center text-slate-300 sm:px-6 sm:py-24">
          Cargando recuperación…
        </main>
      }
    >
      <RecoveryContent searchParams={searchParams} />
    </Suspense>
  );
}
