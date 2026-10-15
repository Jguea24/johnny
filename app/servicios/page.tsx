import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import ServiceCatalog from "@/components/catalog/ServiceCatalog";
import { getPublicCategories, getPublicServices } from "@/lib/portfolio";
import PublicPageFrame from "@/components/layout/PublicPageFrame";
import { getPublicSiteSettings } from "@/lib/site-settings";

export const metadata: Metadata = {
  title: "Servicios tecnológicos",
  description:
    "Explora los servicios tecnológicos disponibles y encuentra una solución para tus necesidades.",
};

async function ServicesPageContent() {
  const [services, categories, settings] = await Promise.all([
    getPublicServices(),
    getPublicCategories("SERVICE"),
    getPublicSiteSettings(),
  ]);

  return (
    <PublicPageFrame settings={settings}>
      <main className="min-h-screen bg-transparent text-white">
      <section className="border-b border-white/10 bg-gradient-to-b from-cyan-950/30 to-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <Link href="/#servicios" className="inline-flex min-h-11 items-center text-sm text-cyan-300 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
            ← Inicio
          </Link>
          <p className="mt-10 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">
            Servicios
          </p>
          <h1 className="mt-4 max-w-3xl text-[clamp(2rem,5vw,3rem)] font-bold">
            Soluciones tecnológicas para avanzar.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            Conoce los servicios publicados y encuentra el apoyo adecuado para
            tu proyecto o necesidad tecnológica.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
        <ServiceCatalog services={services} categories={categories} />
      </section>
      </main>
    </PublicPageFrame>
  );
}

export default function ServicesPage() {
  return (
    <Suspense
      fallback={
        <main
          className="min-h-screen bg-slate-950 px-4 py-16 text-center text-slate-300 sm:px-6 sm:py-24"
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
