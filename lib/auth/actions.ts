"use server";

import {
  isAuthApiError,
  isAuthRetryableFetchError,
} from "@supabase/supabase-js";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedProfileRole } from "@/lib/auth/identity";
import { getAuthenticatedDestination, getSafeNextPath } from "@/lib/auth/redirects";
import {
  isContactSubmissionConfigured,
  getContactSubmissionConfigurationIssues,
  insertPublicContactMessage,
  protectContactSubmission,
} from "@/lib/contact/server";
import { getConfiguredSiteUrl } from "@/lib/site-url";

export type AuthActionState = {
  error?: string;
  success?: string;
};

const credentialsSchema = z.object({
  email: z.string().trim().email("Escribe un correo electrónico válido.").max(254),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(72),
});

const registrationSchema = credentialsSchema.extend({
  fullName: z.string().trim().min(2, "Escribe tu nombre.").max(120),
  passwordConfirm: z.string(),
}).refine((values) => values.password === values.passwordConfirm, {
  path: ["passwordConfirm"],
  message: "Las contraseñas no coinciden.",
});

const recoverySchema = z.object({
  email: z.string().trim().email("Escribe un correo electrónico válido.").max(254),
});

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Escribe tu nombre.").max(120),
  phone: z.string().trim().max(40, "El teléfono es demasiado largo."),
  avatarUrl: z.union([
    z.literal(""),
    z.string().trim().url("Escribe una URL de imagen válida.").max(2048),
  ]),
});

const contactSchema = z.object({
  name: z.string().trim().min(2, "Escribe tu nombre.").max(120),
  email: z.string().trim().email("Escribe un correo válido.").max(254),
  phone: z.string().trim().max(40, "El teléfono es demasiado largo."),
  subject: z.string().trim().min(3, "El asunto debe tener al menos 3 caracteres.").max(160),
  message: z.string().trim().min(10, "El mensaje debe tener al menos 10 caracteres.").max(5000),
  website: z.string().max(200),
  captchaToken: z.string().trim().max(2048).optional(),
});

const serviceRequestSchema = z.object({
  serviceId: z.union([
    z.literal(""),
    z.string().uuid("El servicio seleccionado no es válido."),
  ]),
  name: z.string().trim().min(2, "Escribe tu nombre.").max(120),
  email: z.string().trim().email("Escribe un correo válido.").max(254),
  phone: z.string().trim().max(40, "El teléfono es demasiado largo."),
  company: z.string().trim().max(160, "El nombre de empresa es demasiado largo."),
  description: z.string().trim().min(20, "Describe tu necesidad con al menos 20 caracteres.").max(5000),
  budget: z.union([
    z.literal(""),
    z.string().regex(/^\d{1,10}(?:\.\d{1,2})?$/, "Escribe un presupuesto válido."),
  ]),
});

function getValue(formData: FormData, name: string): FormDataEntryValue | null {
  return formData.get(name);
}

async function getConfiguredSiteOrigin(): Promise<string> {
  const url = getConfiguredSiteUrl();
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL must be a valid HTTPS origin (HTTP localhost is allowed only in development).",
    );
  }
  return url.origin;
}

export async function signInAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = credentialsSchema.safeParse({
    email: getValue(formData, "email"),
    password: getValue(formData, "password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email.toLowerCase(),
    password: parsed.data.password,
  });
  if (error) {
    if (isAuthRetryableFetchError(error)) {
      return {
        error: "No fue posible conectar con el servicio de autenticación. Inténtalo más tarde.",
      };
    }
    if (isAuthApiError(error)) {
      if (error.code === "invalid_credentials") {
        return { error: "El correo o la contraseña son incorrectos." };
      }
      if (error.code === "email_not_confirmed") {
        return {
          error: "Confirma tu correo electrónico antes de iniciar sesión.",
        };
      }
      if (error.code === "over_request_rate_limit") {
        return {
          error: "Se realizaron demasiados intentos. Espera un momento e inténtalo de nuevo.",
        };
      }
      console.error(
        `Supabase rejected sign-in. Code: ${error.code ?? "UNKNOWN"}; status: ${error.status}.`,
      );
      return {
        error: "El servicio de autenticación rechazó la solicitud. Inténtalo más tarde.",
      };
    }
    console.error(`Supabase sign-in failed. Error type: ${error.name}.`);
    return {
      error: "No se pudo completar el inicio de sesión. Inténtalo más tarde.",
    };
  }
  if (!data.session) {
    return {
      error:
        "Supabase aceptó el inicio de sesión, pero no devolvió una sesión. Inténtalo nuevamente.",
    };
  }

  const identity = await getAuthenticatedProfileRole(supabase);
  if (identity.status === "unauthenticated") {
    return {
      error:
        "El inicio de sesión se aceptó, pero el servidor no pudo leer la sesión. Inténtalo nuevamente.",
    };
  }
  if (identity.status === "claims-error") {
    return {
      error:
        "No se pudo verificar la sesión después de iniciar sesión. Inténtalo nuevamente.",
    };
  }
  if (identity.status === "connection-error") {
    return {
      error: "No se pudo conectar con Supabase para verificar la sesión. Inténtalo más tarde.",
    };
  }
  if (identity.status === "profile-missing") {
    return {
      error:
        "La sesión se inició, pero tu perfil no existe. Contacta al administrador del sitio.",
    };
  }
  if (identity.status === "profile-error") {
    return {
      error:
        "La sesión se inició, pero no se pudo verificar tu perfil. Inténtalo más tarde.",
    };
  }

  const nextPath = getSafeNextPath(getValue(formData, "next"));
  redirect(getAuthenticatedDestination(identity.role, nextPath));
}

