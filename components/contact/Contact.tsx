import { Suspense } from "react";
import ContactForm from "@/components/contact/ContactForm";
import { getContactFormAvailability } from "@/lib/contact/server";
import type { PublicSiteSettings } from "@/lib/site-settings";
import { WhatsAppLink } from "@/components/contact/WhatsAppButton";

export default function Contact({
  settings,
}: {
  settings: PublicSiteSettings;
}) {
  const { enabled, turnstileSiteKey } = getContactFormAvailability();

  return (
    <section id="contacto" className="border-t border-white/10 bg-slate-900">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:gap-12 sm:px-6 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <div className="min-w-0 lg:sticky lg:top-28 lg:self-start">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">
            Contacto
          </p>
          <h2 className="mt-4 text-[clamp(2rem,5vw,3rem)] font-bold text-white">
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
          <div className="mt-3">
            <WhatsAppLink className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 font-semibold text-emerald-200 transition-colors hover:bg-emerald-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300" />
          </div>
        </div>
        <div className="min-w-0 rounded-2xl border border-white/10 bg-slate-950 p-4 sm:p-8">
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
                enabled={enabled}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </section>
  );
}