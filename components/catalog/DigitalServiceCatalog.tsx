"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { PublicCategory, PublicListing, PublicService } from "@/lib/portfolio";

function formatUsd(price: number) {
  return `USD ${price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function durationLabel(service: PublicService) {
  if (service.duration_unit === "PERMANENT") return "Acceso permanente";
  const units: Record<string, [string, string]> = {
    DAY: ["día", "días"],
    MONTH: ["mes", "meses"],
    YEAR: ["año", "años"],
  };
  const count = service.duration_value ?? 0;
  const [singular, plural] = units[service.duration_unit ?? ""] ?? ["periodo", "periodos"];
  return `${count} ${count === 1 ? singular : plural}`;
}

const availabilityLabels: Record<string, string> = {
  AVAILABLE: "Disponible",
  ON_REQUEST: "Consultar disponibilidad",
  OUT_OF_STOCK: "Agotado",
  UNAVAILABLE: "No disponible",
};

function CatalogImage({ service }: { service: PublicService }) {
  const [failed, setFailed] = useState(false);
  if (!service.image_url || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-950 via-slate-900 to-indigo-950 text-5xl text-cyan-200">
        <span aria-hidden="true">{service.icon || "◇"}</span>
      </div>
    );
  }
  return (
    <Image
      src={service.image_url}
      alt={service.title}
      fill
      unoptimized
      sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
      className="object-cover transition duration-500 group-hover:scale-105 motion-reduce:transition-none"
      onError={() => setFailed(true)}
    />
  );
}

function DigitalServiceCard({
  service,
  categoryName,
}: {
  service: PublicService;
  categoryName?: string;
}) {
  const detailHref = `/servicios/${encodeURIComponent(service.slug)}`;
  const outOfStock =
    service.stock_mode === "LIMITED" &&
    (service.stock_quantity ?? 0) <= 0;
  const availability =
    outOfStock ? "OUT_OF_STOCK" : service.availability_status ?? "UNAVAILABLE";
  const unavailable =
    availability === "OUT_OF_STOCK" || availability === "UNAVAILABLE";
  const price = service.price;
  const previousPrice = service.previous_price;
  const discounted =
    previousPrice !== null &&
    previousPrice !== undefined &&
    price !== null &&
    previousPrice > price;
  const discountPercent =
    discounted && previousPrice !== null && price !== null
      ? Math.round(((previousPrice - price) / previousPrice) * 100)
      : 0;
  const isSubscription = service.license_type === "SUBSCRIPTION";

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111318] shadow-lg shadow-black/20 transition duration-200 hover:-translate-y-1 hover:border-cyan-300/35 motion-reduce:transform-none motion-reduce:transition-none">
      <Link
        href={detailHref}
        className="relative block aspect-[16/10] overflow-hidden bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300"
        aria-label={`Ver detalles de ${service.title}`}
      >
        <CatalogImage service={service} />
        <span
          className={`absolute left-3 top-3 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
            unavailable
              ? "border-amber-300/30 bg-slate-950/90 text-amber-100"
              : "border-emerald-300/30 bg-slate-950/90 text-emerald-100"
          }`}
        >
          {availabilityLabels[availability] ?? "Por confirmar"}
        </span>
      </Link>
      <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
        <div className="flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1">
          {categoryName ? (
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-300">
              {categoryName}
            </p>
          ) : null}
          {categoryName && service.brand ? <span aria-hidden="true" className="text-xs text-slate-600">·</span> : null}
          {service.brand ? (
            <p className="line-clamp-1 text-xs font-medium text-slate-400">{service.brand}</p>
          ) : null}
        </div>
        <h2 className="mt-2 line-clamp-2 min-h-12 break-words text-lg font-bold leading-snug text-white">
          {service.title}
        </h2>
        {isSubscription ? (
          <p className="mt-1 line-clamp-1 text-sm font-semibold text-cyan-100">
            {service.plan_name ? `${service.plan_name} · ` : ""}{durationLabel(service)}
          </p>
        ) : (
          <p className="mt-1 line-clamp-1 text-sm font-medium text-cyan-100">
            {service.license_type === "PERPETUAL_LICENSE"
              ? "Licencia de software"
              : service.license_type === "DOWNLOAD"
                ? "Producto descargable"
                : service.license_type === "COURSE_ACCESS"
                  ? "Curso o capacitación"
                  : "Servicio digital"}
          </p>
        )}
        <p className="mt-3 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-slate-400">
          {service.short_description}
        </p>
        {service.included_features?.length ? (
          <ul className="mt-3 space-y-1 text-sm text-slate-300">
            {service.included_features.slice(0, 2).map((feature, index) => (
              <li key={`${index}-${feature}`} className="flex min-w-0 gap-2">
                <span aria-hidden="true" className="shrink-0 text-cyan-300">✓</span>
                <span className="line-clamp-1 break-words">{feature}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-auto pt-5">
          <div className="flex min-h-8 flex-wrap items-end gap-2">
            {discounted ? (
              <span className="text-sm text-slate-500 line-through">
                {formatUsd(previousPrice)}
              </span>
            ) : null}
            <p className="text-xl font-extrabold text-white">
              {price !== null ? formatUsd(price) : "Precio por confirmar"}
            </p>
            {discounted ? (
              <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-xs font-bold text-rose-200">
                -{discountPercent}%
              </span>
            ) : null}
          </div>
          <div className="mt-4 grid gap-2">
            {unavailable ? (
              <Link
                href={`${detailHref}#solicitar`}
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-300/[0.06] px-4 text-center text-sm font-bold text-cyan-100 transition-colors hover:bg-cyan-300/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                Consultar disponibilidad
              </Link>
            ) : (
              <Link
                href={`${detailHref}#pedido`}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-cyan-300 px-4 text-center text-sm font-bold text-slate-950 transition-colors hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Solicitar este plan
              </Link>
            )}
            <Link
              href={detailHref}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-4 text-center text-sm font-semibold text-slate-200 transition-colors hover:border-white/20 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              Ver detalles y condiciones
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function DigitalServiceCatalog({
  services,
  categories,
}: {
  services: PublicListing<PublicService>;
  categories: PublicCategory[];
}) {
  const [categoryId, setCategoryId] = useState("");
  const [query, setQuery] = useState("");
  const visibleServices = useMemo(() => {
    if (services.status !== "ready") return [];
    const normalizedQuery = query.trim().toLocaleLowerCase("es");
    return services.data.filter((service) => {
      const matchesCategory = !categoryId || service.category_id === categoryId;
      const matchesQuery =
        !normalizedQuery ||
        `${service.title} ${service.short_description} ${service.description} ${service.brand ?? ""} ${service.plan_name ?? ""}`
          .toLocaleLowerCase("es")
          .includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [categoryId, query, services]);
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));

  if (services.status !== "ready" || services.data.length === 0) {
    return (
      <section
        className="rounded-2xl border border-white/10 bg-slate-900/60 px-6 py-14 text-center"
        role={services.status === "error" ? "alert" : "status"}
      >
        <h2 className="text-xl font-semibold text-white">
          {services.status === "error"
            ? "No fue posible cargar los servicios digitales."
            : services.status === "unconfigured"
              ? "El catálogo digital no está configurado."
              : "Aún no hay servicios digitales publicados."}
        </h2>
        <p className="mt-2 text-slate-400">
          {services.status === "ready"
            ? "Las ofertas que publiques aparecerán aquí."
            : services.message ?? "Inténtalo de nuevo más tarde."}
        </p>
      </section>
    );
  }

  return (
    <div>
      <nav
        aria-label="Categorías de servicios digitales"
        className="-mx-4 overflow-x-auto border-y border-white/10 bg-slate-950/80 px-4 sm:mx-0 sm:rounded-xl sm:border sm:px-2"
      >
        <div className="flex min-w-max gap-1 py-2">
          <button
            type="button"
            aria-pressed={!categoryId}
            onClick={() => setCategoryId("")}
            className={`min-h-11 rounded-lg px-4 text-xs font-bold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${!categoryId ? "bg-cyan-300 text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}
          >
            Todos
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              aria-pressed={categoryId === category.id}
              onClick={() => setCategoryId(category.id)}
              className={`min-h-11 rounded-lg px-4 text-xs font-bold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${categoryId === category.id ? "bg-cyan-300 text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </nav>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-400" aria-live="polite">
          {visibleServices.length} {visibleServices.length === 1 ? "producto disponible" : "productos disponibles"}
        </p>
        <label className="w-full sm:max-w-sm">
          <span className="sr-only">Buscar servicios digitales</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar un producto…"
            className="field-control"
          />
        </label>
      </div>

      {visibleServices.length ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {visibleServices.map((service) => (
            <DigitalServiceCard
              key={service.id}
              service={service}
              categoryName={service.category_id ? categoryNames.get(service.category_id) : undefined}
            />
          ))}
        </div>
      ) : (
        <p className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-slate-300" role="status">
          No hay productos en esta categoría que coincidan con la búsqueda.
        </p>
      )}
    </div>
  );
}
