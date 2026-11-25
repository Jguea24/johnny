import type { Metadata } from "next";
import AppointmentBookingForm from "@/components/appointments/AppointmentBookingForm";
import { getAuthenticatedUserId } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Agendar cita" };
export const instant = false;

export default async function AgendarCitaPage() {
  const userId = await getAuthenticatedUserId("/citas/agendar");
  const supabase = await createClient();
  const [servicesResult, slotsResult, profileResult] = await Promise.all([
    supabase
      .from("services")
      .select("id,title")
      .eq("status", "ACTIVE")
      .order("sort_order", { ascending: true }),
    supabase
      .from("appointment_slots")
      .select("id,service_id,starts_at,ends_at,time_zone")
      .eq("active", true)
      .gt("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(1000),
    supabase
      .from("profiles")
      .select("full_name,email,phone")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  if (servicesResult.error || slotsResult.error || profileResult.error) {
    const errorCode = servicesResult.error?.code ?? slotsResult.error?.code ?? profileResult.error?.code;
    console.error(`Unable to load appointment form. Supabase code: ${errorCode ?? "UNKNOWN"}.`);
    return (
      <section className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-5 text-rose-100" role="alert">
        No fue posible cargar servicios, horarios o tus datos de contacto. Inténtalo más tarde.
      </section>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="section-eyebrow">Reserva</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Agendar una cita</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          Los horarios corresponden a la zona horaria indicada. Solo se ofrecen
          opciones publicadas por administración.
        </p>
      </header>
      <AppointmentBookingForm
        services={servicesResult.data ?? []}
        slots={slotsResult.data ?? []}
        customer={{
          name: profileResult.data?.full_name ?? "",
          email: profileResult.data?.email ?? "",
          phone: profileResult.data?.phone ?? "",
        }}
      />
    </div>
  );
}
