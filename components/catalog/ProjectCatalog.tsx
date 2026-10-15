"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import CatalogFilters from "@/components/catalog/CatalogFilters";
import ProjectImage from "@/components/portfolio/ProjectImage";
import type { PublicCategory, PublicListing, PublicProject } from "@/lib/portfolio";
import { parseYouTubeLink, safeHttpUrl } from "@/lib/portfolio-links";

export default function ProjectCatalog({
  projects,
  categories,
}: {
  projects: PublicListing<PublicProject>;
  categories: PublicCategory[];
}) {
  const [categoryId, setCategoryId] = useState("");
  const [query, setQuery] = useState("");
  const visibleProjects = useMemo(() => {
    if (projects.status !== "ready") return [];
    const normalizedQuery = query.trim().toLocaleLowerCase("es");
    return projects.data.filter((project) => {
      const matchesCategory = !categoryId || project.category_id === categoryId;
      const matchesQuery =
        !normalizedQuery ||
        `${project.title} ${project.short_description} ${project.description} ${project.technologies.join(" ")}`
          .toLocaleLowerCase("es")
          .includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [categoryId, projects, query]);
  const categoryNames = new Map(
    categories.map((category) => [category.id, category.name]),
  );

  return (
    <>
      {projects.status === "ready" && projects.data.length > 0 ? (
        <>
          <CatalogFilters
            categories={categories}
            categoryId={categoryId}
            query={query}
            onCategoryChange={setCategoryId}
            onQueryChange={setQuery}
          />
          {visibleProjects.length > 0 ? (
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {visibleProjects.map((project) => (
                <article
                  key={project.id}
                  className="surface-card flex h-full flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-cyan-300/35 motion-reduce:transform-none motion-reduce:transition-none"
                >
                  <div className="relative aspect-video overflow-hidden">
                    <ProjectImage
                      src={project.main_image || parseYouTubeLink(project.demo_url)?.thumbnailUrl}
                      alt={`Imagen de ${project.title}`}
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      {project.category_id &&
                      categoryNames.has(project.category_id) ? (
                        <p className="text-sm font-medium text-cyan-300">
                          {categoryNames.get(project.category_id)}
                        </p>
                      ) : (
                        <p className="text-sm text-slate-400">Sin categoría</p>
                      )}
                      {project.featured ? (
                        <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">
                          Destacado
                        </span>
                      ) : null}
                      {parseYouTubeLink(project.demo_url) ? (
                        <span className="rounded-full border border-rose-300/20 bg-rose-300/10 px-3 py-1 text-xs text-rose-100">
                          Tutorial de YouTube
                        </span>
                      ) : null}
                    </div>
                    <h2 className="mt-3 line-clamp-2 text-xl font-semibold text-white">
                      {project.title}
                    </h2>
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
                    <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-5">
                      <Link
                        href={`/proyectos/${encodeURIComponent(project.slug)}`}
                        className="inline-flex min-h-11 items-center font-semibold text-cyan-200 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-300"
                      >
                        Ver detalle <span aria-hidden="true">→</span>
                      </Link>
                      {safeHttpUrl(project.demo_url) ? (
                        <a
                          href={safeHttpUrl(project.demo_url)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-11 items-center text-sm font-medium text-slate-300 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                        >
                          {parseYouTubeLink(project.demo_url) ? "Ver en YouTube ↗" : "Abrir enlace ↗"}
                        </a>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p
              className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-slate-300"
              role="status"
            >
              No hay proyectos que coincidan con esos filtros. Prueba otra
              categoría o término de búsqueda.
            </p>
          )}
        </>
      ) : (
        <div
          className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center"
          role={projects.status === "error" ? "alert" : "status"}
        >
          <h2 className="text-lg font-semibold text-white">
            {projects.status === "error"
              ? "No fue posible cargar los proyectos."
              : projects.status === "unconfigured"
                ? "El portafolio no está configurado."
                : "Aún no hay proyectos publicados."}
          </h2>
          <p className="mt-2 text-slate-400">
            {projects.status === "ready"
              ? "Los proyectos aparecerán cuando se publiquen."
              : "Inténtalo de nuevo más tarde."}
          </p>
        </div>
      )}
    </>
  );
}
