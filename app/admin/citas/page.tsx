import type { Metadata } from "next";
import AdminAppointmentsManager from "@/components/admin/AdminAppointmentsManager";
import { requireAdmin } from "@/lib/auth/identity";

export const metadata: Metadata = { title: "Citas" };

export default async function AdminCitasPage() {
  const { supabase } = await requireAdmin();
  const [servicesResult, slotsResult, appointmentsResult] = await Promise.all([
    supabase
      .from("services")
      .select("id,title,status")
      .order("title", { ascending: true }),
    supabase
      .from("appointment_slots")
      .select("id,service_id,starts_at,ends_at,time_zone,active")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(1000),
    supabase
      .from("appointments")
      .select("id,user_id,service_title,service_id,slot_id,starts_at,ends_at,time_zone,customer_name,customer_email,customer_phone,status,created_at,cancelled_at")
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);
  const queryError = servicesResult.error ?? slotsResult.error ?? appointmentsResult.error;
  if (queryError) {
    console.error(`Unable to load appointment administration. Supabase code: ${queryError.code}.`);
    return (
      <main className="space-y-5">
        <header>
          <p className="section-eyebrow">Operaciones</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Citas</h1>
        </header>
        <p className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-5 text-sm text-rose-100" role="alert">
          No se pudieron cargar las citas ni los horarios. Comprueba que la
          migración local de Citas esté aplicada en el entorno correspondiente.
        </p>
      </main>
    );
  }

  return (
    <main className="space-y-8">
      <header>
        <p className="section-eyebrow">Operaciones</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Citas y horarios</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          Publica horarios para servicios activos y administra el estado de las
          reservas. Solo se muestran horarios que registres aquí.
        </p>
      </header>
      <AdminAppointmentsManager
        services={servicesResult.data ?? []}
        slots={slotsResult.data ?? []}
        appointments={appointmentsResult.data ?? []}
      />
    </main>
  );
}
