"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Navbar({ siteTitle }: { siteTitle: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const navigation = [
    { href: "/#inicio", label: "Inicio" },
    { href: "/#sobre-mi", label: "Sobre mí" },
    { href: "/#servicios", label: "Servicios" },
    { href: "/servicios-digitales", label: "Servicios digitales" },
    { href: "/proyectos", label: "Proyectos" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/85 pt-[env(safe-area-inset-top)] shadow-lg shadow-black/10 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:flex-nowrap lg:px-8">
        <Link
          href="/"
          className="min-w-0 max-w-[70%] break-words text-lg font-bold tracking-tight text-white sm:text-xl lg:max-w-none"
        >
          {siteTitle}<span className="text-cyan-400">.</span>
        </Link>

        <nav aria-label="Navegación principal" className="hidden items-center gap-3 lg:flex xl:gap-6">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={!item.href.includes("#") && pathname === item.href ? "page" : undefined}
              className={`text-sm transition hover:text-cyan-200 ${!item.href.includes("#") && pathname === item.href ? "font-semibold text-white" : "text-slate-300"}`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/contacto"
            className="button-primary min-h-11 rounded-full px-5"
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
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/15 bg-white/[0.03] text-slate-200 transition hover:border-cyan-300/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 lg:hidden"
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
            { href: "/contacto", label: "Contacto" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              aria-current={!item.href.includes("#") && pathname === item.href ? "page" : undefined}
              className={`rounded-xl px-3 py-3 text-sm transition hover:bg-white/5 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${!item.href.includes("#") && pathname === item.href ? "bg-white/[0.05] font-semibold text-white" : "text-slate-200"}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
