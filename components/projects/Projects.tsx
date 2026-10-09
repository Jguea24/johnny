import type { PublicProject } from "@/components/portfolio/PortfolioContent";
import Link from "next/link";

type Listing<T> =
  | { status: "ready"; data: T[] }
  | { status: "error" | "unconfigured"; data: [] };

type ProjectsProps = {
  projects: Listing<PublicProject>;
  categoryNames: ReadonlyMap<string, string>;
};

export default function Projects({
  projects,
  categoryNames,
}: ProjectsProps) {
  return (
    <section
      id="proyectos"
      className="border-t border-white/10 bg-slate-900"
    >
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">

        {/* ENCABEZADO */}
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">
              Portafolio
            </p>

            <h2 className="mt-4 text-4xl font-bold sm:text-5xl">
              Proyectos destacados.
            </h2>
          </div>

          <p className="max-w-xl text-slate-400">
            Una selección de proyectos y soluciones tecnológicas desarrolladas
            en diferentes áreas.
          </p>
        </div>

        {projects.status === "ready" && projects.data.length > 0 ? (
          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {projects.data.map((project) => (
              <article
                key={project.id}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-950 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/50 motion-reduce:transform-none motion-reduce:transition-none"
              >
                <div
                  role={project.main_image ? "img" : undefined}
                  aria-label={project.main_image ? project.title : undefined}
                  className="flex h-52 items-center justify-center bg-gradient-to-br from-cyan-950 to-slate-900 bg-cover bg-center"
                  style={
                    project.main_image
                      ? {
                          backgroundImage: `url("${project.main_image.replaceAll('"', "%22")}")`,
                        }
                      : undefined
                  }
                >
                  {!project.main_image ? (
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 transition duration-300 group-hover:scale-110 motion-reduce:transform-none motion-reduce:transition-none">
                      <span aria-hidden="true" className="text-4xl">
                        ◇
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    {project.category_id &&
                    categoryNames.has(project.category_id) ? (
                      <p className="text-sm font-medium text-cyan-400">
                        {categoryNames.get(project.category_id)}
                      </p>
                    ) : null}
                    {project.featured ? (
                      <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
                        Destacado
                      </span>
                    ) : null}
                  </div>

                  <h3 className="mt-2 text-2xl font-semibold text-white">
                    <Link
                      href={`/proyectos/${encodeURIComponent(project.slug)}`}
                      className="rounded-sm outline-none transition hover:text-cyan-200 focus-visible:ring-2 focus-visible:ring-cyan-300"
                    >
                      {project.title}
                    </Link>
                  </h3>

                  <p className="mt-4 leading-7 text-slate-400">
                    {project.short_description}
                  </p>

                  {project.technologies.length > 0 ? (
                    <ul
                      aria-label={`Tecnologías de ${project.title}`}
                      className="mt-5 flex flex-wrap gap-2"
                    >
                      {project.technologies.map((technology) => (
                        <li
                          key={technology}
                          className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300"
                        >
                          {technology}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {project.demo_url || project.repository_url ? (
                    <div className="mt-6 flex flex-wrap gap-4">
                      {project.demo_url ? (
                        <a
                          href={project.demo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-cyan-400 transition hover:text-cyan-300"
                        >
                          Ver demostración{" "}
                          <span aria-hidden="true">↗</span>
                        </a>
                      ) : null}
                      <Link
                        href={`/proyectos/${encodeURIComponent(project.slug)}`}
                        className="mt-6 inline-block font-semibold text-cyan-300 transition hover:text-cyan-200"
                      >
                        Ver proyecto <span aria-hidden="true">→</span>
                      </Link>
                      {project.repository_url ? (
                        <a
                          href={project.repository_url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-cyan-400 transition hover:text-cyan-300"
                        >
                          Ver repositorio{" "}
                          <span aria-hidden="true">↗</span>
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div
            className="mt-14 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-10 text-center"
            role={projects.status === "error" ? "alert" : "status"}
          >
            <p className="text-lg font-semibold text-white">
              {projects.status === "error"
                ? "No fue posible cargar los proyectos."
                : projects.status === "unconfigured"
                  ? "El portafolio no está configurado."
                  : "Aún no hay proyectos publicados."}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              {projects.status === "error"
                ? "Inténtalo de nuevo más tarde."
                : "Los proyectos se mostrarán aquí cuando estén publicados."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

