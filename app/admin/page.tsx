import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/identity";

export const metadata: Metadata = {
  
  title: "Administración",
  description: "Resumen de contenido y actividad del sitio.",
};

const dashboardCards = [
  { key: "services", label: "Servicios", href: "/admin/servicios", color: "text-cyan-200 bg-cyan-300/10" },
  { key: "projects", label: "Proyectos", href: "/admin/proyectos", color: "text-sky-200 bg-sky-300/10" },
  { key: "requests", label: "Solicitudes pendientes", href: "/admin/solicitudes", color: "text-amber-200 bg-amber-300/10" },
  { key: "messages", label: "Mensajes nuevos", href: "/admin/mensajes", color: "text-rose-200 bg-rose-300/10" },
  { key: "users", label: "Usuarios", href: "/admin/usuarios", color: "text-indigo-200 bg-indigo-300/10" },
  { key: "testimonials", label: "Testimonios", href: "/admin/testimonios", color: "text-violet-200 bg-violet-300/10" },
] as const;

const dashboardIconPaths = {
  services: "M14.7 6.3a5 5 0 0 0-6.4 6.4L3 18l3 3 5.3-5.3a5 5 0 0 0 6.4-6.4L14 13l-3-3z",
  projects: "M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  requests: "M8 4h8 M9 3h6v3H9z M6 5H4v16h16V5h-2 M8 12h8 M8 16h8",
  messages: "M21 11.5a8.5 8.5 0 0 1-12.8 7.3L3 20l1.2-4.1A8.5 8.5 0 1 1 21 11.5z",
  users: "M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 8v6 M23 11h-6",
  testimonials: "m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z",
} as const;

async function AdminDashboardContent() {
  const { supabase } = await requireAdmin();
  const [services, projects, requests, messages, users, testimonials] =
    await Promise.all([
      supabase.from("services").select("id", { count: "exact", head: true }),
      supabase.from("projects").select("id", { count: "exact", head: true }),
      supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("status", "PENDIENTE"),
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
    <main className="space-y-8">
      <header>
        <p className="section-eyebrow">Panel de administración</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Resumen general</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
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
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        {dashboardCards.map((card) => (
          <Link
            key={card.key}
            href={card.href}
            className="surface-card group relative flex min-h-44 flex-col overflow-hidden p-5 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300/35 hover:bg-cyan-300/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 motion-reduce:transform-none motion-reduce:transition-none sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm font-medium text-slate-300">{card.label}</p>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.color}`}>
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d={dashboardIconPaths[card.key]} />
                </svg>
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold tabular-nums tracking-tight text-white sm:text-4xl">
              {counts[card.key] ?? "—"}
            </p>
            <p className="mt-auto flex items-center gap-2 pt-4 text-sm font-medium text-cyan-300">
              Abrir sección <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
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
        <div className="space-y-6 py-4" aria-busy="true" aria-label="Cargando resumen administrativo">
          <div className="h-20 max-w-xl animate-pulse rounded-xl bg-white/[0.04] motion-reduce:animate-none" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="surface-card h-44 animate-pulse bg-white/[0.03] motion-reduce:animate-none" />
            ))}
          </div>
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}
