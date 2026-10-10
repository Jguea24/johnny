"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/identity";
import { validateMediaFile, type ExpectedMediaKind } from "@/lib/admin/media-validation";
import type { Database, HeroMediaType } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

export type HeroActionState = {
  error?: string;
  success?: string;
  warning?: string;
};

type ServerClient = SupabaseClient<Database>;
type HeroSlideRow = Database["public"]["Tables"]["hero_slides"]["Row"];

const idSchema = z.string().uuid("La diapositiva seleccionada no es válida.");
const mediaTypes = ["image", "video"] as const satisfies readonly HeroMediaType[];
const bucket = "site-media";

function value(formData: FormData, name: string): string {
  const entry = formData.get(name);
  return typeof entry === "string" ? entry : "";
}

function optionalFile(formData: FormData, name: string): File | null {
  const entry = formData.get(name);
  return entry instanceof File && entry.size > 0 ? entry : null;
}

function validateDestination(raw: string) {
  const value = raw.trim();
  if (!value) return { success: true as const, data: null };
  if (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !/[\u0000-\u001f\u007f]/.test(value)
  ) {
    try {
      const url = new URL(value, "https://johnny.invalid");
      if (url.origin === "https://johnny.invalid") {
        return {
          success: true as const,
          data: `${url.pathname}${url.search}${url.hash}`,
        };
      }
    } catch {
      return {
        success: false as const,
        message: "El destino del botón no es válido.",
      };
    }
  }
  try {
    const url = new URL(value);
    if (url.protocol === "https:") {
      return { success: true as const, data: url.toString() };
    }
  } catch {
    return {
      success: false as const,
      message: "Usa una ruta interna como /contacto o una URL HTTPS.",
    };
  }
  return {
    success: false as const,
    message: "Usa una ruta interna como /contacto o una URL HTTPS.",
  };
}

async function uploadValidatedFile(
  supabase: ServerClient,
  file: File,
  id: string,
  expectedKind: ExpectedMediaKind,
): Promise<
  | { success: true; path: string }
  | { success: false; error: string }
