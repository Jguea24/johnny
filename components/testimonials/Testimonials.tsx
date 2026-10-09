import type { PublicTestimonial } from "@/components/portfolio/PortfolioContent";

type Listing<T> =
  | { status: "ready"; data: T[] }
  | { status: "error" | "unconfigured"; data: [] };

export default function Testimonials({
  testimonials,
}: {
  testimonials: Listing<PublicTestimonial>;
}) {
  if (
    testimonials.status === "ready" &&
    testimonials.data.length === 0
  ) {
    return null;
  }

  return (
    <section
      id="testimonios"
      className="border-t border-white/10 bg-slate-950"
    >
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">
            Testimonios
          </p>
          <h2 className="mt-4 text-4xl font-bold sm:text-5xl">
            Experiencias compartidas.
          </h2>
        </div>

        {testimonials.status === "ready" ? (
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {testimonials.data.map((testimonial) => (
              <article
                key={testimonial.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-6"
              >
                <blockquote className="leading-7 text-slate-300">
                  &ldquo;{testimonial.comment}&rdquo;
                </blockquote>
                <div className="mt-6 flex items-center gap-4">
                  {testimonial.photo_url ? (
                    <div
                      role="img"
                      aria-label={testimonial.name}
                      className="h-12 w-12 shrink-0 rounded-full border border-white/10 bg-cover bg-center"
                      style={{
                        backgroundImage: `url("${testimonial.photo_url.replaceAll('"', "%22")}")`,
                      }}
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 font-semibold text-cyan-200"
                    >
                      {testimonial.name.trim().charAt(0).toLocaleUpperCase("es")}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-white">
                      {testimonial.name}
                    </p>
                    {testimonial.position || testimonial.company ? (
                      <p className="mt-1 text-sm text-slate-400">
                        {[testimonial.position, testimonial.company]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p
            className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-8 text-slate-400"
            role="alert"
          >
            No fue posible cargar los testimonios en este momento.
          </p>
        )}
      </div>
    </section>
  );
}
