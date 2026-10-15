import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/identity";
import TeamManager from "@/components/admin/TeamManager";
import type { Database } from "@/types/database";

export const metadata: Metadata = {
  title: "Equipo",
  description: "Administra el perfil del fundador y los colaboradores.",
};

export default async function AdminTeamPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .order("member_type", { ascending: true })
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error(`Unable to load admin team. Supabase code: ${error.code}.`);
    return (
      <main>
        <header className="mb-8">
          <p className="section-eyebrow">
            Administración
          </p>
          <h1 className="section-title">Equipo</h1>
        </header>
        <p
          className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-5 text-sm leading-6 text-rose-200"
          role="alert"
        >
          No fue posible cargar el equipo. Comprueba que la migración local de
          equipo esté aplicada en este proyecto Supabase y que sus políticas
          administrativas estén configuradas.
        </p>
      </main>
    );
  }

  const members: Database["public"]["Tables"]["team_members"]["Row"][] =
    data ?? [];

  return (
    <main>
      <header className="mb-8">
        <p className="section-eyebrow">
          Administración
        </p>
        <h1 className="section-title">Equipo</h1>
        <p className="mt-3 max-w-3xl text-slate-400">
          Edita la presentación del fundador y administra colaboradores reales.
          Un perfil incompleto permanece como borrador hasta tener los datos y
          una fotografía válidos.
        </p>
      </header>
      <TeamManager members={members} />
    </main>
  );
}
