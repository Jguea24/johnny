import Link from "next/link";
import type { PublicSiteSettings } from "@/lib/site-settings";

export default function Footer({
  settings,
}: {
  settings: PublicSiteSettings;
}) {
  const socialLinks = Object.entries(settings.social).filter(
    (entry): entry is [string, string] => entry[1] !== null,
  );

  return (
    <footer className="border-t border-white/10 bg-[#050c16]">
      <div className="page-container grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_1fr] lg:py-14">
        <div className="min-w-0">
          <Link href="/" className="text-xl font-bold tracking-tight text-white">
            {settings.title}<span className="text-cyan-300">.</span>
          </Link>
          <p className="mt-4 max-w-md text-sm leading-7 text-slate-400">
            {settings.description}
          </p>
          <p className="mt-6 text-xs text-slate-500">
            Copyright {settings.title}. Todos los derechos reservados.
          </p>
        </div>

        <nav aria-label="Enlaces del sitio" className="flex flex-col items-start gap-3 text-sm">
          <p className="mb-1 font-semibold text-slate-200">Explorar</p>
          <Link href="/#sobre-mi" className="text-slate-400 transition hover:text-cyan-200">Sobre mÃ­ y equipo</Link>
          <Link href="/servicios" className="text-slate-400 transition hover:text-cyan-200">Servicios</Link>
          <Link href="/proyectos" className="text-slate-400 transition hover:text-cyan-200">Proyectos</Link>
          <Link href="/contacto" className="text-slate-400 transition hover:text-cyan-200">Contacto</Link>
        </nav>

        <div className="min-w-0">
          <p className="mb-4 text-sm font-semibold text-slate-200">Contacto y redes</p>
          <div className="flex flex-col items-start gap-3 text-sm">
            {settings.contactEmail ? (
              <a className="break-all text-slate-400 transition hover:text-cyan-200" href={`mailto:${settings.contactEmail}`}>
                {settings.contactEmail}
              </a>
            ) : null}
            {settings.contactPhone ? (
              <a className="text-slate-400 transition hover:text-cyan-200" href={`tel:${settings.contactPhone.replace(/[^\d+]/g, "")}`}>
                {settings.contactPhone}
              </a>
            ) : null}
            {settings.contactLocation ? <p className="text-slate-400">{settings.contactLocation}</p> : null}
          </div>
        </div>

        {socialLinks.length > 0 ? (
          <nav aria-label="Redes sociales" className="flex flex-wrap gap-3 sm:col-span-2 lg:col-span-3">
            {socialLinks.map(([network, url]) => (
              <a
                key={network}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/10 px-4 py-2 text-sm capitalize text-slate-400 transition hover:border-cyan-300/35 hover:text-cyan-200"
              >
                {network}
              </a>
            ))}
          </nav>
        ) : null}
      </div>
    </footer>
  );
}
