"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/identity";
import { protectContactSubmission } from "@/lib/contact/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/types/database";

export type DigitalOrderActionState = {
  error?: string;
  orderId?: string;
};

export type DigitalOrderUpdateState = {
  error?: string;
  success?: string;
};

const orderInput = z.object({
  serviceId: z.string().uuid(),
  customerName: z.string().trim().min(2).max(120),
  customerEmail: z.string().trim().email().max(254),
  customerPhone: z.string().trim().min(7).max(40),
});

export async function createDigitalOrderAction(
  _previous: DigitalOrderActionState,
  formData: FormData,
): Promise<DigitalOrderActionState> {
  if (String(formData.get("website") ?? "").trim()) {
    return { error: "No se pudo procesar el pedido. Inténtalo de nuevo." };
  }
  const input = orderInput.safeParse({
    serviceId: formData.get("service_id"),
    customerName: formData.get("customer_name"),
    customerEmail: formData.get("customer_email"),
    customerPhone: formData.get("customer_phone"),
  });
  if (!input.success) {
    return { error: input.error.issues[0]?.message ?? "Revisa tus datos e inténtalo de nuevo." };
  }

  const protection = await protectContactSubmission(String(formData.get("cf-turnstile-response") ?? ""));
  if (protection !== "allowed") {
    const errors = {
      "invalid-captcha": "Completa la verificación de seguridad para continuar.",
      "rate-limited": "Se alcanzó el límite de pedidos. Espera unos minutos y vuelve a intentar.",
      unavailable: "No fue posible validar el pedido. Inténtalo más tarde o contáctanos por WhatsApp.",
      "configuration-error": "El pedido en línea no está configurado todavía. Contáctanos por WhatsApp.",
    } as const;
    return { error: errors[protection] };
  }

  const config = getSupabaseConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!config || !serviceRoleKey) {
    return { error: "El pedido en línea no está configurado todavía. Contáctanos por WhatsApp." };
  }
  const supabase = createClient<Database>(config.url, serviceRoleKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
  try {
    const { data, error } = await supabase.rpc("create_digital_order", {
      p_service_id: input.data.serviceId,
      p_customer_name: input.data.customerName,
      p_customer_email: input.data.customerEmail,
      p_customer_phone: input.data.customerPhone,
    });
    if (error) {
      const message = error.message ?? "";
      if (message.includes("DIGITAL_PRODUCT_OUT_OF_STOCK")) {
        return { error: "Este plan se acaba de agotar. Escríbenos por WhatsApp para consultar otras opciones." };
      }
      if (message.includes("DIGITAL_PRODUCT_UNAVAILABLE")) {
        return { error: "Este plan ya no está disponible para pedido." };
      }
      console.error(`Digital order creation failed. Supabase code: ${error.code}.`);
      return { error: "No se pudo registrar el pedido. Inténtalo de nuevo o contáctanos por WhatsApp." };
    }
    if (typeof data !== "string") {
      return { error: "No se recibió la referencia del pedido. Contáctanos por WhatsApp." };
    }
    return { orderId: data };
  } catch (error) {
    console.error(`Digital order connection failed. Error type: ${error instanceof Error ? error.name : "UnknownError"}.`);
    return { error: "No fue posible registrar el pedido. Inténtalo más tarde o contáctanos por WhatsApp." };
  }
}

export async function updateDigitalOrderAction(
  _previous: DigitalOrderUpdateState,
  formData: FormData,
): Promise<DigitalOrderUpdateState> {
  const orderId = z.string().uuid().safeParse(formData.get("order_id"));
  const paymentStatus = z.enum(["PENDING", "VERIFIED", "REJECTED", "CANCELLED"]).safeParse(formData.get("payment_status"));
  const deliveryStatus = z.enum(["PENDING", "DELIVERED", "CANCELLED"]).safeParse(formData.get("delivery_status"));
  const deliveredDateRaw = String(formData.get("delivered_at") ?? "").trim();
  const expiresDateRaw = String(formData.get("expires_at") ?? "").trim();
  const notes = z.string().trim().max(2000).safeParse(formData.get("delivery_notes") ?? "");
  if (!orderId.success || !paymentStatus.success || !deliveryStatus.success || !notes.success) {
    return { error: "Los datos del pedido no son válidos." };
  }
  const dateValue = (raw: string) => {
    if (!raw) return null;
    const parsed = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(raw);
    if (!parsed.success) return undefined;
    const date = new Date(`${raw}T12:00:00.000Z`);
    return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw
      ? undefined
      : date.toISOString();
  };
  const deliveredAt = dateValue(deliveredDateRaw);
  const expiresAt = dateValue(expiresDateRaw);
  if (deliveredAt === undefined || expiresAt === undefined) {
    return { error: "Las fechas deben tener un formato válido." };
  }

  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_update_digital_order", {
    p_order_id: orderId.data,
    p_payment_status: paymentStatus.data,
    p_delivery_status: deliveryStatus.data,
    p_delivered_at: deliveredAt,
    p_expires_at: expiresAt,
    p_delivery_notes: notes.data,
  });
  if (error) {
    if (error.message.includes("PAYMENT_MUST_BE_VERIFIED")) {
      return { error: "Verifica el pago antes de registrar la entrega." };
    }
    console.error(`Digital order update failed. Supabase code: ${error.code}.`);
    return { error: "No se pudo actualizar el pedido. Comprueba los estados y las fechas." };
  }
  revalidatePath("/admin/pedidos-digitales");
  return { success: "Pedido actualizado." };
}
