import type { PublicProject } from "@/components/portfolio/PortfolioContent";
import Link from "next/link";
import ProjectImage from "@/components/portfolio/ProjectImage";
import { parseYouTubeLink, safeHttpUrl } from "@/lib/portfolio-links";

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
  const featuredProjects = projects.status === "ready"
    ? projects.data.filter((project) => project.featured)
    : [];
  return (
    <section
      id="proyectos"
      className="border-t border-white/10 bg-slate-900/65"
    >
      <div className="page-container section-space">

        {/* ENCABEZADO */}
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="section-eyebrow">
              Portafolio
            </p>

            <h2 className="section-title">
              Proyectos destacados.
            </h2>
          </div>

          <p className="max-w-xl text-slate-400">
            Una selección de proyectos y soluciones tecnológicas desarrolladas
            en diferentes áreas.
          </p>
        </div>

        {projects.status === "ready" && featuredProjects.length > 0 ? (
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {featuredProjects.map((project) => (
              <article
                key={project.id}
                className="surface-card group flex h-full flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-cyan-300/35 motion-reduce:transform-none motion-reduce:transition-none"
              >
                <div className="relative aspect-video overflow-hidden">
                  <ProjectImage src={project.main_image || parseYouTubeLink(project.demo_url)?.thumbnailUrl} alt={`Imagen de ${project.title}`} sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw" />
                </div>

                <div className="flex flex-1 flex-col p-5 sm:p-6">
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
                    {parseYouTubeLink(project.demo_url) ? (
                      <span className="rounded-full border border-rose-300/20 bg-rose-300/10 px-3 py-1 text-xs text-rose-100">Tutorial de YouTube</span>
                    ) : null}
                  </div>

                  <h3 className="mt-2 line-clamp-2 text-xl font-semibold text-white">
                    <Link
                      href={`/proyectos/${encodeURIComponent(project.slug)}`}
                      className="rounded-sm outline-none transition hover:text-cyan-200 focus-visible:ring-2 focus-visible:ring-cyan-300"
                    >
                      {project.title}
                    </Link>
                  </h3>

                  <p className="mt-3 line-clamp-3 leading-7 text-slate-400">
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

                  {safeHttpUrl(project.demo_url) || safeHttpUrl(project.repository_url) ? (
                    <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-5">
                      {safeHttpUrl(project.demo_url) ? (
                        <a
                          href={safeHttpUrl(project.demo_url)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-cyan-400 transition hover:text-cyan-300"
                        >
                          {parseYouTubeLink(project.demo_url) ? "Ver en YouTube" : "Abrir enlace"}{" "}
                          <span aria-hidden="true">↗</span>
                        </a>
                      ) : null}
                      <Link
                        href={`/proyectos/${encodeURIComponent(project.slug)}`}
                        className="inline-flex min-h-11 items-center font-semibold text-cyan-300 transition hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                      >
                        Ver proyecto <span aria-hidden="true">→</span>
                      </Link>
                      {safeHttpUrl(project.repository_url) ? (
                        <a
                          href={safeHttpUrl(project.repository_url)!}
                          target="_blank"
                          rel="noopener noreferrer"
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
        ) : projects.status === "ready" && projects.data.length > 0 ? (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-8 text-center" role="status">
            <p className="font-semibold text-white">Aún no hay proyectos destacados.</p>
            <p className="mt-2 text-sm text-slate-400">Puedes explorar todos los proyectos y tutoriales publicados.</p>
            <Link href="/proyectos" className="mt-4 inline-flex min-h-11 items-center font-semibold text-cyan-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Ver todo el portafolio →</Link>
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
