"use client";

import Link from "next/link";
import { useState } from "react";

export default function Navbar({ siteTitle }: { siteTitle: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigation = [
    { href: "/#inicio", label: "Inicio" },
    { href: "/#sobre-mi", label: "Sobre mí" },
    { href: "/servicios", label: "Servicios" },
    { href: "/proyectos", label: "Proyectos" },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-slate-950/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:flex-nowrap lg:px-8">
        <Link
          href="/"
          className="min-w-0 max-w-[70%] break-words text-xl font-bold tracking-tight text-white lg:max-w-none"
        >
          {siteTitle}<span className="text-cyan-400">.</span>
        </Link>

        <nav aria-label="Navegación principal" className="hidden items-center gap-3 lg:flex xl:gap-6">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-slate-300 transition hover:text-cyan-400"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="text-sm text-slate-300 transition hover:text-cyan-400"
          >
            Iniciar sesión
          </Link>

          <Link
            href="/contacto"
            className="rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            Contacto
          </Link>
        </nav>

        <button
          type="button"
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setMenuOpen((open) => !open)}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-white/15 text-slate-200 transition hover:border-cyan-300/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 lg:hidden"
        >
          <span aria-hidden="true" className="text-xl leading-none">
            {menuOpen ? "×" : "☰"}
          </span>
        </button>

        <nav
          id="mobile-navigation"
          aria-label="Navegación principal"
          className={`${menuOpen ? "flex" : "hidden"} order-3 max-h-[calc(100dvh-5rem)] w-full flex-col gap-1 overflow-y-auto border-t border-white/10 pt-3 lg:hidden`}
        >
          {[
            ...navigation,
            { href: "/login", label: "Iniciar sesión" },
            { href: "/contacto", label: "Contacto" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-3 text-sm text-slate-200 transition hover:bg-white/5 hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}