"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import CatalogFilters from "@/components/catalog/CatalogFilters";
import { WhatsAppLink } from "@/components/contact/WhatsAppButton";
import type { PublicCategory, PublicListing, PublicService } from "@/lib/portfolio";

export default function ServiceCatalog({
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
        `${service.title} ${service.short_description} ${service.description}`
          .toLocaleLowerCase("es")
          .includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [categoryId, query, services]);
  const categoryNames = new Map(
    categories.map((category) => [category.id, category.name]),
  );

  return (
    <>
      {services.status === "ready" && services.data.length > 0 ? (
        <>
          <CatalogFilters
            categories={categories}
            categoryId={categoryId}
            query={query}
            onCategoryChange={setCategoryId}
            onQueryChange={setQuery}
          />
          {visibleServices.length > 0 ? (
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {visibleServices.map((service) => (
                <article
                  key={service.id}
                  className="surface-card group flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-cyan-300/35 motion-reduce:transform-none motion-reduce:transition-none"
                >
                  <div className="relative flex aspect-[16/9] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-cyan-500/20 via-slate-900 to-indigo-500/20 text-6xl text-cyan-200">
                    {service.image_url ? (
                      <div className="relative h-full w-full">
                        <Image
                          src={service.image_url}
                          alt={service.title}
                          fill
                          unoptimized
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition duration-500 group-hover:scale-105"
                        />
                      </div>
                    ) : (
                      <span aria-hidden="true">{service.icon || "◇"}</span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                  {service.category_id && categoryNames.has(service.category_id) ? (
                    <p className="mt-5 text-sm font-medium text-cyan-300">
                      {categoryNames.get(service.category_id)}
                    </p>
                  ) : null}
                  <h2 className="mt-2 text-xl font-semibold text-white">
                    {service.title}
                  </h2>
                  <p className="mt-3 leading-7 text-slate-400">
                    {service.short_description}
                  </p>
                  {service.price !== null ? (
                    <p className="mt-4 text-sm font-semibold text-slate-200">
                      {service.service_kind === "DIGITAL" ? "Precio " : "Desde "}
                      {service.price.toLocaleString("es", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  ) : null}
                  <Link
                    href={`/servicios/${encodeURIComponent(service.slug)}`}
                    className="mt-auto inline-flex min-h-12 items-center pt-5 font-semibold text-cyan-200 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-300"
                  >
                    Ver detalles <span aria-hidden="true">→</span>
                  </Link>
                  <Link
                    href={`/servicios/${encodeURIComponent(service.slug)}#solicitar`}
                    className="mt-2 inline-flex min-h-11 items-center font-semibold text-cyan-200 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-300"
                  >
                    Solicitar servicio
                  </Link>
                  <WhatsAppLink
                    className="mt-2 inline-flex min-h-11 items-center gap-2 font-semibold text-emerald-300 outline-none hover:text-emerald-200 focus-visible:ring-2 focus-visible:ring-emerald-300"
                    message={`Hola Johnny, quisiera consultar sobre el servicio: ${service.title}.`}
                    pagePath={`/servicios/${encodeURIComponent(service.slug)}`}
                    label="Consultar por WhatsApp"
                  />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p
              className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-slate-300"
              role="status"
            >
              No hay servicios que coincidan con esos filtros. Prueba otra
              categoría o término de búsqueda.
            </p>
          )}
        </>
      ) : (
        <div
          className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center"
          role={services.status === "error" ? "alert" : "status"}
        >
          <h2 className="text-lg font-semibold text-white">
            {services.status === "error"
              ? "No fue posible cargar los servicios."
              : services.status === "unconfigured"
                ? "El catálogo no está configurado."
                : "Aún no hay servicios publicados."}
          </h2>
          <p className="mt-2 text-slate-400">
            {services.status === "ready"
              ? "Los servicios estarán disponibles aquí cuando se publiquen."
              : services.message ?? "Inténtalo de nuevo más tarde."}
          </p>
        </div>
      )}
    </>
  );
}
