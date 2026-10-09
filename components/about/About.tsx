export default function About() {
  return (
    <section
      id="sobre-mi"
      className="border-t border-white/10 bg-slate-900"
    >
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          
          {/* INFORMACIÓN PRINCIPAL */}
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">
              Sobre mí
            </p>

            <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
              Tecnología con propósito.
            </h2>

            <p className="mt-6 text-lg leading-8 text-slate-300">
              Soy profesional en formación en el área de Tecnología de la
              Información, apasionado por el desarrollo de software, las redes,
              la seguridad informática y las nuevas tecnologías.
            </p>

            <p className="mt-4 text-lg leading-8 text-slate-300">
              Mi objetivo es convertir las necesidades de cada cliente en
              soluciones tecnológicas útiles, modernas y escalables.
            </p>

            <a
              href="#contacto"
              className="mt-8 inline-flex rounded-full bg-cyan-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              Trabajemos juntos
            </a>
          </div>

          {/* ÁREAS DE EXPERIENCIA */}
          <div className="grid gap-4 sm:grid-cols-2">
            <article className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-cyan-400/50">
              <div className="text-3xl">💻</div>

              <h3 className="mt-4 text-xl font-semibold text-white">
                Desarrollo
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                Desarrollo de sitios web, aplicaciones y sistemas orientados
                a resolver necesidades reales.
              </p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-cyan-400/50">
              <div className="text-3xl">🔐</div>

              <h3 className="mt-4 text-xl font-semibold text-white">
                Seguridad TI
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                Buenas prácticas para proteger sistemas, información y
                recursos tecnológicos.
              </p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-cyan-400/50">
              <div className="text-3xl">🌐</div>

              <h3 className="mt-4 text-xl font-semibold text-white">
                Redes
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                Diseño, configuración y análisis de infraestructura de redes
                y conectividad.
              </p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-cyan-400/50">
              <div className="text-3xl">🚀</div>

              <h3 className="mt-4 text-xl font-semibold text-white">
                Innovación
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                Uso de nuevas tecnologías para crear soluciones modernas y
                escalables.
              </p>
            </article>
          </div>

        </div>
      </div>
    </section>
  );
}