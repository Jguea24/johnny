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
    <nav aria-label={`Enlaces profesionales de ${member.full_name}`} className="mt-5 flex flex-wrap gap-4">
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
}: {
  member: PublicTeamMember;
}) {
  if (!member.avatar_url) return null;
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-950">
      <Image
        src={member.avatar_url}
        alt={`Fotografía de ${member.full_name}`}
        fill
        unoptimized
        sizes={
          "(max-width: 640px) 100vw, (max-width: 1279px) 50vw, 33vw"
        }
        className="object-cover"
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
      className={`flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border bg-slate-950/70 shadow-lg shadow-slate-950/20 ${
        founder
          ? "border-cyan-300/30 shadow-cyan-950/20"
          : "border-white/10"
      }`}
    >
      <ProfilePhoto member={member} />
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <p className="min-h-5 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
          {founder ? "Fundador" : member.is_featured ? "Colaborador destacado" : ""}
        </p>
        <h3 className="mt-2 max-w-[24ch] break-words text-xl font-semibold leading-snug text-white">
          {member.full_name}
        </h3>
        <p className="mt-2 max-w-[34ch] break-words text-sm font-medium leading-6 text-cyan-100">
          {founder ? "Fundador y líder tecnológico" : member.position}
        </p>
        {!founder ? (
          <p className="mt-2 max-w-[34ch] break-words text-sm font-semibold leading-6 text-slate-200">
            {member.specialty}
          </p>
        ) : null}
        <p className="mt-3 max-w-[42ch] whitespace-pre-line break-words text-sm leading-6 text-slate-400">
          {member.bio}
        </p>
        <div className="mt-auto pt-2">
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
      className="border-t border-white/10 bg-slate-900"
    >
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">
            SOBRE MÍ Y MI EQUIPO
          </p>
          <h2
            id="team-heading"
            className="mt-4 text-[clamp(2rem,5vw,3rem)] font-bold tracking-tight text-white"
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
            <h3 className="sr-only">Fundador y colaboradores</h3>
            {!team.founder ? (
              <p
                className="mb-5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-sm text-slate-400"
                role="status"
              >
                El perfil del fundador se publicará cuando esté completo y
                cuente con una fotografía.
              </p>
            ) : null}
            {team.collaborators.length === 0 ? (
              <p
                className="mb-5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-sm text-slate-400"
                role="status"
              >
                Los perfiles de colaboradores aparecerán aquí cuando estén
                completos y publicados.
              </p>
            ) : null}
            <div className="grid min-w-0 auto-rows-fr gap-5 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
              {team.founder ? (
                <ProfileCard key={team.founder.id} member={team.founder} founder />
              ) : null}
              {team.collaborators.map((member) => (
                <ProfileCard key={member.id} member={member} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
