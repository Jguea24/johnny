import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Citas",
  description: "Agenda y administra tus citas.",
};

const shortcuts = [
  {
    title: "Agendar una cita",
    description: "Elige un servicio activo y uno de los horarios publicados.",
    href: "/citas/agendar",
    action: "Ver servicios y horarios",
  },
  {
    title: "Consultar mis citas",
    description: "Revisa tus reservas y su estado actual.",
    href: "/citas/mis-citas",
    action: "Abrir mis citas",
  },
  {
    title: "Reagendar",
    description: "Selecciona otra disponibilidad para una cita activa.",
    href: "/citas/mis-citas",
    action: "Elegir una cita",
  },
  {
    title: "Cancelar",
    description: "Cancela una cita activa; su registro se conserva en el historial.",
    href: "/citas/mis-citas",
    action: "Gestionar una cita",
  },
];

export default function CitasPage() {
  return (
    <div className="space-y-9">
      <header className="max-w-3xl">
        <p className="section-eyebrow">Atención coordinada</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white sm:text-5xl">Citas</h1>
        <p className="mt-4 text-base leading-7 text-slate-300">
          Consulta los servicios y horarios publicados, solicita una cita y
          gestiona tus reservas desde tu cuenta.
        </p>
      </header>
      <section aria-label="Accesos de citas" className="grid gap-4 sm:grid-cols-2">
        {shortcuts.map((shortcut) => (
          <article key={shortcut.title} className="surface-card flex min-h-48 flex-col p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-white">{shortcut.title}</h2>
            <p className="mt-3 flex-1 text-sm leading-6 text-slate-400">{shortcut.description}</p>
            <Link href={shortcut.href} className="mt-5 inline-flex min-h-11 items-center font-semibold text-cyan-200 hover:text-cyan-100">
              {shortcut.action}<span aria-hidden="true" className="ml-2">→</span>
            </Link>
          </article>
        ))}
      </section>
    </div>
  );
}
