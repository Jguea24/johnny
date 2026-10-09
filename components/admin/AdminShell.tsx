import Link from "next/link";
import type { ReactNode } from "react";
import { signOutAction } from "@/lib/auth/actions";

const navigation = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/usuarios", label: "Usuarios" },
  { href: "/admin/servicios", label: "Servicios" },
  { href: "/admin/proyectos", label: "Proyectos" },
  { href: "/admin/carrusel", label: "Carrusel" },
  { href: "/admin/categorias", label: "Categorías" },
  { href: "/admin/solicitudes", label: "Solicitudes" },
  { href: "/admin/mensajes", label: "Mensajes" },
  { href: "/admin/testimonios", label: "Testimonios" },
  { href: "/admin/configuracion", label: "Configuración" },
];

export default function AdminShell({
  children,
  userName,
  email,
}: {
  children: ReactNode;
  userName: string;
  email: string;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/95">
        <div className="mx-auto flex max-w-[90rem] flex-wrap items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <Link href="/admin" className="text-lg font-bold">
            JOHNNY<span className="text-cyan-400">.</span>
            <span className="ml-2 text-sm font-medium text-slate-400">
              Administración
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-white">{userName || "Administrador"}</p>
              <p className="text-xs text-slate-500">{email}</p>
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                className="min-h-10 rounded-lg border border-white/15 px-3 text-sm text-slate-200 hover:border-cyan-300/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[90rem] gap-6 px-5 py-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:px-8">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <nav
            aria-label="Navegación administrativa"
            className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible"
          >
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 rounded-lg border border-white/10 px-3 py-2.5 text-sm text-slate-300 transition hover:border-cyan-300/30 hover:bg-cyan-400/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/"
            className="mt-4 hidden text-sm text-slate-500 hover:text-cyan-300 lg:inline-block"
          >
            ← Ver sitio público
          </Link>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
