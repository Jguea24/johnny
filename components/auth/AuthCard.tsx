import type { ReactNode } from "react";
import Link from "next/link";

export default function AuthCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="auth-page">
      <div className="auth-layout">
        <section className="auth-brand" aria-label="Johnny Grefa Asesoría Tecnológica">
          <Link href="/" className="auth-logo">
            <span className="auth-logo-mark" aria-hidden="true">JG</span>
            <span className="auth-logo-copy"><strong>Johnny <em>Grefa</em></strong><small>Asesoría Tecnológica</small></span>
          </Link>
          <div className="auth-brand-message">
            <p className="auth-brand-kicker">ASESORÍA Y FORMACIÓN</p>
            <h2>Tecnología útil para tus ideas y proyectos.</h2>
            <div className="auth-services" aria-label="Áreas de servicio">
              <span>Desarrollo de software</span>
              <span>Datos y geotecnologías</span>
              <span>Cursos y capacitación</span>
            </div>
          </div>
          <p className="auth-brand-footer">Johnny Grefa <span>·</span> Asesoría Tecnológica</p>
        </section>

        <section className="auth-panel" aria-labelledby="auth-title">
          <div className="auth-panel-heading">
            <span className="auth-user-icon" aria-hidden="true">
              <svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="15" r="9"/><path d="M7 42v-4a13 13 0 0 1 13-13h8a13 13 0 0 1 13 13v4z"/></svg>
            </span>
            <p className="auth-eyebrow">{eyebrow}</p>
            <h1 id="auth-title">{title}</h1>
            <p>{description}</p>
          </div>
          {children}
          <p className="auth-access-note">Acceso seguro para clientes y administración</p>
        </section>
      </div>
    </main>
  );
}
