import Image from "next/image";
import type {
  PublicTeamMember,
  PublicTeamResult,
  TeamLoadErrorKind,
} from "@/lib/team";

const introduction =
  "Soy Johnny Grefa, fundador y responsable de la marca Johnny. Junto a mis colaboradores, trabajamos para convertir necesidades reales en soluciones tecnológicas modernas, funcionales y confiables.";

function SafeProfileLinks({ member }: { member: PublicTeamMember }) {
  const linkedinUrl = safeHttpsUrl(member.linkedin_url);
  const websiteUrl = safeHttpsUrl(member.website_url);
  if (!linkedinUrl && !websiteUrl) return null;

  return (
    <nav aria-label={`Enlaces profesionales de ${member.full_name}`} className="mt-3 flex flex-wrap gap-3">
      {linkedinUrl ? (
        <a
          href={linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center font-semibold text-cyan-300 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        >
          LinkedIn <span className="ml-1" aria-hidden="true">↗</span>
        </a>
      ) : null}
      {websiteUrl ? (
        <a
          href={websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center font-semibold text-cyan-300 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        >
          Sitio web <span className="ml-1" aria-hidden="true">↗</span>
        </a>
      ) : null}
    </nav>
  );
}

function safeHttpsUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function ProfilePhoto({
  member,
  founder = false,
}: {
  member: PublicTeamMember;
  founder?: boolean;
}) {
  if (!member.avatar_url) return null;
  return (
    <div
      className={`relative w-full overflow-hidden bg-slate-800 ${
        founder
          ? "aspect-[4/3] md:aspect-auto md:min-h-64"
          : "aspect-[4/3]"
      }`}
    >
      <Image
        src={member.avatar_url}
        alt={`Fotografía de ${member.full_name}`}
        fill
        unoptimized
        sizes={
          founder
            ? "(max-width: 767px) 100vw, 35vw"
            : "(max-width: 640px) 100vw, (max-width: 1279px) 50vw, 33vw"
        }
        className="object-contain object-center"
      />
    </div>
  );
}

function ProfileCard({
  member,
  founder = false,
}: {
  member: PublicTeamMember;
  founder?: boolean;
}) {
  return (
    <article
      className={`mx-auto min-w-0 overflow-hidden rounded-2xl border bg-slate-950/70 shadow-md shadow-slate-950/20 ${
        founder
          ? "grid w-full max-w-4xl grid-cols-1 border-cyan-300/30 shadow-cyan-950/20 md:grid-cols-[minmax(13rem,0.36fr)_minmax(0,0.64fr)]"
          : "flex h-full w-full max-w-[360px] flex-col border-white/10"
      }`}
    >
      <ProfilePhoto member={member} founder={founder} />
      <div className={`flex min-w-0 flex-col p-4 ${founder ? "sm:p-6 md:justify-center" : "flex-1"}`}>
        <p className="min-h-4 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-cyan-300">
          {founder ? "Fundador" : member.is_featured ? "Colaborador destacado" : ""}
        </p>
        <h3 className="mt-1.5 max-w-[24ch] break-words text-lg font-semibold leading-snug text-white">
          {member.full_name}
        </h3>
        <p className="mt-1.5 max-w-[34ch] break-words text-sm font-medium leading-5 text-cyan-100">
          {founder
            ? "Fundador · Líder tecnológico"
            : member.position}
        </p>
        {!founder ? (
          <p className="mt-1.5 max-w-[34ch] break-words text-sm font-semibold leading-5 text-slate-200">
            {member.specialty}
          </p>
        ) : null}
        <details className="group mt-2 max-w-[42ch]">
          <summary className="cursor-pointer list-none break-words text-sm leading-5 text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
            <span className="line-clamp-3 whitespace-pre-line">
              {member.bio}
            </span>
            <span className="mt-1 inline-block text-xs font-medium text-cyan-300 group-open:hidden">
              Leer descripción completa
            </span>
          </summary>
          <p className="mt-2 whitespace-pre-line break-words text-sm leading-5 text-slate-400">
            {member.bio}
          </p>
        </details>
        <div className="mt-auto pt-1">
          <SafeProfileLinks member={member} />
        </div>
      </div>
    </article>
  );
}

function teamErrorMessage(errorKind: TeamLoadErrorKind): string {
  switch (errorKind) {
    case "table-not-found":
      return "La tabla del equipo no está disponible en Supabase. Revisa si la migración team_members se aplicó al proyecto y si la tabla está expuesta al Data API.";
    case "schema-mismatch":
      return "El esquema del equipo no coincide con el que espera el sitio. Revisa la migración y la caché de esquema del Data API.";
    case "permissions":
      return "Supabase rechazó la lectura pública del equipo. Revisa el permiso SELECT para anon y la política RLS de perfiles activos.";
    case "connection":
      return "No se pudo conectar con Supabase para cargar el equipo. Inténtalo más tarde.";
    default:
      return "No fue posible cargar los perfiles del equipo. Revisa el diagnóstico del servidor e inténtalo más tarde.";
  }
}

export default function About({
  team,
}: {
  team: PublicTeamResult | { status: "loading" };
}) {
  return (
    <section
      id="sobre-mi"
      aria-labelledby="team-heading"
      className="border-t border-white/10 bg-[radial-gradient(ellipse_at_50%_0%,rgba(8,145,178,0.09),transparent_55%),#0a1624]"
    >
      <div className="page-container section-space">
        <header className="mx-auto max-w-2xl text-center">
          <p className="section-eyebrow">
            SOBRE MÍ Y MI EQUIPO
          </p>
          <h2
            id="team-heading"
            className="section-title text-balance"
          >
            Una visión. Un equipo. Soluciones que transforman.
          </h2>
          <p className="mx-auto mt-5 max-w-[68ch] text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
            {introduction}
          </p>
        </header>

        {team.status === "loading" ? (
          <p
            className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-slate-400"
            role="status"
            aria-busy="true"
          >
            Cargando perfiles del equipo…
          </p>
        ) : team.status === "error" ? (
          <p
            className="mt-10 rounded-2xl border border-rose-400/30 bg-rose-400/10 p-6 text-center text-rose-200"
            role="alert"
          >
            {teamErrorMessage(team.errorKind)}
          </p>
        ) : team.status === "unconfigured" ? (
          <p
            className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-slate-400"
            role="status"
          >
            Los perfiles del equipo estarán disponibles cuando el servicio esté
            configurado.
          </p>
        ) : (
          <div className="mt-9">
            <section
              aria-labelledby="founder-heading"
              className="flex flex-col items-center"
            >
              <h3
                id="founder-heading"
                className="mb-4 text-center text-lg font-semibold text-white"
              >
                Fundador y líder tecnológico
              </h3>
              {team.founder ? (
                <ProfileCard
                  key={team.founder.id}
                  member={team.founder}
                  founder
                />
              ) : (
                <p
                  className="w-full max-w-md rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-sm text-slate-400"
                  role="status"
                >
                  El perfil del fundador se publicará cuando esté completo y
                  cuente con una fotografía.
                </p>
              )}
            </section>

            <section
              aria-labelledby="collaborators-heading"
              className="mt-10 border-t border-white/10 pt-8 sm:mt-12 sm:pt-10"
            >
              <header className="mb-5 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">
                  Colaboradores
                </p>
                <h3
                  id="collaborators-heading"
                  className="mt-2 text-2xl font-semibold text-white"
                >
                  Nuestro equipo
                </h3>
              </header>
              {team.collaborators.length > 0 ? (
                <div className="mx-auto grid w-full max-w-6xl min-w-0 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {team.collaborators.map((member) => (
                    <ProfileCard key={member.id} member={member} />
                  ))}
                </div>
              ) : (
                <p
                  className="mx-auto max-w-xl rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-sm text-slate-400"
                  role="status"
                >
                  Los perfiles de colaboradores aparecerán aquí cuando estén
                  completos y publicados.
                </p>
              )}
            </section>
          </div>
        )}
      </div>
    </section>
  );
}
