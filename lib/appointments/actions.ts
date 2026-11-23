"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { requireAdmin, getAuthenticatedUserId } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import type { AppointmentStatus } from "@/types/database";

export type AppointmentActionState = {
  error?: string;
  success?: string;
  appointmentId?: string;
};

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function appointmentError(error: { code?: string; message?: string }) {
  if (error.code === "23P01") {
    return "Ese horario acaba de ser reservado. Elige otro horario disponible.";
  }
  if (error.code === "23514" && error.message?.includes("APPOINTMENT_SLOT")) {
    return "El horario ya no está disponible. Actualiza la página y elige otro.";
  }
  if (error.code === "42501") {
    return "No tienes permiso para realizar esta operación.";
  }
  return "No se pudo guardar la cita. Inténtalo de nuevo.";
}

function logAppointmentError(action: string, error: { code?: string }) {
  console.error(`${action} failed. Supabase code: ${error.code ?? "UNKNOWN"}.`);
}

const appointmentSchema = z.object({
  service_id: z.string().uuid("Selecciona un servicio válido."),
  slot_id: z.string().uuid("Selecciona un horario válido."),
  customer_name: z.string().trim().min(1, "Escribe tu nombre.").max(120),
  customer_email: z.string().trim().email("Escribe un correo válido.").max(254),
  customer_phone: z.string().trim().max(40),
});

async function findAvailableSlot(
  supabase: Awaited<ReturnType<typeof createClient>>,
  serviceId: string,
  slotId: string,
) {
  const { data: slot, error: slotError } = await supabase
    .from("appointment_slots")
    .select("id,service_id,starts_at,ends_at,time_zone,active")
    .eq("id", slotId)
    .eq("service_id", serviceId)
    .eq("active", true)
    .gt("starts_at", new Date().toISOString())
    .maybeSingle();
  if (slotError) {
    logAppointmentError("Appointment availability lookup", slotError);
    return { error: "No se pudo comprobar la disponibilidad. Inténtalo de nuevo." } as const;
  }
  if (!slot) {
    return { error: "Ese horario ya no está disponible. Elige otro." } as const;
  }

  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("id,title")
    .eq("id", serviceId)
    .eq("status", "ACTIVE")
    .maybeSingle();
  if (serviceError) {
    logAppointmentError("Appointment service lookup", serviceError);
    return { error: "No se pudo comprobar el servicio. Inténtalo de nuevo." } as const;
  }
  if (!service) {
    return { error: "El servicio ya no está disponible." } as const;
  }

  return { slot, service } as const;
}

