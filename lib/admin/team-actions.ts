"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { validateMediaFile } from "@/lib/admin/media-validation";
import { requireAdmin } from "@/lib/auth/identity";
import type { Database } from "@/types/database";

export type TeamActionState = {
  error?: string;
  success?: string;
  warning?: string;
};

type TeamMemberRow = Database["public"]["Tables"]["team_members"]["Row"];
const bucket = "site-media";
const idSchema = z.string().uuid();
const founderName = "Johnny Grefa";
const founderPosition = "Fundador y responsable de la marca";
const founderSlug = "johnny-grefa";

function value(formData: FormData, name: string): string {
  const entry = formData.get(name);
  return typeof entry === "string" ? entry.trim() : "";
}

function optionalImage(formData: FormData): File | null {
  const entry = formData.get("avatar_file");
  return entry instanceof File && entry.size > 0 ? entry : null;
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function validatedHttpsUrl(
  raw: string,
  kind: "linkedin" | "website",
): string | null | false {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      (kind === "linkedin" &&
        !/(^|\.)linkedin\.com$/i.test(url.hostname))
    ) {
      return false;
    }
    return url.toString();
  } catch {
    return false;
  }
}

async function removeUnusedAvatar(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  path: string | null,
  memberId: string,
): Promise<boolean> {
  if (!path) return true;
  const { data: references, error: lookupError } = await supabase
    .from("team_members")
    .select("id")
    .eq("avatar_path", path)
    .neq("id", memberId)
    .limit(1);
  if (lookupError) {
    console.error(
      `Team avatar reference check failed. Supabase code: ${lookupError.code}.`,
    );
    return false;
  }
  if (references.length > 0) return true;

  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    console.error(
      `Team avatar cleanup failed. Storage status: ${error.statusCode ?? "unknown"}.`,
    );
    return false;
  }
  return true;
}

function revalidateTeam() {
  revalidatePath("/");
  revalidatePath("/admin/equipo");
}

