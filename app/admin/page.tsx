import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/identity";

export const metadata: Metadata = {
  
  title: "Administración",
  description: "Resumen de contenido y actividad del sitio.",
};

const dashboardCards = [
  { key: "services", label: "Servicios", href: "/admin/servicios" },
  { key: "projects", label: "Proyectos", href: "/admin/proyectos" },
  { key: "requests", label: "Solicitudes", href: "/admin/solicitudes" },
  { key: "messages", label: "Mensajes nuevos", href: "/admin/mensajes" },
  { key: "users", label: "Usuarios", href: "/admin/usuarios" },
  { key: "testimonials", label: "Testimonios", href: "/admin/testimonios" },
] as const;

async function AdminDashboardContent() {
  const { supabase } = await requireAdmin();
  const [services, projects, requests, messages, users, testimonials] =
    await Promise.all([
      supabase.from("services").select("id", { count: "exact", head: true }),
      supabase.from("projects").select("id", { count: "exact", head: true }),
      supabase.from("service_requests").select("id", { count: "exact", head: true }),
      supabase
        .from("contact_messages")
        .select("id", { count: "exact", head: true })
        .eq("status", "NUEVO"),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("testimonials").select("id", { count: "exact", head: true }),
    ]);
  const results = { services, projects, requests, messages, users, testimonials };
  const hasError = Object.values(results).some((result) => result.error);
  const counts = {
    services: services.count,
    projects: projects.count,
    requests: requests.count,
    messages: messages.count,
    users: users.count,
    testimonials: testimonials.count,
  };

  return (
    <main>
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">
          Panel
        </p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Resumen general</h1>
        <p className="mt-3 text-slate-400">
          Actividad y contenido consultados desde la base de datos.
        </p>
      </header>
      {hasError ? (
        <p
          className="mt-8 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-200"
          role="alert"
        >
          No fue posible cargar todas las métricas. Comprueba las políticas
          administrativas de las tablas correspondientes; los valores faltantes
          no se muestran como cero.
        </p>
      ) : null}
      <section
        aria-label="Métricas del sitio"
        className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        {dashboardCards.map((card) => (
          <Link
            key={card.key}
            href={card.href}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-cyan-300/40 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            <p className="text-sm text-slate-400">{card.label}</p>
            <p className="mt-3 text-3xl font-bold text-white">
              {counts[card.key] ?? "—"}
            </p>
            <p className="mt-3 text-sm font-medium text-cyan-300">
              Administrar <span aria-hidden="true">→</span>
            </p>
          </Link>
        ))}
      </section>
      <p className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm leading-6 text-slate-400">
        Las acciones administrativas vuelven a comprobar el rol en servidor y
        están sujetas a RLS. El rol nunca se toma de parámetros del navegador.
      </p>
    </main>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <p className="py-20 text-center text-slate-400" aria-busy="true">
          Cargando métricas…
        </p>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}
