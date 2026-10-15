import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getPublicCategories, getPublicService } from "@/lib/portfolio";
import { isValidSlug } from "@/lib/slug";
import ServiceRequestForm from "@/components/requests/ServiceRequestForm";
import DigitalOrderForm from "@/components/catalog/DigitalOrderForm";
import { WhatsAppLink } from "@/components/contact/WhatsAppButton";
import PublicPageFrame from "@/components/layout/PublicPageFrame";
import { getPublicSiteSettings } from "@/lib/site-settings";
import { getContactFormAvailability } from "@/lib/contact/server";

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
  const [categories] = await Promise.all([getPublicCategories("SERVICE")]);
  const category = categories.find((item) => item.id === service.category_id);
  const isDigital = service.service_kind === "DIGITAL";
  const isSubscription = isDigital && service.license_type === "SUBSCRIPTION";
  const orderAvailability = isDigital ? getContactFormAvailability() : null;
  const durationValue = service.duration_value ?? 0;
  const durationUnitLabels: Record<string, [string, string]> = {
    DAY: ["día", "días"],
    MONTH: ["mes", "meses"],
    YEAR: ["año", "años"],
  };
  const [durationSingular, durationPlural] = durationUnitLabels[service.duration_unit ?? ""] ?? ["período", "períodos"];
  const durationLabel = service.duration_unit === "PERMANENT"
    ? "Acceso permanente"
    : `${durationValue} ${durationValue === 1 ? durationSingular : durationPlural}`;
  const deliveryLabels: Record<string, string> = {
    WHATSAPP_MANUAL: "Entrega manual coordinada por WhatsApp",
    OFFICIAL_REDEMPTION_CODE: "Código oficial de canje",
    OFFICIAL_INVITATION: "Invitación oficial del proveedor",
    AUTHORIZED_DOWNLOAD: "Descarga autorizada",
    OTHER_AUTHORIZED: "Otra modalidad autorizada",
  };
  const renewalLabels: Record<string, string> = {
    RENEWABLE_MANUALLY: "Se puede renovar manualmente; no es automática.",
    NOT_RENEWABLE: "Este plan no es renovable.",
    CONFIRM_MANUALLY: "Consulta la renovación con el administrador.",
  };
  const licenseLabels: Record<string, string> = {
    SUBSCRIPTION: "Suscripción",
    PERPETUAL_LICENSE: "Licencia permanente",
    COURSE_ACCESS: "Acceso a curso",
    DOWNLOAD: "Producto descargable",
    OTHER: "Tipo de acceso por confirmar",
  };
  const availabilityLabels: Record<string, string> = {
    AVAILABLE: "Disponible",
    ON_REQUEST: "Disponibilidad a confirmar",
    OUT_OF_STOCK: "Agotado",
    UNAVAILABLE: "No disponible",
  };
  const previousPrice = service.previous_price;
  const discountPercent = previousPrice != null && service.price !== null && previousPrice > service.price
    ? Math.round(((previousPrice - service.price) / previousPrice) * 100)
    : null;
  const canOrder = isDigital
    && service.price !== null
    && service.price > 0
    && (service.availability_status === "AVAILABLE" || service.availability_status === "ON_REQUEST")
    && !(service.stock_mode === "LIMITED" && (service.stock_quantity ?? 0) <= 0);

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
          {isDigital && service.brand ? (
            <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-cyan-200">
              {service.brand}{service.family_name ? ` · ${service.family_name}` : ""}
            </p>
          ) : null}
          {isSubscription && service.plan_name ? (
            <p className="mt-2 text-slate-200">Plan: <strong>{service.plan_name}</strong> · {durationLabel}</p>
          ) : null}
          {service.price !== null ? (
            <p className="mt-5 flex flex-wrap items-center gap-2 font-semibold text-white">
              {discountPercent !== null && previousPrice != null ? <span className="text-slate-500 line-through">USD {previousPrice.toFixed(2)}</span> : null}
              {service.service_kind === "DIGITAL" ? "Total " : "Desde "}
              {service.price.toLocaleString("es", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              {discountPercent !== null ? <span className="rounded bg-rose-500/15 px-2 py-1 text-xs text-rose-200">-{discountPercent}%</span> : null}
            </p>
          ) : null}
          {isDigital && service.price !== null ? (
            <p className="mt-1 text-xs text-slate-500">Total del pedido en USD; incluye los impuestos aplicables. No se añade IVA automáticamente.</p>
          ) : null}
        </header>
        {isDigital ? (
          <section className="surface-card mt-8 p-5 sm:p-7" aria-labelledby="digital-product-details">
            <h2 id="digital-product-details" className="text-xl font-semibold text-white">Qué incluye y cómo se entrega</h2>
            <dl className="mt-5 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
              {isSubscription ? <div><dt className="text-slate-500">Duración</dt><dd className="mt-1 font-medium text-slate-200">{durationLabel}</dd></div> : null}
              <div><dt className="text-slate-500">Tipo de licencia o acceso</dt><dd className="mt-1 font-medium text-slate-200">{licenseLabels[service.license_type ?? "OTHER"]}</dd></div>
              <div><dt className="text-slate-500">Entrega</dt><dd className="mt-1 font-medium text-slate-200">{deliveryLabels[service.distribution_method ?? ""] ?? "Modalidad por confirmar"}</dd></div>
              {isSubscription ? <div><dt className="text-slate-500">Renovación</dt><dd className="mt-1 font-medium text-slate-200">{renewalLabels[service.renewal_policy ?? ""] ?? "Por confirmar"}</dd></div> : null}
              <div><dt className="text-slate-500">Disponibilidad</dt><dd className="mt-1 font-medium text-slate-200">{availabilityLabels[service.availability_status ?? "UNAVAILABLE"] ?? "Por confirmar"}{service.stock_mode === "LIMITED" && service.stock_quantity !== null && service.stock_quantity !== undefined ? ` · ${service.stock_quantity} unidad(es)` : ""}</dd></div>
            </dl>
            {service.included_features?.length ? (
              <div className="mt-6">
                <h3 className="font-semibold text-white">Características incluidas</h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                  {service.included_features.map((feature) => <li key={feature} className="flex gap-2"><span className="text-cyan-300" aria-hidden="true">✓</span><span>{feature}</span></li>)}
                </ul>
              </div>
            ) : null}
            {service.conditions ? <div className="mt-6"><h3 className="font-semibold text-white">Condiciones y restricciones</h3><p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-300">{service.conditions}</p></div> : null}
          </section>
        ) : null}
        <div className="mt-10 whitespace-pre-line leading-8 text-slate-300">
          {service.description}
        </div>
        {canOrder && service.price !== null && orderAvailability ? (
          <DigitalOrderForm
            serviceId={service.id}
            serviceTitle={service.title}
            amount={service.price}
            turnstileSiteKey={orderAvailability.turnstileSiteKey}
            enabled={orderAvailability.enabled}
          />
        ) : isDigital ? (
          <p className="mt-8 rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm text-amber-100" role="status">
            Este plan no admite pedidos en este momento. Puedes consultarnos por WhatsApp.
          </p>
        ) : null}
        <section
          id="solicitar"
          className="surface-card mt-12 border-cyan-300/20 p-4 sm:p-8"
        >
          <h2 className="text-xl font-semibold">{isDigital ? "¿Tienes dudas sobre este plan?" : "¿Te interesa este servicio?"}</h2>
          <p className="mt-2 text-slate-300">
            {isDigital ? "Consulta condiciones, disponibilidad o la modalidad de entrega por WhatsApp." : "Envía una solicitud desde tu cuenta y podrás consultar su estado."}
          </p>
          <WhatsAppLink
            className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-500 px-5 font-semibold text-slate-950 transition-colors hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            message={`Hola Johnny, quisiera consultar sobre ${isDigital ? `el plan ${service.plan_name || service.title} de ${service.brand || service.title} (${durationLabel})` : `el servicio ${service.title}`}.`}
            pagePath={`/servicios/${encodeURIComponent(service.slug)}`}
            label="Consultar por WhatsApp"
          />
          {!isDigital ? <div className="mt-7"><ServiceRequestForm serviceId={service.id} serviceTitle={service.title} /></div> : null}
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
