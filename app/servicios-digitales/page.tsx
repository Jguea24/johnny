import type { Metadata } from "next";
import { Suspense } from "react";
import DigitalServiceCatalog from "@/components/catalog/DigitalServiceCatalog";
import PublicPageFrame from "@/components/layout/PublicPageFrame";
import { getPublicCategories, getPublicServices } from "@/lib/portfolio";
import { getPublicSiteSettings } from "@/lib/site-settings";

export const metadata: Metadata = {
  title: "Servicios digitales",
  description: "Conoce y consulta los servicios digitales disponibles.",
};

async function DigitalServicesPageContent() {
  const [services, categories, settings] = await Promise.all([
    getPublicServices("DIGITAL"),
    getPublicCategories("SERVICE"),
    getPublicSiteSettings(),
  ]);

  return (
    <PublicPageFrame settings={settings}>
      <main className="min-h-screen bg-transparent text-white">
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
          <DigitalServiceCatalog services={services} categories={categories} />
        </section>
      </main>
    </PublicPageFrame>
  );
}

export default function DigitalServicesPage() {
  return (
    <Suspense
      fallback={
        <main
          className="min-h-screen bg-slate-950 px-4 py-16 text-center text-slate-300 sm:px-6 sm:py-24"
          aria-busy="true"
        >
          Cargando servicios digitales…
        </main>
      }
    >
      <DigitalServicesPageContent />
    </Suspense>
  );
}
