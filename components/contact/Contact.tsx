import { Suspense } from "react";
import ContactForm from "@/components/contact/ContactForm";
import type { PublicSiteSettings } from "@/lib/site-settings";

export default function Contact({
  settings,
}: {
  settings: PublicSiteSettings;
}) {
  const turnstileSiteKey =
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
  const contactSubmissionEnabled = Boolean(
    turnstileSiteKey &&
      process.env.TURNSTILE_SECRET_KEY &&
      process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  return (
    <section id="contacto" className="border-t border-white/10 bg-slate-900">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">
            Contacto
          </p>
          <h2 className="mt-4 text-4xl font-bold text-white sm:text-5xl">
            Hablemos de tu idea.
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
            Cuéntame qué necesitas y conversemos sobre una solución tecnológica
            adecuada para tu proyecto.
          </p>
          {settings.contactEmail || settings.contactPhone || settings.contactLocation ? (
            <address className="mt-6 space-y-2 text-sm not-italic text-slate-300">
              {settings.contactEmail ? (
                <p>
                  <a className="hover:text-cyan-300" href={`mailto:${settings.contactEmail}`}>
                    {settings.contactEmail}
                  </a>
                </p>
              ) : null}
              {settings.contactPhone ? (
                <p>
                  <a
                    className="hover:text-cyan-300"
                    href={`tel:${settings.contactPhone.replace(/[^\d+]/g, "")}`}
                  >
                    {settings.contactPhone}
                  </a>
                </p>
              ) : null}
              {settings.contactLocation ? <p>{settings.contactLocation}</p> : null}
            </address>
          ) : null}
          <a
            href="#servicios"
            className="mt-8 inline-flex min-h-11 items-center rounded-xl border border-white/15 px-5 font-semibold text-white transition hover:border-cyan-300/50 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            Explorar servicios <span className="ml-2" aria-hidden="true">→</span>
          </a>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950 p-6 sm:p-8">
          <h3 className="text-xl font-semibold text-white">Envíame un mensaje</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Los campos marcados son obligatorios. La información se utilizará
            únicamente para responder a tu consulta.
          </p>
          <div className="mt-7">
            <Suspense
              fallback={
                <p className="text-sm text-slate-400" aria-busy="true">
                  Preparando formulario…
                </p>
              }
            >
              <ContactForm
                turnstileSiteKey={turnstileSiteKey}
                enabled={contactSubmissionEnabled}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </section>
  );
}