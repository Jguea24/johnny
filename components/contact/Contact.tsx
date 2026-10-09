export default function Contact() {
  return (
    <section id="contacto" className="bg-cyan-500 text-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em]">
              ¿Tienes un proyecto?
            </p>

            <h2 className="mt-3 text-4xl font-bold sm:text-5xl">
              Hablemos de tu idea.
            </h2>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-800">
              Cuéntame qué necesitas y busquemos juntos una solución
              tecnológica adecuada para tu proyecto.
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row lg:justify-end">
            <a
              href="#servicios"
              className="rounded-full bg-slate-950 px-8 py-4 text-center font-semibold text-white transition hover:bg-slate-800"
            >
              Explorar servicios
            </a>

            <a
              href="#inicio"
              className="rounded-full border-2 border-slate-950 px-8 py-4 text-center font-semibold transition hover:bg-slate-950 hover:text-white"
            >
              Volver al inicio
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}