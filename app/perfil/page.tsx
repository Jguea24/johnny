import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import ProfileForm from "@/components/auth/ProfileForm";
import AuthCard from "@/components/auth/AuthCard";
import { signOutAction } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Mi perfil",
  description: "Consulta y actualiza la información de tu perfil.",
};

async function ProfileContent() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || typeof userId !== "string") {
    redirect("/login?next=%2Fperfil");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id,full_name,email,phone,avatar_url,role")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile) {
    return (
      <AuthCard
        eyebrow="Perfil"
        title="No se pudo cargar tu perfil"
        description="El perfil se crea automáticamente al registrar la cuenta mediante el trigger de Auth. No se crea desde el navegador."
      >
        <p className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-200" role="alert">
          {error
            ? "La consulta fue bloqueada o falló. Revisa la política profiles_read_own_or_admin para permitir la lectura de la fila cuyo id coincide con auth.uid()."
            : "No se encontró el perfil asociado. Revisa el trigger on_auth_user_created y la sincronización del esquema."}
        </p>
        <Link
          href="/"
          className="mt-5 inline-block font-semibold text-cyan-300 hover:text-cyan-200"
        >
          Volver al inicio
        </Link>
      </AuthCard>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl">
        <header className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <Link href="/" className="text-sm text-cyan-300 hover:text-cyan-200">
              ← Inicio
            </Link>
            <p className="mt-8 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">
              Cuenta
            </p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Mi perfil</h1>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="min-h-11 rounded-xl border border-white/15 px-4 text-sm font-medium text-slate-200 transition hover:border-white/30 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              Cerrar sesión
            </button>
          </form>
        </header>
        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <p className="text-sm text-slate-400">Correo de la cuenta</p>
              <p className="mt-1 font-medium text-white">{profile.email}</p>
            </div>
            <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200">
              {profile.role === "ADMIN" ? "Administrador" : "Usuario"}
            </span>
          </div>
          <ProfileForm
            fullName={profile.full_name ?? ""}
            phone={profile.phone ?? ""}
            avatarUrl={profile.avatar_url ?? ""}
          />
        </section>
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <main
          className="min-h-screen bg-slate-950 px-6 py-24 text-center text-slate-300"
          aria-busy="true"
        >
          Cargando perfil…
        </main>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
