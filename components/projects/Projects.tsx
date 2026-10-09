const projects = [
  {
    title: "Smart Farming",
    category: "Internet de las Cosas",
    description:
      "Sistema inteligente de monitoreo y automatización para agricultura mediante sensores IoT.",
  },
  {
    title: "Sistemas Web",
    category: "Desarrollo de Software",
    description:
      "Aplicaciones web diseñadas para optimizar procesos y facilitar la gestión de información.",
  },
  {
    title: "Soluciones de Red",
    category: "Infraestructura TI",
    description:
      "Diseño y configuración de soluciones de redes para instituciones y organizaciones.",
  },
];

export default function Projects() {
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

        {/* PROYECTOS */}
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {projects.map((project) => (
            <article
              key={project.title}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-950 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/50"
            >
              {/* ÁREA VISUAL */}
              <div className="flex h-52 items-center justify-center bg-gradient-to-br from-cyan-950 to-slate-900">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 transition duration-300 group-hover:scale-110">
                  <span className="text-4xl">◇</span>
                </div>
              </div>

              {/* INFORMACIÓN */}
              <div className="p-6">
                <p className="text-sm font-medium text-cyan-400">
                  {project.category}
                </p>

                <h3 className="mt-2 text-2xl font-semibold text-white">
                  {project.title}
                </h3>

                <p className="mt-4 leading-7 text-slate-400">
                  {project.description}
                </p>

                <a
                  href="#contacto"
                  className="mt-6 inline-block font-semibold text-cyan-400 transition hover:text-cyan-300"
                >
                  Ver proyecto →
                </a>
              </div>
            </article>
          ))}
        </div>

      </div>
    </section>
  );
}