"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/usuarios", label: "Usuarios" },
  { href: "/admin/servicios", label: "Servicios" },
  { href: "/admin/proyectos", label: "Proyectos" },
  { href: "/admin/equipo", label: "Equipo" },
  { href: "/admin/carrusel", label: "Carrusel" },
  { href: "/admin/categorias", label: "CategorÃ­as" },
  { href: "/admin/solicitudes", label: "Solicitudes" },
  { href: "/admin/mensajes", label: "Mensajes" },
  { href: "/admin/testimonios", label: "Testimonios" },
  { href: "/admin/configuracion", label: "ConfiguraciÃ³n" },
];

function isCurrent(pathname: string, href: string) {
  return href === "/admin"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

function NavigationLinks({ pathname }: { pathname: string }) {
  return (
    <>
      {navigation.map((item) => {
        const current = isCurrent(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className={`rounded-xl px-3.5 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
              current
                ? "border border-cyan-300/20 bg-cyan-300/10 text-cyan-100"
                : "border border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
      <Link
        href="/"
        className="mt-2 rounded-xl border border-white/10 px-3.5 py-3 text-sm text-slate-500 transition hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
      >
        <span aria-hidden="true"> @ </span>Ver sitio publico
      </Link>
    </>
  );
}

export default function AdminNavigation() {
  const pathname = usePathname();
  const currentSection = navigation.find((item) => isCurrent(pathname, item.href));

  return (
    <aside className="min-w-0">
      <details className="group lg:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-medium text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 [&::-webkit-details-marker]:hidden">
          <span>{currentSection?.label ?? "NavegaciÃ³n"}</span>
          <span className="text-cyan-300 transition group-open:rotate-180" aria-hidden="true">â–¾</span>
        </summary>
        <nav aria-label="NavegaciÃ³n administrativa" className="mt-2 grid gap-1 rounded-2xl border border-white/10 bg-slate-900/95 p-2 shadow-xl shadow-black/20">
          <NavigationLinks pathname={pathname} />
        </nav>
      </details>
      <nav aria-label="NavegaciÃ³n administrativa" className="hidden gap-1.5 rounded-2xl border border-white/10 bg-white/[0.025] p-2 lg:flex lg:flex-col">
        <NavigationLinks pathname={pathname} />
      </nav>
    </aside>
  );
}
