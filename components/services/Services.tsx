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
    <section id="servicios" className="bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">

        {/* ENCABEZADO */}
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">
            Servicios
          </p>

          <h2 className="mt-4 text-[clamp(2rem,5vw,3rem)] font-bold">
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
                className="group rounded-2xl border border-white/10 bg-white/5 p-6 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/50 hover:bg-white/[0.07] motion-reduce:transform-none motion-reduce:transition-none"
              >
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-cyan-500/10 text-3xl transition group-hover:bg-cyan-500/20">
                  {service.image_url ? (
                    <div className="relative h-full w-full">
                      <Image
                        src={service.image_url}
                        alt={service.title}
                        fill
                        unoptimized
                        sizes="3.5rem"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <span aria-hidden="true">{service.icon || "◇"}</span>
                  )}
                </div>

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
                  <a
                    href="#contacto"
                    className="inline-flex min-h-11 items-center text-cyan-400 transition hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                  >
                    Solicitar servicio
                  </a>
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