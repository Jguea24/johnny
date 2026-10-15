import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getPublicCategories, getPublicService } from "@/lib/portfolio";
import { isValidSlug } from "@/lib/slug";
import ServiceRequestForm from "@/components/requests/ServiceRequestForm";
import DatafastCheckout from "@/components/payments/DatafastCheckout";
import { WhatsAppLink } from "@/components/contact/WhatsAppButton";
import PublicPageFrame from "@/components/layout/PublicPageFrame";
import { getPublicSiteSettings } from "@/lib/site-settings";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!isValidSlug(slug)) return { title: "Servicio no encontrado" };
  const result = await getPublicService(slug);
  if (result.status !== "ready") return { title: "Servicio no encontrado" };
  return {
    title: result.data.title,
    description: result.data.short_description,
  };
}

async function ServiceDetailContent({ params }: PageProps) {
  const { slug } = await params;
  if (!isValidSlug(slug)) notFound();
  const [result, settings] = await Promise.all([
    getPublicService(slug),
    getPublicSiteSettings(),
  ]);
  if (result.status === "not-found") notFound();
  if (result.status !== "ready") {
    return (
      <PublicPageFrame settings={settings}>
      <main className="min-h-screen bg-transparent px-4 py-16 text-white sm:px-6 sm:py-24">
        <div className="surface-card mx-auto max-w-3xl p-5 sm:p-8">
          <h1 className="text-2xl font-semibold">Servicio no disponible</h1>
          <p className="mt-3 text-slate-300" role="alert">
            No fue posible consultar este servicio en este momento. Inténtalo
            más tarde.
          </p>
          <Link
            href="/servicios"
            className="mt-6 inline-flex min-h-11 items-center font-semibold text-cyan-300 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            ← Volver a servicios
          </Link>
        </div>
      </main>
      </PublicPageFrame>
    );
  }

  const service = result.data;
  const categories = await getPublicCategories("SERVICE");
  const category = categories.find((item) => item.id === service.category_id);

  return (
    <PublicPageFrame settings={settings}>
    <main className="min-h-screen bg-transparent text-white">
      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <Link
          href="/servicios"
          className="inline-flex min-h-11 items-center rounded-sm text-sm font-medium text-cyan-300 outline-none hover:text-cyan-200 focus-visible:ring-2 focus-visible:ring-cyan-300"
        >
          ← Todos los servicios
        </Link>
        {service.image_url ? (
          <div className="relative mt-8 aspect-[16/10] overflow-hidden rounded-2xl border border-white/10 sm:aspect-[2/1]">
            <Image
              src={service.image_url}
              alt={service.title}
              fill
              unoptimized
              sizes="(max-width: 768px) 100vw, 64rem"
              className="object-cover"
            />
          </div>
        ) : null}
        <header className="mt-10">
          {category ? (
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">
              {category.name}
            </p>
          ) : null}
          <h1 className="mt-3 break-words text-[clamp(2rem,5vw,3rem)] font-bold">
            {service.title}
          </h1>
          <p className="mt-5 text-xl leading-8 text-slate-300">
            {service.short_description}
          </p>
          {service.price !== null ? (
            <p className="mt-5 font-semibold text-white">
              {service.service_kind === "DIGITAL" ? "Precio " : "Desde "}
              {service.price.toLocaleString("es", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          ) : null}
        </header>
        <div className="mt-10 whitespace-pre-line leading-8 text-slate-300">
          {service.description}
        </div>
        {service.service_kind === "DIGITAL" && service.price !== null && service.price > 0 ? (
          <DatafastCheckout
            serviceId={service.id}
            serviceTitle={service.title}
            amount={service.price}
          />
        ) : null}
        <section
          id="solicitar"
          className="surface-card mt-12 border-cyan-300/20 p-4 sm:p-8"
        >
          <h2 className="text-xl font-semibold">¿Te interesa este servicio?</h2>
          <p className="mt-2 text-slate-300">
            Envía una solicitud desde tu cuenta y podrás consultar su estado.
          </p>
          <WhatsAppLink
            className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-500 px-5 font-semibold text-slate-950 transition-colors hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            message={`Hola Johnny, quisiera consultar sobre el servicio: ${service.title}.`}
            pagePath={`/servicios/${encodeURIComponent(service.slug)}`}
            label="Consultar por WhatsApp"
          />
          <div className="mt-7">
            <ServiceRequestForm
              serviceId={service.id}
              serviceTitle={service.title}
            />
          </div>
        </section>
      </article>
    </main>
    </PublicPageFrame>
  );
}

export default function ServiceDetailPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <main
          className="min-h-screen bg-slate-950 px-4 py-16 text-center text-slate-300 sm:px-6 sm:py-24"
          aria-busy="true"
        >
          Cargando servicio…
        </main>
      }
    >
      <ServiceDetailContent params={params} />
    </Suspense>
  );
}
