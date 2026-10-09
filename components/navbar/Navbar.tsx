import Link from "next/link";

export default function Navbar() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <Link href="/" className="text-xl font-bold tracking-tight text-white">
          JOHNNY<span className="text-cyan-400">.</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <a
            href="#inicio"
            className="text-sm text-slate-300 transition hover:text-cyan-400"
          >
            Inicio
          </a>

          <a
            href="#sobre-mi"
            className="text-sm text-slate-300 transition hover:text-cyan-400"
          >
            Sobre mí
          </a>

          <a
            href="#servicios"
            className="text-sm text-slate-300 transition hover:text-cyan-400"
          >
            Servicios
          </a>

          <a
            href="#proyectos"
            className="text-sm text-slate-300 transition hover:text-cyan-400"
          >
            Proyectos
          </a>

          <Link
            href="/login"
            className="text-sm text-slate-300 transition hover:text-cyan-400"
          >
            Iniciar sesión
          </Link>

          <a
            href="#contacto"
            className="rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            Contacto
          </a>
        </nav>
      </div>
    </header>
  );
}