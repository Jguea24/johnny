import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/identity";


export const metadata: Metadata = {
  
  title: "Administración",
  description: "Resumen de contenido y actividad del sitio.",
};

const dashboardCards = [
  { key: "pendingAppointments", label: "Citas pendientes", href: "/admin/citas", caption: "Por confirmar", color: "from-blue-500 to-blue-700", iconColor: "bg-white/15" },
  { key: "confirmedAppointments", label: "Citas confirmadas", href: "/admin/citas", caption: "Confirmadas", color: "from-emerald-500 to-emerald-700", iconColor: "bg-white/15" },
  { key: "users", label: "Usuarios", href: "/admin/usuarios", caption: "Registrados", color: "from-violet-500 to-indigo-700", iconColor: "bg-white/15" },
  { key: "services", label: "Servicios activos", href: "/admin/servicios", caption: "En catálogo", color: "from-amber-500 to-orange-600", iconColor: "bg-white/15" },
] as const;

const dashboardIconPaths = {
  pendingAppointments: "M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2z M8 14h.01 M12 14h.01 M16 14h.01",
  confirmedAppointments: "m5 12 4 4L19 6",
  users: "M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 8v6 M23 11h-6",
  services: "M14.7 6.3a5 5 0 0 0-6.4 6.4L3 18l3 3 5.3-5.3a5 5 0 0 0 6.4-6.4L14 13l-3-3z",
} as const;

async function AdminDashboardContent() {
  const { supabase, profile } = await requireAdmin();
  const [services, projects, requests, pendingAppointments, confirmedAppointments, messages, users, testimonials, upcomingAppointments, recentRequests] =
    await Promise.all([
      supabase.from("services").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
      supabase.from("projects").select("id", { count: "exact", head: true }),
      supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("status", "PENDIENTE"),
      supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
      supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "CONFIRMED"),
      supabase
        .from("contact_messages")
        .select("id", { count: "exact", head: true })
        .eq("status", "NUEVO"),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("testimonials").select("id", { count: "exact", head: true }),
      supabase
        .from("appointments")
        .select("id,service_title,starts_at,ends_at,time_zone,status,customer_name")
        .in("status", ["PENDING", "CONFIRMED"])
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(4),
      supabase
        .from("service_requests")
        .select("id,name,description,status,created_at")
        .order("created_at", { ascending: false })
        .limit(4),
    ]);
  const results = { services, projects, requests, pendingAppointments, confirmedAppointments, messages, users, testimonials, upcomingAppointments, recentRequests };
  const hasError = Object.values(results).some((result) => result.error);
  const counts = {
    services: services.count,
    pendingAppointments: pendingAppointments.count,
    confirmedAppointments: confirmedAppointments.count,
    users: users.count,
  };
  const firstName = profile.full_name?.trim().split(/\s+/)[0] || "administrador";
  const dateLabel = new Intl.DateTimeFormat("es-EC", { weekday: "short", day: "2-digit", month: "short", timeZone: "America/Guayaquil" });
  const timeLabel = new Intl.DateTimeFormat("es-EC", { hour: "2-digit", minute: "2-digit", timeZone: "America/Guayaquil" });

  return (
    <main className="space-y-6">
      <header className="admin-welcome relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#08234b] via-blue-800 to-blue-600 p-6 text-white shadow-xl shadow-blue-950/10 sm:p-8">
        <p className="section-eyebrow">Panel de administración</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">¡Hola, {firstName}!</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100/75 sm:text-base">
          Gestiona tus citas, servicios y clientes desde un solo lugar.
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
          className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4"
      >
        {dashboardCards.map((card) => (
          <Link
            key={card.key}
            href={card.href}
            className={`admin-stat-card group relative flex min-h-36 flex-col overflow-hidden rounded-2xl bg-gradient-to-br ${card.color} p-5 text-white shadow-lg transition duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 motion-reduce:transform-none motion-reduce:transition-none sm:p-6`}
          >
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm font-medium text-slate-300">{card.label}</p>
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${card.iconColor}`}>
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
      <section className="grid gap-5 xl:grid-cols-[1.5fr_0.9fr]" aria-label="Agenda y accesos rápidos">
        <div className="admin-panel-card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Agenda</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">Próximas citas</h2>
            </div>
            <Link href="/admin/citas" className="text-sm font-semibold text-blue-700 hover:text-blue-900">Ver agenda →</Link>
          </div>
          {upcomingAppointments.data?.length ? (
            <div className="divide-y divide-slate-100">
              {upcomingAppointments.data.map((appointment) => (
                <div key={appointment.id} className="flex items-center gap-3 py-3 first:pt-1 last:pb-1">
                  <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-blue-50 text-center text-blue-700">
                    <span className="text-[10px] font-bold uppercase">{dateLabel.format(new Date(appointment.starts_at)).split(" ")[0]}</span>
                    <span className="text-lg font-extrabold leading-5">{new Intl.DateTimeFormat("es-EC", { day: "2-digit", timeZone: appointment.time_zone }).format(new Date(appointment.starts_at))}</span>
                    <span className="text-[10px] capitalize">{new Intl.DateTimeFormat("es-EC", { month: "short", timeZone: appointment.time_zone }).format(new Date(appointment.starts_at))}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{appointment.service_title}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{appointment.customer_name} · {timeLabel.format(new Date(appointment.starts_at))}–{timeLabel.format(new Date(appointment.ends_at))}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${appointment.status === "CONFIRMED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {appointment.status === "CONFIRMED" ? "Confirmada" : "Pendiente"}
                  </span>
                </div>
              ))}
            </div>
          ) : <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No hay citas próximas por mostrar.</p>}
        </div>

        <div className="admin-panel-card p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Atajos</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">Acciones rápidas</h2>
          <div className="mt-4 grid gap-2">
            {[
              { href: "/admin/citas", label: "Gestionar citas", icon: "▦" },
              { href: "/admin/usuarios", label: "Ver usuarios", icon: "♙" },
              { href: "/admin/servicios", label: "Administrar servicios", icon: "◇" },
              { href: "/admin/solicitudes", label: "Revisar solicitudes", icon: "☷" },
            ].map((action) => (
              <Link key={action.href} href={action.href} className="flex min-h-11 items-center gap-3 rounded-xl bg-blue-50 px-3 text-sm font-semibold text-slate-800 transition hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-lg text-blue-700 shadow-sm" aria-hidden="true">{action.icon}</span>
                {action.label}<span className="ml-auto text-blue-700" aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="admin-panel-card p-5 sm:p-6" aria-labelledby="recent-requests-heading">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Seguimiento</p>
            <h2 id="recent-requests-heading" className="mt-1 text-xl font-bold text-slate-900">Solicitudes recientes</h2>
          </div>
          <Link href="/admin/solicitudes" className="text-sm font-semibold text-blue-700 hover:text-blue-900">Ver todas →</Link>
        </div>
        {recentRequests.data?.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {recentRequests.data.map((request) => (
              <article key={request.id} className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">{request.name.slice(0, 1).toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="truncate text-sm font-bold text-slate-900">{request.name}</h3>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">{request.status.replaceAll("_", " ")}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{request.description}</p>
                </div>
              </article>
            ))}
          </div>
        ) : <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">Todavía no hay solicitudes registradas.</p>}
      </section>
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