export async function saveTeamMemberAction(
  _previous: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const { supabase } = await requireAdmin();
  const memberIdValue = value(formData, "member_id");
  const memberId = memberIdValue ? idSchema.safeParse(memberIdValue) : null;
  if (memberId && !memberId.success) {
    return { error: "El perfil seleccionado no es válido." };
  }

  let existing: TeamMemberRow | null = null;
  if (memberId?.success) {
    const { data, error } = await supabase
      .from("team_members")
      .select("*")
      .eq("id", memberId.data)
      .maybeSingle();
    if (error || !data) {
      if (error) {
        console.error(`Team member lookup failed. Supabase code: ${error.code}.`);
      }
      return { error: "No se encontró el perfil seleccionado." };
    }
    existing = data;
  }

  const isFounder = existing?.member_type === "FOUNDER";
  if (existing && !isFounder && existing.member_type !== "COLLABORATOR") {
    return { error: "El tipo de perfil seleccionado no es válido." };
  }

  const fullName = isFounder ? founderName : value(formData, "full_name");
  const position = isFounder
    ? founderPosition
    : value(formData, "position");
  const specialty = isFounder ? "" : value(formData, "specialty");
  const bio = value(formData, "bio");
  const requestedSlug = value(formData, "slug");
  const slug =
    isFounder
      ? founderSlug
      : slugify(requestedSlug || fullName) ||
        `colaborador-${crypto.randomUUID().slice(0, 8)}`;
  const slugResult = z
    .string()
    .min(1)
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .safeParse(slug);
  const order = z.coerce
    .number()
    .int()
    .min(0)
    .max(100000)
    .safeParse(value(formData, "display_order") || "0");
  const linkedinUrl = validatedHttpsUrl(
    value(formData, "linkedin_url"),
    "linkedin",
  );
  const websiteUrl = validatedHttpsUrl(
    value(formData, "website_url"),
    "website",
  );
  const isActive = formData.get("is_active") === "on";
  const isFeatured =
    !isFounder && formData.get("is_featured") === "on";
  const image = optionalImage(formData);
  const removeAvatar = formData.get("remove_avatar") === "on";

  if (
    fullName.length > 120 ||
    position.length > 160 ||
    specialty.length > 160 ||
    bio.length > 2000
  ) {
    return { error: "Uno o más campos superan el límite permitido." };
  }
  if (!slugResult.success) {
    return { error: "Usa un slug con letras minúsculas, números y guiones." };
  }
  if (!order.success) {
    return { error: "El orden debe ser un número entero entre 0 y 100.000." };
  }
  if (linkedinUrl === false) {
    return { error: "Ingresa una URL HTTPS válida de LinkedIn." };
  }
  if (websiteUrl === false) {
    return { error: "El sitio web debe usar una URL HTTPS válida." };
  }
  if (removeAvatar && image) {
    return { error: "Selecciona una imagen o marca la opción para quitarla, no ambas." };
  }
  if (
    isActive &&
    (fullName.length < 2 ||
      position.length < 2 ||
      bio.length < 10 ||
      (!isFounder && specialty.length < 2) ||
      (!image && (removeAvatar || !existing?.avatar_path)))
  ) {
    return {
      error:
        "Para publicar, completa nombre, cargo, especialidad y biografía, y carga una fotografía real. El fundador no requiere especialidad.",
    };
  }

  const id = existing?.id ?? crypto.randomUUID();
  let uploadedPath: string | null = null;
  try {
    let avatarPath = removeAvatar ? null : existing?.avatar_path ?? null;
    let avatarUrl = removeAvatar ? null : existing?.avatar_url ?? null;

    if (image) {
      const validation = await validateMediaFile(image, "image");
      if (!validation.success) return { error: validation.error };
      uploadedPath = `team-members/${id}/${crypto.randomUUID()}.${validation.extension}`;
      const { error } = await supabase.storage.from(bucket).upload(
        uploadedPath,
        image,
        {
          cacheControl: "31536000",
          contentType: validation.mimeType,
          upsert: false,
        },
      );
      if (error) {
        console.error(
          `Team avatar upload failed. Storage status: ${error.statusCode ?? "unknown"}.`,
        );
        return {
          error:
            "No se pudo subir la fotografía. Comprueba los permisos de Storage e inténtalo de nuevo.",
        };
      }
      avatarPath = uploadedPath;
      avatarUrl = supabase.storage.from(bucket).getPublicUrl(uploadedPath)
        .data.publicUrl;
    }

    const input = {
      member_type: isFounder ? "FOUNDER" as const : "COLLABORATOR" as const,
      full_name: fullName,
      slug: slugResult.data,
      position,
      specialty,
      bio,
      avatar_url: avatarUrl,
      avatar_path: avatarPath,
      linkedin_url: linkedinUrl,
      website_url: websiteUrl,
      display_order: order.data,
      is_featured: isFeatured,
      is_active: isActive,
    };

    let error: { code: string } | null = null;
    if (existing) {
      const result = await supabase
        .from("team_members")
        .update(input)
        .eq("id", existing.id);
      error = result.error;
    } else {
      const result = await supabase
        .from("team_members")
        .insert({ id, ...input });
      error = result.error;
    }

    if (error) {
      console.error(`Team member save failed. Supabase code: ${error.code}.`);
      if (uploadedPath) {
        await supabase.storage.from(bucket).remove([uploadedPath]);
      }
      return {
        error:
          error.code === "23505"
            ? "Ese slug ya está en uso. Elige uno distinto."
            : "No se pudo guardar el perfil. Comprueba que la migración esté aplicada.",
      };
    }

    const oldAvatarPath =
      existing?.avatar_path && existing.avatar_path !== avatarPath
        ? existing.avatar_path
        : null;
    const cleanupSucceeded = await removeUnusedAvatar(
      supabase,
      oldAvatarPath,
      id,
    );
    revalidateTeam();
    return {
      success: isFounder ? "Perfil del fundador actualizado." : "Perfil guardado.",
      warning: cleanupSucceeded
        ? undefined
        : "El perfil se guardó, pero la fotografía anterior no pudo eliminarse de Storage.",
    };
  } catch (error) {
    if (uploadedPath) {
      const { error: cleanupError } = await supabase.storage
        .from(bucket)
        .remove([uploadedPath]);
      if (cleanupError) {
        console.error(
          `Team upload rollback failed. Storage status: ${cleanupError.statusCode ?? "unknown"}.`,
        );
      }
    }
    console.error(
      `Team member save failed. Error type: ${
        error instanceof Error ? error.name : "UnknownError"
      }.`,
    );
    return { error: "No se pudo guardar el perfil. Inténtalo de nuevo." };
  }
}

export async function deleteTeamMemberAction(
  _previous: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const { supabase } = await requireAdmin();
  const id = idSchema.safeParse(value(formData, "member_id"));
  if (!id.success) return { error: "El perfil seleccionado no es válido." };

  const { data: member, error: lookupError } = await supabase
    .from("team_members")
    .select("id,member_type,avatar_path")
    .eq("id", id.data)
    .maybeSingle();
  if (lookupError || !member) {
    return { error: "No se encontró el perfil seleccionado." };
  }
  if (member.member_type === "FOUNDER") {
    return { error: "El perfil del fundador no se puede eliminar." };
  }

  const { data, error } = await supabase
    .from("team_members")
    .delete()
    .eq("id", id.data)
    .eq("member_type", "COLLABORATOR")
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error(
      `Team member delete failed. Supabase code: ${error?.code ?? "NO_ROW"}.`,
    );
    return { error: "No se pudo eliminar el perfil." };
  }

  const cleanupSucceeded = await removeUnusedAvatar(
    supabase,
    member.avatar_path,
    member.id,
  );
  revalidateTeam();
  return {
    success: "Perfil eliminado.",
    warning: cleanupSucceeded
      ? undefined
      : "El perfil se eliminó, pero su fotografía aún permanece en Storage.",
  };
}
