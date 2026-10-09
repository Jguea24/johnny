export default function Hero() {
  return (
    <section
      id="inicio"
      className="relative flex min-h-screen items-center overflow-hidden"
    >
      {/* Fondo decorativo */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.15),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_35%)]" />

      <div className="relative mx-auto grid w-full max-w-7xl gap-16 px-6 py-32 lg:grid-cols-2 lg:px-8">
        
        {/* CONTENIDO PRINCIPAL */}
        <div className="flex flex-col justify-center">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">
            Soluciones tecnológicas
          </p>

          <h1 className="max-w-4xl text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
            Transformo ideas en{" "}
            <span className="text-cyan-400">
              soluciones digitales.
            </span>
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
            Desarrollo soluciones tecnológicas modernas para personas,
            emprendimientos, empresas e instituciones que buscan mejorar sus
            procesos mediante la tecnología.
          </p>

          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <a
              href="#contacto"
              className="rounded-full bg-cyan-500 px-7 py-3.5 text-center font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              Solicitar un servicio
            </a>

            <a
              href="#proyectos"
              className="rounded-full border border-white/20 px-7 py-3.5 text-center font-semibold transition hover:border-cyan-400 hover:text-cyan-400"
            >
              Ver proyectos
            </a>
          </div>
        </div>

        {/* PANEL TECNOLÓGICO */}
        <div className="flex items-center justify-center">
          <div className="relative w-full max-w-md">
            <div className="absolute -inset-10 rounded-full bg-cyan-500/10 blur-3xl" />

            <div className="relative rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
              
              <div className="mb-8 flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
              </div>

              <div className="space-y-5 font-mono text-sm">
                <p className="text-slate-500">
                  {"// technology portfolio"}
                </p>

                <p>
                  <span className="text-purple-400">const</span>{" "}
                  <span className="text-cyan-300">solution</span> = {"{"}
                </p>

                <p className="pl-6">
                  technology:{" "}
                  <span className="text-green-400">
                    &quot;Innovation&quot;
                  </span>
                  ,
                </p>

                <p className="pl-6">
                  quality:{" "}
                  <span className="text-green-400">
                    &quot;Professional&quot;
                  </span>
                  ,
                </p>

                <p className="pl-6">
                  commitment:{" "}
                  <span className="text-green-400">
                    true
                  </span>
                  ,
                </p>

                <p>{"}"}</p>

                <div className="mt-8 rounded-xl bg-slate-900 p-4">
                  <p className="text-cyan-400">
                    ✓ Sistema listo para crecer
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}