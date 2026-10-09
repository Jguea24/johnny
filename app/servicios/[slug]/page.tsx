import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicCategories, getPublicService } from "@/lib/portfolio";
import { isValidSlug } from "@/lib/slug";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!isValidSlug(slug)) return { title: "Servicio no encontrado" };
  const result = await getPublicService(slug);
  if (result.status !== "ready") return { title: "Servicio no encontrado" };
  return {
    title: result.data.title,
    description: result.data.short_description,
  };
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const { slug } = await params;
  if (!isValidSlug(slug)) notFound();
  const result = await getPublicService(slug);
  if (result.status === "not-found") notFound();
  if (result.status !== "ready") {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-24 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/[0.03] p-8">
          <h1 className="text-2xl font-semibold">Servicio no disponible</h1>
          <p className="mt-3 text-slate-300" role="alert">
            No fue posible consultar este servicio en este momento. Inténtalo
            más tarde.
          </p>
          <Link
            href="/servicios"
            className="mt-6 inline-block font-semibold text-cyan-300 hover:text-cyan-200"
          >
            ← Volver a servicios
          </Link>
        </div>
      </main>
    );
  }

  const service = result.data;
  const categories = await getPublicCategories("SERVICE");
  const category = categories.find((item) => item.id === service.category_id);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <article className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
        <Link
          href="/servicios"
          className="rounded-sm text-sm font-medium text-cyan-300 outline-none hover:text-cyan-200 focus-visible:ring-2 focus-visible:ring-cyan-300"
        >
          ← Todos los servicios
        </Link>
        {service.image_url ? (
          <div
            role="img"
            aria-label={service.title}
            className="mt-8 h-64 rounded-2xl border border-white/10 bg-cover bg-center sm:h-80"
            style={{
              backgroundImage: `url("${service.image_url.replaceAll('"', "%22")}")`,
            }}
          />
        ) : null}
        <header className="mt-10">
          {category ? (
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">
              {category.name}
            </p>
          ) : null}
          <h1 className="mt-3 text-4xl font-bold sm:text-5xl">
            {service.title}
          </h1>
          <p className="mt-5 text-xl leading-8 text-slate-300">
            {service.short_description}
          </p>
          {service.price !== null ? (
            <p className="mt-5 font-semibold text-white">
              Desde{" "}
              {service.price.toLocaleString("es", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          ) : null}
        </header>
        <div className="mt-10 whitespace-pre-line leading-8 text-slate-300">
          {service.description}
        </div>
        <div className="mt-12 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.06] p-6 sm:p-8">
          <h2 className="text-xl font-semibold">¿Te interesa este servicio?</h2>
          <p className="mt-2 text-slate-300">
            Comparte lo que necesitas y conversemos sobre los siguientes pasos.
          </p>
          <Link
            href="/#contacto"
            className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-cyan-400 px-5 font-semibold text-slate-950 transition hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Solicitar información
          </Link>
        </div>
      </article>
    </main>
  );
}
