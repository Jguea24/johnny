"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type IconName =
  | "overview"
  | "users"
  | "services"
  | "digitalServices"
  | "projects"
  | "team"
  | "carousel"
  | "categories"
  | "requests"
  | "digitalOrders"
  | "messages"
  | "testimonials"
  | "settings";

const groups: { label: string; items: { href: string; label: string; icon: IconName }[] }[] = [
  {
    label: "Resumen",
    items: [{ href: "/admin", label: "Panel general", icon: "overview" }],
  },
  {
    label: "Contenido",
    items: [
      { href: "/admin/usuarios", label: "Usuarios", icon: "users" },
      { href: "/admin/servicios", label: "Servicios", icon: "services" },
      { href: "/admin/servicios-digitales", label: "Servicios digitales", icon: "digitalServices" },
      { href: "/admin/proyectos", label: "Proyectos", icon: "projects" },
      { href: "/admin/equipo", label: "Equipo", icon: "team" },
      { href: "/admin/carrusel", label: "Carrusel", icon: "carousel" },
      { href: "/admin/categorias", label: "Categorías", icon: "categories" },
      { href: "/admin/testimonios", label: "Testimonios", icon: "testimonials" },
    ],
  },
  {
    label: "Operaciones",
    items: [
      { href: "/admin/solicitudes", label: "Solicitudes", icon: "requests" },
      { href: "/admin/pedidos-digitales", label: "Pedidos digitales", icon: "digitalOrders" },
      { href: "/admin/mensajes", label: "Mensajes", icon: "messages" },
    ],
  },
  {
    label: "Sistema",
    items: [{ href: "/admin/configuracion", label: "Configuración", icon: "settings" }],
  },
];

function isCurrent(pathname: string, href: string) {
  return href === "/admin"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

function NavigationIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, string> = {
    overview: "M3 3h7v7H3z M14 3h7v4h-7z M14 10h7v11h-7z M3 14h7v7H3z",
    users: "M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 8v6 M23 11h-6",
    services: "M14.7 6.3a5 5 0 0 0-6.4 6.4L3 18l3 3 5.3-5.3a5 5 0 0 0 6.4-6.4L14 13l-3-3z",
    digitalServices: "M4 5h16v10H4z M8 19h8 M12 15v4 M8 9h.01 M12 9h.01 M16 9h.01",
    projects: "M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
    team: "M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 8v6 M23 11h-6",
    carousel: "M4 4h16v16H4z M8 8h.01 M20 15l-5-5L5 20",
    categories: "M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z M7.5 7.5h.01",
    requests: "M8 4h8 M9 3h6v3H9z M6 5H4v16h16V5h-2 M8 12h8 M8 16h8",
    digitalOrders: "M4 4h16v16H4z M8 8h8 M8 12h8 M8 16h4",
    messages: "M21 11.5a8.5 8.5 0 0 1-12.8 7.3L3 20l1.2-4.1A8.5 8.5 0 1 1 21 11.5z",
    testimonials: "m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z",
    settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.7 2.9-.2-.1a1.7 1.7 0 0 0-1.8.2l-.2.1h-3.4l-.1-.2a1.7 1.7 0 0 0-1.6-1l-.2.1-3-1.7.1-.2a1.7 1.7 0 0 0-.2-1.8l-.1-.2v-3.4l.2-.1a1.7 1.7 0 0 0 1-1.6l-.1-.2 1.7-3 .2.1a1.7 1.7 0 0 0 1.8-.2l.2-.1h3.4l.1.2a1.7 1.7 0 0 0 1.6 1l.2-.1 3 1.7-.1.2a1.7 1.7 0 0 0 .2 1.8l.1.2v3.4z",
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px] shrink-0"
    >
      <path d={paths[name]} />
    </svg>
  );
}

function NavigationLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <>
      {groups.map((group) => (
        <section key={group.label} className="space-y-1">
          <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {group.label}
          </p>
          {group.items.map((item) => {
            const current = isCurrent(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={current ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                  current
                    ? "border-cyan-300/20 bg-cyan-300/10 text-cyan-100"
                    : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <NavigationIcon name={item.icon} />
                <span>{item.label}</span>
                {current ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-300" aria-hidden="true" /> : null}
              </Link>
            );
          })}
        </section>
      ))}
      <Link
        href="/"
        onClick={onNavigate}
        className="mt-2 flex min-h-11 items-center gap-3 rounded-xl border border-white/10 px-3 text-sm text-slate-400 transition hover:border-cyan-300/25 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
      >
        <span aria-hidden="true" className="flex h-[18px] w-[18px] items-center justify-center text-xs">↗</span>
        Ver sitio público
      </Link>
    </>
  );
}

export default function AdminNavigation() {
  const pathname = usePathname();
  const currentSection = groups.flatMap((group) => group.items).find((item) => isCurrent(pathname, item.href));

  return (
    <aside className="min-w-0">
      <details id="admin-mobile-navigation" className="group lg:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between rounded-xl border border-white/10 bg-slate-900/90 px-4 text-sm font-medium text-slate-200 shadow-lg shadow-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-3">
            <NavigationIcon name={currentSection?.icon ?? "overview"} />
            <span>Menú · {currentSection?.label ?? "Administración"}</span>
          </span>
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-cyan-300 transition-transform group-open:rotate-180">
            <path d="m5 7 5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </summary>
        <nav aria-label="Navegación administrativa" className="mt-2 max-h-[calc(100dvh-8rem)] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/98 p-2 shadow-xl shadow-black/30">
          <NavigationLinks pathname={pathname} onNavigate={() => {
            const details = document.getElementById("admin-mobile-navigation");
            if (details instanceof HTMLDetailsElement) details.open = false;
          }} />
        </nav>
      </details>
      <nav aria-label="Navegación administrativa" className="hidden rounded-2xl border border-white/10 bg-white/[0.025] p-2 lg:block">
        <NavigationLinks pathname={pathname} />
      </nav>
    </aside>
  );
}
