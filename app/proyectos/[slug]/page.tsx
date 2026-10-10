import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
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

async function ProjectDetailContent({ params }: PageProps) {
  const { slug } = await params;
  if (!isValidSlug(slug)) notFound();
  const result = await getPublicProject(slug);
  if (result.status === "not-found") notFound();
  if (result.status !== "ready") {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-16 text-white sm:px-6 sm:py-24">
        <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-8">
          <h1 className="text-2xl font-semibold">Proyecto no disponible</h1>
          <p className="mt-3 text-slate-300" role="alert">
            No fue posible consultar este proyecto en este momento. Inténtalo
            más tarde.
          </p>
          <Link
            href="/proyectos"
            className="mt-6 inline-flex min-h-11 items-center font-semibold text-cyan-300 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
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
      <article className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <Link
          href="/proyectos"
          className="inline-flex min-h-11 items-center rounded-sm text-sm font-medium text-cyan-300 outline-none hover:text-cyan-200 focus-visible:ring-2 focus-visible:ring-cyan-300"
        >
          ← Todos los proyectos
        </Link>
        {project.main_image ? (
          <div className="relative mt-8 aspect-[16/10] overflow-hidden rounded-2xl border border-white/10 sm:aspect-[16/9]">
            <Image
              src={project.main_image}
              alt={project.title}
              fill
              unoptimized
              sizes="(max-width: 768px) 100vw, 64rem"
              className="object-cover"
            />
          </div>
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
          <h1 className="mt-4 break-words text-[clamp(2rem,5vw,3rem)] font-bold">
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
                  className="relative aspect-[4/3] overflow-hidden rounded-xl border border-white/10"
                >
                  <Image
                    src={image.image_url}
                    alt={image.alt_text || project.title}
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </article>
    </main>
  );
}

export default function ProjectDetailPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <main
          className="min-h-screen bg-slate-950 px-4 py-16 text-center text-slate-300 sm:px-6 sm:py-24"
          aria-busy="true"
        >
          Cargando proyecto…
        </main>
      }
    >
      <ProjectDetailContent params={params} />
    </Suspense>
  );
}
