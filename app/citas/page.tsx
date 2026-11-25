import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthenticatedUserId } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Citas",
  description: "Agenda y administra tus citas.",
};
export const instant = false;

export default async function CitasPage() {
  const userId = await getAuthenticatedUserId("/citas");
  const supabase = await createClient();
  const { data: activeAppointments, error } = await supabase
    .from("appointments")
    .select("id")
    .eq("user_id", userId)
    .in("status", ["PENDING", "CONFIRMED"])
    .limit(1);

  if (error) {
    console.error(`Unable to choose appointment destination. Supabase code: ${error.code}.`);
    redirect("/citas/mis-citas");
  }

  redirect(activeAppointments?.length ? "/citas/mis-citas" : "/citas/agendar");
}