export async function createAppointmentAction(
  _previous: AppointmentActionState,
  formData: FormData,
): Promise<AppointmentActionState> {
  const userId = await getAuthenticatedUserId();
  const parsed = appointmentSchema.safeParse({
    service_id: field(formData, "service_id"),
    slot_id: field(formData, "slot_id"),
    customer_name: field(formData, "customer_name"),
    customer_email: field(formData, "customer_email"),
    customer_phone: field(formData, "customer_phone"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos de la cita." };
  }

  const supabase = await createClient();
  const available = await findAvailableSlot(
    supabase,
    parsed.data.service_id,
    parsed.data.slot_id,
  );
  if ("error" in available) return { error: available.error };

  const { data, error } = await supabase
    .from("appointments")
    .insert({
      user_id: userId,
      service_id: parsed.data.service_id,
      service_title: available.service.title,
      slot_id: available.slot.id,
      starts_at: available.slot.starts_at,
      ends_at: available.slot.ends_at,
      time_zone: available.slot.time_zone,
      customer_name: parsed.data.customer_name,
      customer_email: parsed.data.customer_email.toLowerCase(),
      customer_phone: parsed.data.customer_phone,
      status: "PENDING",
    })
    .select("id")
    .single();
  if (error) {
    logAppointmentError("Appointment creation", error);
    return { error: appointmentError(error) };
  }

  revalidatePath("/citas/mis-citas");
  revalidatePath("/admin/citas");
  return {
    success: "Tu solicitud de cita quedó registrada.",
    appointmentId: data.id,
  };
}

export async function rescheduleAppointmentAction(
  _previous: AppointmentActionState,
  formData: FormData,
): Promise<AppointmentActionState> {
  const userId = await getAuthenticatedUserId();
  const appointmentId = z.string().uuid().safeParse(field(formData, "appointment_id"));
  const slotId = z.string().uuid().safeParse(field(formData, "slot_id"));
  if (!appointmentId.success || !slotId.success) {
    return { error: "La cita o el horario seleccionado no son válidos." };
  }

  const supabase = await createClient();
  const { data: appointment, error: appointmentErrorResult } = await supabase
    .from("appointments")
    .select("id,service_id,status")
    .eq("id", appointmentId.data)
    .eq("user_id", userId)
    .in("status", ["PENDING", "CONFIRMED"])
    .maybeSingle();
  if (appointmentErrorResult) {
    logAppointmentError("Appointment lookup for reschedule", appointmentErrorResult);
    return { error: "No se pudo cargar la cita. Inténtalo de nuevo." };
  }
  if (!appointment) return { error: "No se encontró una cita que puedas reagendar." };

  const available = await findAvailableSlot(supabase, appointment.service_id, slotId.data);
  if ("error" in available) return { error: available.error };

  const { data, error } = await supabase
    .from("appointments")
    .update({
      slot_id: available.slot.id,
      service_id: appointment.service_id,
      starts_at: available.slot.starts_at,
      ends_at: available.slot.ends_at,
      time_zone: available.slot.time_zone,
    })
    .eq("id", appointment.id)
    .eq("user_id", userId)
    .in("status", ["PENDING", "CONFIRMED"])
    .select("id")
    .maybeSingle();
  if (error) {
    logAppointmentError("Appointment reschedule", error);
    return { error: appointmentError(error) };
  }
  if (!data) return { error: "La cita cambió antes de guardar. Actualiza y vuelve a intentarlo." };

  revalidatePath("/citas/mis-citas");
  revalidatePath(`/citas/${appointment.id}`);
  revalidatePath("/admin/citas");
  return { success: "La cita se reagendó correctamente." };
}

export async function cancelAppointmentAction(
  _previous: AppointmentActionState,
  formData: FormData,
): Promise<AppointmentActionState> {
  const userId = await getAuthenticatedUserId();
  const appointmentId = z.string().uuid().safeParse(field(formData, "appointment_id"));
  if (!appointmentId.success) return { error: "La cita seleccionada no es válida." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .update({ status: "CANCELLED", cancelled_at: new Date().toISOString() })
    .eq("id", appointmentId.data)
    .eq("user_id", userId)
    .in("status", ["PENDING", "CONFIRMED"])
    .select("id")
    .maybeSingle();
  if (error) {
    logAppointmentError("Appointment cancellation", error);
    return { error: appointmentError(error) };
  }
  if (!data) return { error: "No se encontró una cita activa que puedas cancelar." };

  revalidatePath("/citas/mis-citas");
  revalidatePath(`/citas/${data.id}`);
  revalidatePath("/admin/citas");
  return { success: "La cita se canceló. El registro se conserva en tu historial." };
}

const dateTimeSchema = z.string().trim().min(1);

function parseDateTime(raw: string) {
  if (!dateTimeSchema.safeParse(raw).success) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isValidTimeZone(raw: string) {
  try {
    new Intl.DateTimeFormat("es", { timeZone: raw }).format();
    return raw.length <= 64;
  } catch {
    return false;
  }
}

export async function createAppointmentSlotAction(
  _previous: AppointmentActionState,
  formData: FormData,
): Promise<AppointmentActionState> {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    unstable_rethrow(error);
    return { error: "No se pudo verificar tu acceso administrativo." };
  }

  const serviceId = z.string().uuid().safeParse(field(formData, "service_id"));
  const startsAt = parseDateTime(field(formData, "starts_at"));
  const endsAt = parseDateTime(field(formData, "ends_at"));
  const timeZone = field(formData, "time_zone");
  if (!serviceId.success || !startsAt || !endsAt || !isValidTimeZone(timeZone)) {
    return { error: "Selecciona un servicio, fechas válidas y una zona horaria válida." };
  }
  if (new Date(startsAt).getTime() <= Date.now() || new Date(endsAt) <= new Date(startsAt)) {
    return { error: "El horario debe ser futuro y terminar después de comenzar." };
  }

  const { data: service, error: serviceError } = await admin.supabase
    .from("services")
    .select("id")
    .eq("id", serviceId.data)
    .eq("status", "ACTIVE")
    .maybeSingle();
  if (serviceError) {
    logAppointmentError("Appointment slot service lookup", serviceError);
    return { error: "No se pudo comprobar el servicio." };
  }
  if (!service) return { error: "Solo se pueden publicar horarios para servicios activos." };

  const { error } = await admin.supabase.from("appointment_slots").insert({
    service_id: serviceId.data,
    starts_at: startsAt,
    ends_at: endsAt,
    time_zone: timeZone,
    created_by: admin.profile.id,
  });
  if (error) {
    logAppointmentError("Appointment slot creation", error);
    return { error: "No se pudo crear el horario. Comprueba que los datos sigan siendo válidos." };
  }

  revalidatePath("/admin/citas");
  revalidatePath("/citas/agendar");
  return { success: "Horario publicado." };
}

export async function setAppointmentSlotActiveAction(
  _previous: AppointmentActionState,
  formData: FormData,
): Promise<AppointmentActionState> {
  const { supabase } = await requireAdmin();
  const slotId = z.string().uuid().safeParse(field(formData, "slot_id"));
  const active = z.enum(["true", "false"]).safeParse(field(formData, "active"));
  if (!slotId.success || !active.success) return { error: "El horario seleccionado no es válido." };

  const { data, error } = await supabase
    .from("appointment_slots")
    .update({ active: active.data === "true" })
    .eq("id", slotId.data)
    .select("id")
    .maybeSingle();
  if (error) {
    logAppointmentError("Appointment slot update", error);
    return { error: "No se pudo actualizar el horario." };
  }
  if (!data) return { error: "No se encontró el horario." };

  revalidatePath("/admin/citas");
  revalidatePath("/citas/agendar");
  return { success: "Estado del horario actualizado." };
}

export async function updateAppointmentAsAdminAction(
  _previous: AppointmentActionState,
  formData: FormData,
): Promise<AppointmentActionState> {
  const { supabase } = await requireAdmin();
  const appointmentId = z.string().uuid().safeParse(field(formData, "appointment_id"));
  const status = z.enum(["CONFIRMED", "CANCELLED", "COMPLETED"] satisfies readonly AppointmentStatus[])
    .safeParse(field(formData, "status"));
  if (!appointmentId.success || !status.success) {
    return { error: "La cita o el estado seleccionado no son válidos." };
  }

  const update = status.data === "CANCELLED"
    ? { status: status.data, cancelled_at: new Date().toISOString() }
    : { status: status.data, cancelled_at: null };
  const { data, error } = await supabase
    .from("appointments")
    .update(update)
    .eq("id", appointmentId.data)
    .in("status", ["PENDING", "CONFIRMED"])
    .select("id")
    .maybeSingle();
  if (error) {
    logAppointmentError("Admin appointment update", error);
    return { error: "No se pudo actualizar el estado de la cita." };
  }
  if (!data) return { error: "No se encontró una cita activa para actualizar." };

  revalidatePath("/admin/citas");
  revalidatePath("/citas/mis-citas");
  return { success: "Estado de la cita actualizado." };
}
