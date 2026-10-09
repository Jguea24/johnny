import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicCategories, getPublicProject } from "@/lib/portfolio";
import { isValidSlug } from "@/lib/slug";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!isValidSlug(slug)) return { title: "Proyecto no encontrado" };
  const result = await getPublicProject(slug);
  if (result.status !== "ready") return { title: "Proyecto no encontrado" };
  return {
    title: result.data.title,
    description: result.data.short_description,
  };
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { slug } = await params;
  if (!isValidSlug(slug)) notFound();
  const result = await getPublicProject(slug);
  if (result.status === "not-found") notFound();
  if (result.status !== "ready") {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-24 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/[0.03] p-8">
          <h1 className="text-2xl font-semibold">Proyecto no disponible</h1>
          <p className="mt-3 text-slate-300" role="alert">
            No fue posible consultar este proyecto en este momento. Inténtalo
            más tarde.
          </p>
          <Link
            href="/proyectos"
            className="mt-6 inline-block font-semibold text-cyan-300 hover:text-cyan-200"
          >
            ← Volver a proyectos
          </Link>
        </div>
      </main>
    );
  }

  const project = result.data;
  const categories = await getPublicCategories("PROJECT");
  const category = categories.find((item) => item.id === project.category_id);
  const gallery = project.images.filter(
    (image) => image.image_url !== project.main_image,
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <article className="mx-auto max-w-5xl px-6 py-16 lg:px-8">
        <Link
          href="/proyectos"
          className="rounded-sm text-sm font-medium text-cyan-300 outline-none hover:text-cyan-200 focus-visible:ring-2 focus-visible:ring-cyan-300"
        >
          ← Todos los proyectos
        </Link>
        {project.main_image ? (
          <div
            role="img"
            aria-label={project.title}
            className="mt-8 h-64 rounded-2xl border border-white/10 bg-cover bg-center sm:h-[26rem]"
            style={{
              backgroundImage: `url("${project.main_image.replaceAll('"', "%22")}")`,
            }}
          />
        ) : null}
        <header className="mt-10">
          <div className="flex flex-wrap items-center gap-3">
            {category ? (
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">
                {category.name}
              </p>
            ) : null}
            {project.featured ? (
              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-100">
                Proyecto destacado
              </span>
            ) : null}
          </div>
          <h1 className="mt-4 text-4xl font-bold sm:text-5xl">
            {project.title}
          </h1>
          <p className="mt-5 text-xl leading-8 text-slate-300">
            {project.short_description}
          </p>
        </header>
        <div className="mt-10 whitespace-pre-line leading-8 text-slate-300">
          {project.description}
        </div>
        {project.technologies.length > 0 ? (
          <section className="mt-10" aria-labelledby="project-tech">
            <h2 id="project-tech" className="text-lg font-semibold">
              Tecnologías
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {project.technologies.map((technology) => (
                <li
                  key={technology}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-slate-300"
                >
                  {technology}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {project.demo_url || project.repository_url ? (
          <nav aria-label="Enlaces del proyecto" className="mt-8 flex flex-wrap gap-5">
            {project.demo_url ? (
              <a
                href={project.demo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-cyan-300 hover:text-cyan-200"
              >
                Ver demostración <span aria-hidden="true">↗</span>
              </a>
            ) : null}
            {project.repository_url ? (
              <a
                href={project.repository_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-cyan-300 hover:text-cyan-200"
              >
                Ver repositorio <span aria-hidden="true">↗</span>
              </a>
            ) : null}
          </nav>
        ) : null}
        {gallery.length > 0 ? (
          <section className="mt-14" aria-labelledby="project-gallery">
            <h2 id="project-gallery" className="text-2xl font-semibold">
              Galería
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {gallery.map((image) => (
                <div
                  key={image.id}
                  role="img"
                  aria-label={image.alt_text || project.title}
                  className="h-56 rounded-xl border border-white/10 bg-cover bg-center"
                  style={{
                    backgroundImage: `url("${image.image_url.replaceAll('"', "%22")}")`,
                  }}
                />
              ))}
            </div>
          </section>
        ) : null}
      </article>
    </main>
  );
}
