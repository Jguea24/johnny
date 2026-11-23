import Link from "next/link";
import type { ReactNode } from "react";

export default function CitasLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/90">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/citas" className="text-lg font-bold tracking-tight">
            JOHNNY<span className="text-cyan-300">.</span>
            <span className="ml-2 text-sm font-medium text-slate-400">Citas</span>
          </Link>
          <nav aria-label="Navegación de citas" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-300">
            <Link href="/citas" className="hover:text-cyan-200">Inicio</Link>
            <Link href="/citas/agendar" className="hover:text-cyan-200">Agendar</Link>
            <Link href="/citas/mis-citas" className="hover:text-cyan-200">Mis citas</Link>
            <Link href="/" className="hover:text-cyan-200">Sitio principal</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">{children}</main>
    </div>
  );
}
