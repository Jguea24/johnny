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
    <footer className="border-t border-white/10 bg-slate-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-slate-500 md:flex-row md:items-center md:justify-between lg:px-8">
        <p>© {settings.title}. Todos los derechos reservados.</p>
        <p>{settings.description}</p>
        {socialLinks.length > 0 ? (
          <nav aria-label="Redes sociales" className="flex flex-wrap gap-4">
            {socialLinks.map(([network, url]) => (
              <a
                key={network}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="capitalize text-slate-400 transition hover:text-cyan-300"
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