import type { PublicService } from "@/components/portfolio/PortfolioContent";
import Link from "next/link";
import Image from "next/image";

type Listing<T> =
  | { status: "ready"; data: T[] }
  | { status: "error" | "unconfigured"; data: [] };

type ServicesProps = {
  services: Listing<PublicService>;
  categoryNames: ReadonlyMap<string, string>;
};

export default function Services({
  services,
  categoryNames,
}: ServicesProps) {
  return (
    <section id="servicios" className="bg-transparent">
      <div className="page-container section-space">

        {/* ENCABEZADO */}
        <div className="max-w-2xl">
          <p className="section-eyebrow">
            Servicios
          </p>

          <h2 className="section-title">
            Soluciones para tus necesidades tecnológicas.
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-400">
            Ofrezco servicios tecnológicos orientados a personas,
            emprendimientos, empresas e instituciones que buscan aprovechar
            mejor la tecnología.
          </p>
        </div>

        {/* SERVICIOS */}
        {services.status === "ready" && services.data.length > 0 ? (
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {services.data.map((service) => (
              <article
                key={service.id}
                className="surface-card group flex h-full flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-cyan-300/35 hover:bg-cyan-300/[0.04] motion-reduce:transform-none motion-reduce:transition-none"
              >
                <div className="relative flex aspect-[16/9] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-cyan-500/20 via-slate-900 to-indigo-500/20 text-6xl text-cyan-200 transition group-hover:bg-cyan-500/20">
                  {service.image_url ? (
                    <div className="relative h-full w-full">
                      <Image
                        src={service.image_url}
                        alt={service.title}
                        fill
                        unoptimized
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <span aria-hidden="true">{service.icon || "◇"}</span>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-6">
                {service.category_id && categoryNames.has(service.category_id) ? (
                  <p className="mt-5 text-sm font-medium text-cyan-400">
                    {categoryNames.get(service.category_id)}
                  </p>
                ) : null}

                <h3 className="mt-5 text-xl font-semibold text-white">
                  {service.title}
                </h3>

                <p className="mt-4 leading-7 text-slate-400">
                  {service.short_description}
                </p>

                {service.price !== null ? (
                  <p className="mt-4 text-sm font-semibold text-slate-200">
                    Desde {service.price.toLocaleString("es", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                ) : null}

                <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
                  <Link
                    href={`/servicios/${encodeURIComponent(service.slug)}`}
                    className="inline-flex min-h-11 items-center text-cyan-300 transition hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                  >
                    Ver detalles <span aria-hidden="true">→</span>
                  </Link>
                  <Link
                    href={`/servicios/${encodeURIComponent(service.slug)}#solicitar`}
                    className="inline-flex min-h-11 items-center text-cyan-400 transition hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                  >
                    Solicitar servicio
                  </Link>
                </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div
            className="mt-14 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-10 text-center"
            role={services.status === "error" ? "alert" : "status"}
          >
            <p className="text-lg font-semibold text-white">
              {services.status === "error"
                ? "No fue posible cargar los servicios."
                : services.status === "unconfigured"
                  ? "El catálogo de servicios no está configurado."
                  : "Estamos preparando nuevos servicios."}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              {services.status === "error"
                ? "Inténtalo de nuevo más tarde."
                : services.status === "unconfigured"
                  ? "Vuelve pronto para descubrir las soluciones disponibles."
                  : "Escríbeme si quieres conversar sobre una necesidad tecnológica."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