export async function signUpAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = registrationSchema.safeParse({
    fullName: getValue(formData, "full_name"),
    email: getValue(formData, "email"),
    password: getValue(formData, "password"),
    passwordConfirm: getValue(formData, "password_confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  }

  let emailRedirectTo: string;
  try {
    const origin = await getConfiguredSiteOrigin();
    emailRedirectTo = new URL(
      "/auth/callback?next=%2Fperfil",
      origin,
    ).toString();
  } catch {
    return {
      error:
        "El registro no está configurado para este dominio. Define NEXT_PUBLIC_SITE_URL.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email.toLowerCase(),
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo,
    },
  });
  if (error) {
    return { error: "No se pudo completar el registro. Inténtalo de nuevo más tarde." };
  }
  if (data.session) redirect("/perfil");
  return {
    success:
      "Si el registro es válido, recibirás un correo para confirmar tu cuenta antes de iniciar sesión.",
  };
}

export async function requestPasswordResetAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = recoverySchema.safeParse({
    email: getValue(formData, "email"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa tu correo." };
  }

  let redirectTo: string;
  try {
    const origin = await getConfiguredSiteOrigin();
    redirectTo = new URL(
      "/auth/callback?flow=reset&next=%2Frecuperar-contrasena",
      origin,
    ).toString();
  } catch {
    return {
      error:
        "La recuperación no está configurada para este dominio. Define NEXT_PUBLIC_SITE_URL.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email.toLowerCase(),
    { redirectTo },
  );
  if (error) {
    return {
      error: "No fue posible solicitar la recuperación. Inténtalo más tarde.",
    };
  }
  return {
    success:
      "Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña.",
  };
}

export async function updatePasswordAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = credentialsSchema
    .pick({ password: true })
    .safeParse({ password: getValue(formData, "password") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa la contraseña." };
  }

  const supabase = await createClient();
  const { data, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !data?.claims?.sub) {
    return { error: "El enlace no es válido o ha caducado. Solicita otro." };
  }
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    return { error: "No se pudo actualizar la contraseña. Solicita un enlace nuevo." };
  }
  redirect("/perfil");
}

export async function updateProfileAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = profileSchema.safeParse({
    fullName: getValue(formData, "full_name"),
    phone: getValue(formData, "phone") ?? "",
    avatarUrl: getValue(formData, "avatar_url") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || typeof userId !== "string") {
    return { error: "Tu sesión no es válida. Inicia sesión nuevamente." };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone || null,
      avatar_url: parsed.data.avatarUrl || null,
    })
    .eq("id", userId)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error(`Unable to update own profile. Supabase code: ${error.code}`);
    return {
      error:
        "No se pudo guardar el perfil. La política profiles_update_own_or_admin debe permitir actualizar únicamente la fila cuyo id coincide con auth.uid().",
    };
  }
  if (!data) {
    return {
      error:
        "No se actualizó ningún perfil. Revisa que profiles_update_own_or_admin permita tu propia fila y que exista el perfil creado por el trigger de Auth.",
    };
  }
  return { success: "Tu perfil se actualizó correctamente." };
}