> {
  const validation = await validateMediaFile(file, expectedKind);
  if (!validation.success) return validation;

  const path = `hero-slides/${id}/${crypto.randomUUID()}.${validation.extension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "31536000",
    contentType: validation.mimeType,
    upsert: false,
  });
  if (error) {
    console.error(
      `Hero media upload failed. Storage status: ${error.statusCode ?? "unknown"}.`,
    );
    return {
      success: false,
      error: "No se pudo subir el archivo. Comprueba la configuración de Storage e inténtalo de nuevo.",
    };
  }
  return { success: true, path };
}

async function removeFiles(
  supabase: ServerClient,
  paths: (string | null | undefined)[],
): Promise<boolean> {
  const safePaths = [...new Set(paths.filter((path): path is string => Boolean(path)))];
  if (safePaths.length === 0) return true;
  const { error } = await supabase.storage.from(bucket).remove(safePaths);
  if (error) {
    console.error(
      `Hero media cleanup failed. Storage status: ${error.statusCode ?? "unknown"}.`,
    );
    return false;
  }
  return true;
}

function actionError(error: unknown): HeroActionState {
  console.error(
    `Hero carousel admin action failed. Error type: ${
      error instanceof Error ? error.name : "UnknownError"
    }.`,
  );
  return {
    error: "No se pudo completar la operación del carrusel. Inténtalo de nuevo.",
  };
}

function revalidateCarousel() {
  revalidatePath("/");
  revalidatePath("/admin/carrusel");
}

export async function saveHeroSlideAction(
  _previous: HeroActionState,
  formData: FormData,
): Promise<HeroActionState> {
  const { supabase } = await requireAdmin();
  const operation = value(formData, "operation");
  if (operation !== "create" && operation !== "update") {
    return { error: "La operación solicitada no es válida." };
  }

  const title = z.string().trim().min(2).max(120).safeParse(value(formData, "title"));
  const description = z.string().trim().min(2).max(1000).safeParse(
    value(formData, "description"),
  );
  const mediaType = z.enum(mediaTypes).safeParse(value(formData, "media_type"));
  const altText = z.string().trim().max(300).safeParse(value(formData, "alt_text"));
  const ctaText = z.string().trim().max(60).safeParse(value(formData, "cta_text"));
  const sortOrder = z.coerce.number().int().min(0).max(100000).safeParse(
    value(formData, "sort_order"),
  );
  const idResult =
    operation === "update"
      ? idSchema.safeParse(value(formData, "slide_id"))
      : null;
  if (
    !title.success ||
    !description.success ||
    !mediaType.success ||
    !altText.success ||
    !ctaText.success ||
    !sortOrder.success ||
    (idResult && !idResult.success)
  ) {
    return {
      error:
        (!title.success && "El título debe tener entre 2 y 120 caracteres.") ||
        (!description.success && "La descripción debe tener entre 2 y 1000 caracteres.") ||
        (!mediaType.success && "Selecciona imagen o video.") ||
        (!altText.success && "El texto alternativo es demasiado largo.") ||
        (!ctaText.success && "El texto del botón no puede superar 60 caracteres.") ||
        (!sortOrder.success && "El orden debe ser un entero positivo.") ||
        "La diapositiva seleccionada no es válida.",
    };
  }
  if (mediaType.data === "image" && altText.data.length < 2) {
    return { error: "El texto alternativo es obligatorio para las imágenes." };
  }
  if (mediaType.data === "video" && altText.data) {
    return { error: "El texto alternativo solo aplica a imágenes; deja este campo vacío para videos." };
  }

  const rawCtaUrl = value(formData, "cta_url");
  const ctaUrl = validateDestination(rawCtaUrl);
  if (!ctaUrl.success) return { error: ctaUrl.message };
  if (Boolean(ctaText.data) !== Boolean(ctaUrl.data)) {
    return { error: "Completa tanto el texto como el destino del botón, o deja ambos vacíos." };
  }

  let existing: HeroSlideRow | null = null;
  if (operation === "update" && idResult?.success) {
    const { data, error } = await supabase
      .from("hero_slides")
      .select("*")
      .eq("id", idResult.data)
      .maybeSingle();
    if (error || !data) {
      if (error) {
        console.error(`Hero slide lookup failed. Supabase code: ${error.code}.`);
      }
      return { error: "No se encontró la diapositiva para actualizar." };
    }
    existing = data;
    if (existing.media_type !== mediaType.data && !optionalFile(formData, "media_file")) {
      return { error: "Sube un archivo nuevo al cambiar entre imagen y video." };
    }
  }

  const id = existing?.id ?? crypto.randomUUID();
  const mediaFile = optionalFile(formData, "media_file");
  const posterFile = optionalFile(formData, "poster_file");
  const uploadedPaths: string[] = [];
  try {
    let mediaPath = existing?.media_path ?? "";
    if (mediaFile) {
      const result = await uploadValidatedFile(
        supabase,
        mediaFile,
        id,
        mediaType.data,
      );
      if (!result.success) return { error: result.error };
      mediaPath = result.path;
      uploadedPaths.push(result.path);
    } else if (!existing) {
      return { error: "Selecciona un archivo multimedia para la diapositiva." };
    }

    let posterPath =
      mediaType.data === "video" && !formData.has("clear_poster")
        ? existing?.poster_path ?? null
        : null;
    if (posterFile) {
      const result = await uploadValidatedFile(
        supabase,
        posterFile,
        id,
        "image",
      );
      if (!result.success) {
        await removeFiles(supabase, uploadedPaths);
        return { error: result.error };
      }
      posterPath = result.path;
      uploadedPaths.push(result.path);
    }
    if (mediaType.data === "image") posterPath = null;

    const input = {
      title: title.data,
      description: description.data,
      media_type: mediaType.data,
      media_path: mediaPath,
      alt_text: mediaType.data === "image" ? altText.data : null,
      poster_path: posterPath,
      cta_text: ctaText.data || null,
      cta_url: ctaUrl.data,
      sort_order: sortOrder.data,
      is_active: formData.get("is_active") === "on",
    };

    if (operation === "create") {
      const { error } = await supabase.from("hero_slides").insert({ id, ...input });
      if (error) {
        console.error(`Hero slide create failed. Supabase code: ${error.code}.`);
        await removeFiles(supabase, uploadedPaths);
        return { error: "No se pudo guardar la diapositiva. Comprueba que la migración esté aplicada." };
      }
    } else if (idResult?.success) {
      const { data, error } = await supabase
        .from("hero_slides")
        .update(input)
        .eq("id", idResult.data)
        .select("id")
        .maybeSingle();
      if (error || !data) {
        if (error) {
          console.error(`Hero slide update failed. Supabase code: ${error.code}.`);
        }
        await removeFiles(supabase, uploadedPaths);
        return { error: "No se pudo guardar la diapositiva." };
      }
    }

    const oldPaths = [
      existing?.media_path !== mediaPath ? existing?.media_path : null,
      existing?.poster_path !== posterPath ? existing?.poster_path : null,
    ];
    const cleanupSucceeded = await removeFiles(supabase, oldPaths);
    revalidateCarousel();
    return {
      success: operation === "create" ? "Diapositiva creada." : "Diapositiva actualizada.",
      warning: cleanupSucceeded
        ? undefined
        : "Los cambios se guardaron, pero un archivo anterior no pudo eliminarse de Storage.",
    };
  } catch (error) {
    await removeFiles(supabase, uploadedPaths);
    return actionError(error);
  }
}

export async function deleteHeroSlideAction(
  _previous: HeroActionState,
  formData: FormData,
): Promise<HeroActionState> {
  const { supabase } = await requireAdmin();
  const id = idSchema.safeParse(value(formData, "slide_id"));
  if (!id.success) return { error: "La diapositiva seleccionada no es válida." };

  const { data: slide, error: lookupError } = await supabase
    .from("hero_slides")
    .select("id,media_path,poster_path")
    .eq("id", id.data)
    .maybeSingle();
  if (lookupError || !slide) {
    return { error: "No se encontró la diapositiva." };
  }
  const { data, error } = await supabase
    .from("hero_slides")
    .delete()
    .eq("id", id.data)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error(`Hero slide delete failed. Supabase code: ${error?.code ?? "NO_ROW"}.`);
    return { error: "No se pudo eliminar la diapositiva." };
  }
  const cleanupSucceeded = await removeFiles(supabase, [
    slide.media_path,
    slide.poster_path,
  ]);
  revalidateCarousel();
  return {
    success: "Diapositiva eliminada.",
    warning: cleanupSucceeded
      ? undefined
      : "La diapositiva se eliminó, pero sus archivos aún permanecen en Storage.",
  };
}

export async function reorderHeroSlideAction(
  _previous: HeroActionState,
  formData: FormData,
): Promise<HeroActionState> {
  const { supabase } = await requireAdmin();
  const id = idSchema.safeParse(value(formData, "slide_id"));
  const direction = z.enum(["up", "down"]).safeParse(value(formData, "direction"));
  if (!id.success || !direction.success) {
    return { error: "La ordenación solicitada no es válida." };
  }

  const { data: moved, error } = await supabase.rpc("reorder_hero_slide", {
    p_slide_id: id.data,
    p_direction: direction.data,
  });
  if (error) {
    console.error(`Hero slide reorder failed. Supabase code: ${error.code}.`);
    return { error: "No se pudo cambiar el orden de las diapositivas." };
  }
  if (!moved) {
    return { error: "La diapositiva ya está en ese extremo del orden." };
  }
  revalidateCarousel();
  return { success: "Orden actualizado." };
}

export async function saveHeroCarouselSettingsAction(
  _previous: HeroActionState,
  formData: FormData,
): Promise<HeroActionState> {
  const { supabase } = await requireAdmin();
  const interval = z
    .coerce
    .number()
    .int()
    .min(3000)
    .max(2147483647)
    .safeParse(value(formData, "autoplay_interval_ms"));
  if (!interval.success) {
    return {
      error: "El intervalo debe ser un entero entre 3.000 y 2.147.483.647 ms.",
    };
  }

  try {
    const { data, error } = await supabase
      .from("hero_carousel_settings")
      .update({
        autoplay_enabled: formData.get("autoplay_enabled") === "on",
        autoplay_interval_ms: interval.data,
        show_arrows: formData.get("show_arrows") === "on",
        show_indicators: formData.get("show_indicators") === "on",
      })
      .eq("id", 1)
      .select("id")
      .maybeSingle();
    if (error || !data) {
      console.error(
        `Hero carousel settings update failed. Supabase code: ${error?.code ?? "NO_ROW"}.`,
      );
      return { error: "No se pudo guardar la configuración. Comprueba que la migración esté aplicada." };
    }
    revalidateCarousel();
    return { success: "Configuración del carrusel guardada." };
  } catch (error) {
    return actionError(error);
  }
}
