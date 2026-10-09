import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import ServiceCatalog from "@/components/catalog/ServiceCatalog";
import { getPublicCategories, getPublicServices } from "@/lib/portfolio";

export const metadata: Metadata = {
  title: "Servicios tecnológicos",
  description:
    "Explora los servicios tecnológicos disponibles y encuentra una solución para tus necesidades.",
};

async function ServicesPageContent() {
  const [services, categories] = await Promise.all([
    getPublicServices(),
    getPublicCategories("SERVICE"),
  ]);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-white/10 bg-gradient-to-b from-cyan-950/30 to-slate-950">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <Link href="/#servicios" className="text-sm text-cyan-300 hover:text-cyan-200">
            ← Inicio
          </Link>
          <p className="mt-10 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">
            Servicios
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold sm:text-5xl">
            Soluciones tecnológicas para avanzar.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            Conoce los servicios publicados y encuentra el apoyo adecuado para
            tu proyecto o necesidad tecnológica.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
        <ServiceCatalog services={services} categories={categories} />
      </section>
    </main>
  );
}

export default function ServicesPage() {
  return (
    <Suspense
      fallback={
        <main
          className="min-h-screen bg-slate-950 px-6 py-24 text-center text-slate-300"
          aria-busy="true"
        >
          Cargando servicios…
        </main>
      }
    >
      <ServicesPageContent />
    </Suspense>
  );
}
