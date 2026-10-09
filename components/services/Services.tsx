const services = [
  {
    icon: "💻",
    title: "Desarrollo Web",
    description:
      "Diseño y desarrollo de sitios web y aplicaciones modernas, rápidas y adaptadas a las necesidades de cada proyecto.",
  },
  {
    icon: "🔐",
    title: "Seguridad TI",
    description:
      "Soluciones y buenas prácticas de seguridad informática para proteger sistemas, información y recursos tecnológicos.",
  },
  {
    icon: "🛠️",
    title: "Soporte Técnico",
    description:
      "Mantenimiento, configuración y soporte para equipos, sistemas y soluciones tecnológicas.",
  },
  {
    icon: "🎓",
    title: "Capacitación",
    description:
      "Capacitación tecnológica personalizada para estudiantes, profesionales, instituciones y empresas.",
  },
];

export default function Services() {
  return (
    <section id="servicios" className="bg-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">

        {/* ENCABEZADO */}
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">
            Servicios
          </p>

          <h2 className="mt-4 text-4xl font-bold sm:text-5xl">
            Soluciones para tus necesidades tecnológicas.
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-400">
            Ofrezco servicios tecnológicos orientados a personas,
            emprendimientos, empresas e instituciones que buscan aprovechar
            mejor la tecnología.
          </p>
        </div>

        {/* SERVICIOS */}
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => (
            <article
              key={service.title}
              className="group rounded-2xl border border-white/10 bg-white/5 p-6 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/50 hover:bg-white/[0.07]"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-cyan-500/10 text-3xl transition group-hover:bg-cyan-500/20">
                {service.icon}
              </div>

              <h3 className="mt-6 text-xl font-semibold text-white">
                {service.title}
              </h3>

              <p className="mt-4 leading-7 text-slate-400">
                {service.description}
              </p>

              <a
                href="#contacto"
                className="mt-6 inline-block text-sm font-semibold text-cyan-400 transition hover:text-cyan-300"
              >
                Solicitar servicio →
              </a>
            </article>
          ))}
        </div>

      </div>
    </section>
  );
}