export async function sendContactMessageAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = contactSchema.safeParse({
    name: getValue(formData, "name"),
    email: getValue(formData, "email"),
    phone: getValue(formData, "phone") ?? "",
    subject: getValue(formData, "subject"),
    message: getValue(formData, "message"),
    website: getValue(formData, "website") ?? "",
    captchaToken: getValue(formData, "cf-turnstile-response") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario." };
  }
  if (parsed.data.website) {
    return { success: "Gracias. Tu mensaje fue recibido." };
  }
  if (!isContactSubmissionConfigured()) {
    console.error(
      `Contact form configuration is incomplete. Missing or invalid settings: ${getContactSubmissionConfigurationIssues().join(", ")}.`,
    );
    return {
      error:
        "El formulario no está configurado por completo. Contacta al administrador del sitio.",
    };
  }

  const protection = await protectContactSubmission(parsed.data.captchaToken ?? "");
  if (protection === "invalid-captcha") {
    return {
      error: "Completa de nuevo la verificación de seguridad e inténtalo otra vez.",
    };
  }
  if (protection === "rate-limited") {
    return {
      error:
        "Se alcanzó el límite temporal de envíos desde esta conexión. Inténtalo más tarde.",
    };
  }
  if (protection === "unavailable") {
    return {
      error:
        "No se pudo conectar con los servicios de protección del formulario. Inténtalo más tarde.",
    };
  }
  if (protection === "configuration-error") {
    return {
      error:
        "La configuración de seguridad del formulario no es válida. Contacta al administrador del sitio.",
    };
  }

  const result = await insertPublicContactMessage({
    name: parsed.data.name,
    email: parsed.data.email.toLowerCase(),
    phone: parsed.data.phone || null,
    subject: parsed.data.subject,
    message: parsed.data.message,
  });
  if (!result.success) {
    console.error(
      `Unable to save contact message. Supabase result: ${result.reason}; code: ${result.code ?? "none"}.`,
    );
    return {
      error:
        result.reason === "connection"
          ? "No se pudo conectar con el servicio de almacenamiento. Inténtalo más tarde."
          : result.reason === "configuration"
            ? "El almacenamiento del formulario no está configurado correctamente. Contacta al administrador del sitio."
            : "No se pudo guardar el mensaje. Inténtalo nuevamente más tarde.",
    };
  }
  revalidatePath("/admin/mensajes");
  return { success: "Gracias. Tu mensaje fue enviado correctamente." };
}

export async function createServiceRequestAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = serviceRequestSchema.safeParse({
    serviceId: getValue(formData, "service_id") ?? "",
    name: getValue(formData, "name"),
    email: getValue(formData, "email"),
    phone: getValue(formData, "phone") ?? "",
    company: getValue(formData, "company") ?? "",
    description: getValue(formData, "description"),
    budget: getValue(formData, "budget") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos de la solicitud." };
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || typeof userId !== "string") {
    return {
      error: "Inicia sesión para enviar una solicitud de servicio.",
    };
  }

  const serviceId = parsed.data.serviceId || null;
  if (serviceId) {
    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("id")
      .eq("id", serviceId)
      .eq("status", "ACTIVE")
      .maybeSingle();
    if (serviceError || !service) {
      return {
        error: "El servicio ya no está disponible. Actualiza la página e inténtalo de nuevo.",
      };
    }
  }

  const budget = parsed.data.budget ? Number(parsed.data.budget) : null;
  if (budget !== null && (!Number.isFinite(budget) || budget < 0 || budget > 9999999999.99)) {
    return { error: "El presupuesto indicado no es válido." };
  }

  const { error } = await supabase.from("service_requests").insert({
    user_id: userId,
    service_id: serviceId,
    name: parsed.data.name,
    email: parsed.data.email.toLowerCase(),
    phone: parsed.data.phone || null,
    company: parsed.data.company || null,
    description: parsed.data.description,
    budget,
    status: "PENDIENTE",
    priority: "NORMAL",
  });
  if (error) {
    console.error(`Unable to create service request. Supabase code: ${error.code}`);
    return {
      error:
        "No se pudo guardar la solicitud. Verifica que las políticas service_requests_create_own y service_requests_read_own_or_admin permitan crear una fila propia.",
    };
  }
  return { success: "Tu solicitud fue enviada. Puedes consultar su estado en Mis solicitudes." };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) {
    console.error(`Unable to sign out. Supabase code: ${error.code}`);
    redirect("/perfil?error=signout");
  }
  redirect("/");
}
