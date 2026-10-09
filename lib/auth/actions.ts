"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

function getValue(formData: FormData, name: string): FormDataEntryValue | null {
  return formData.get(name);
}

function safeNextPath(value: FormDataEntryValue | null): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return "/perfil";
  }
  return value;
}

async function getConfiguredSiteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured && process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }
  if (!configured) {
    throw new Error("NEXT_PUBLIC_SITE_URL is required for Auth email redirects.");
  }
  const url = new URL(configured);
  if (
    !["https:", "http:"].includes(url.protocol) ||
    (url.protocol === "http:" && url.hostname !== "localhost")
  ) {
    throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS.");
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
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email.toLowerCase(),
    password: parsed.data.password,
  });
  if (error) {
    return { error: "No se pudo iniciar sesión. Revisa tus datos e inténtalo de nuevo." };
  }
  redirect(safeNextPath(getValue(formData, "next")));
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

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) {
    console.error(`Unable to sign out. Supabase code: ${error.code}`);
    redirect("/perfil?error=signout");
  }
  redirect("/");
}
