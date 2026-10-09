import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import ProjectCatalog from "@/components/catalog/ProjectCatalog";
import { getPublicCategories, getPublicProjects } from "@/lib/portfolio";

export const metadata: Metadata = {
  title: "Proyectos",
  description:
    "Explora proyectos tecnológicos publicados y conoce las herramientas utilizadas.",
};

async function ProjectsPageContent() {
  const [projects, categories] = await Promise.all([
    getPublicProjects(),
    getPublicCategories("PROJECT"),
  ]);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-white/10 bg-gradient-to-b from-cyan-950/30 to-slate-950">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <Link href="/#proyectos" className="text-sm text-cyan-300 hover:text-cyan-200">
            ← Inicio
          </Link>
          <p className="mt-10 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">
            Portafolio
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold sm:text-5xl">
            Proyectos y soluciones publicados.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            Explora el trabajo disponible en el portafolio y sus tecnologías.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
        <ProjectCatalog projects={projects} categories={categories} />
      </section>
    </main>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense
      fallback={
        <main
          className="min-h-screen bg-slate-950 px-6 py-24 text-center text-slate-300"
          aria-busy="true"
        >
          Cargando proyectos…
        </main>
      }
    >
      <ProjectsPageContent />
    </Suspense>
  );
}
