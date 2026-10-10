"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import CatalogFilters from "@/components/catalog/CatalogFilters";
import type { PublicCategory, PublicListing, PublicProject } from "@/lib/portfolio";

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
                  className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/40 motion-reduce:transform-none motion-reduce:transition-none"
                >
                  <div className="relative flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-cyan-950 to-slate-900">
                    {project.main_image ? (
                      <Image
                        src={project.main_image}
                        alt={project.title}
                        fill
                        unoptimized
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        className="object-cover"
                      />
                    ) : (
                      <span aria-hidden="true" className="text-4xl text-cyan-200">
                        ◇
                      </span>
                    )}
                  </div>
                  <div className="p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      {project.category_id &&
                      categoryNames.has(project.category_id) ? (
                        <p className="text-sm font-medium text-cyan-300">
                          {categoryNames.get(project.category_id)}
                        </p>
                      ) : null}
                      {project.featured ? (
                        <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">
                          Destacado
                        </span>
                      ) : null}
                    </div>
                    <h2 className="mt-3 text-xl font-semibold text-white">
                      {project.title}
                    </h2>
                    <p className="mt-3 leading-7 text-slate-400">
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
                    <Link
                      href={`/proyectos/${encodeURIComponent(project.slug)}`}
                      className="mt-4 inline-flex min-h-11 items-center rounded-sm font-semibold text-cyan-300 outline-none hover:text-cyan-200 focus-visible:ring-2 focus-visible:ring-cyan-300"
                    >
                      Ver proyecto <span aria-hidden="true">→</span>
                    </Link>
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
