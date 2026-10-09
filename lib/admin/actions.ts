"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/identity";
import { publicSiteSettingKeys } from "@/lib/site-settings";
import type {
  CategoryType,
  ContactMessageStatus,
  ProjectStatus,
  ServiceRequestStatus,
  ServiceStatus,
  TestimonialStatus,
} from "@/types/database";

export type AdminActionState = {
  error?: string;
  success?: string;
};

const idSchema = z.string().uuid("El registro seleccionado no es válido.");
const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Usa un slug en minúsculas separado por guiones.");
const requiredText = (min: number, max: number) =>
  z.string().trim().min(min).max(max);
const optionalText = (max: number) => z.string().trim().max(max);
const serviceStatuses = ["DRAFT", "ACTIVE", "INACTIVE"] as const satisfies readonly ServiceStatus[];
const projectStatuses = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const satisfies readonly ProjectStatus[];
const requestStatuses = [
  "PENDIENTE",
  "EN_REVISION",
  "EN_PROCESO",
  "COMPLETADA",
  "CANCELADA",
] as const satisfies readonly ServiceRequestStatus[];
const messageStatuses = ["NUEVO", "LEIDO", "RESPONDIDO", "ARCHIVADO"] as const satisfies readonly ContactMessageStatus[];
const testimonialStatuses = ["DRAFT", "ACTIVE", "INACTIVE"] as const satisfies readonly TestimonialStatus[];

const allowedPublicSettingKeys = new Set<string>(publicSiteSettingKeys);

function value(formData: FormData, key: string): string {
  const field = formData.get(key);
  return typeof field === "string" ? field : "";
}

function actionError(error: unknown, fallback: string): AdminActionState {
  if (error instanceof Error && error.message === "ADMIN_FORBIDDEN") {
    return { error: "No tienes autorización para realizar esta operación." };
  }
  console.error(
    `Unable to perform admin operation. Error type: ${
      error instanceof Error ? error.name : "UnknownError"
    }`,
  );
  return { error: fallback };
}

function optionalUrl(value: string, label: string) {
  if (!value) return { success: true as const, data: null };
  const parsed = z.string().url().max(2048).safeParse(value);
  if (!parsed.success) {
    return { success: false as const, message: `${label} debe ser una URL válida.` };
  }
  const protocol = new URL(parsed.data).protocol;
  if (protocol !== "https:" && protocol !== "http:") {
    return { success: false as const, message: `${label} debe usar HTTP o HTTPS.` };
  }
  return { success: true as const, data: parsed.data };
}

function parseNullablePrice(raw: string) {
  if (!raw) return { success: true as const, data: null };
  const parsed = z
    .string()
    .regex(/^\d{1,10}(?:\.\d{1,2})?$/)
    .safeParse(raw);
  if (!parsed.success) {
    return { success: false as const, message: "El precio debe ser positivo con hasta dos decimales." };
  }
  return { success: true as const, data: Number(parsed.data) };
}

function parseCategoryId(raw: string) {
  if (!raw) return { success: true as const, data: null };
  const parsed = idSchema.safeParse(raw);
  return parsed.success
    ? { success: true as const, data: parsed.data }
    : { success: false as const, message: "Selecciona una categoría válida." };
}

function parsePublicSettingValue(key: string, raw: string) {
  const maxLength =
    key === "site.title"
      ? 80
      : key === "site.description"
        ? 300
        : key === "contact.phone"
          ? 40
          : key === "contact.location"
            ? 120
            : 1000;
  const value = requiredText(1, maxLength).safeParse(raw);
  if (!value.success) {
    return {
      success: false as const,
      message: `El valor es obligatorio y no puede superar ${maxLength} caracteres.`,
    };
  }
  if (key === "contact.email" && !z.string().email().safeParse(value.data).success) {
    return { success: false as const, message: "Escribe un correo público válido." };
  }
  if (key.startsWith("social.")) {
    const url = optionalUrl(value.data, "El enlace social");
    if (!url.success || !url.data || new URL(url.data).protocol !== "https:") {
      return {
        success: false as const,
        message: "El enlace social debe ser una URL HTTPS válida.",
      };
    }
    return { success: true as const, data: url.data };
  }
  return { success: true as const, data: value.data };
}

async function revalidateAdminPaths(section: string) {
  revalidatePath("/admin");
  revalidatePath(`/admin/${section}`);
  if (section === "servicios") {
    revalidatePath("/servicios");
    revalidatePath("/", "page");
  }
  if (section === "proyectos") {
    revalidatePath("/proyectos");
    revalidatePath("/", "page");
  }
}

export async function adminMutationAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const operation = value(formData, "operation");
  const section = value(formData, "section");
  const recordId = value(formData, "record_id");
  const { supabase } = await requireAdmin();
  try {
    if (section === "servicios") {
      if (!["create", "update", "delete"].includes(operation)) {
        return { error: "Operación no permitida." };
      }
      if (operation === "delete") {
        const id = idSchema.safeParse(recordId);
        if (!id.success) return { error: "El servicio seleccionado no es válido." };
        const { data, error } = await supabase.from("services").delete().eq("id", id.data).select("id").maybeSingle();
        if (error || !data) {
          console.error(`Admin service delete failed. Supabase code: ${error?.code ?? "NO_ROW"}`);
          return { error: "No se pudo eliminar el servicio. Verifica permisos y relaciones." };
        }
      } else {
        const title = requiredText(2, 180).safeParse(value(formData, "title"));
        const slug = slugSchema.safeParse(value(formData, "slug"));
        const shortDescription = requiredText(3, 500).safeParse(value(formData, "short_description"));
        const description = requiredText(3, 12000).safeParse(value(formData, "description"));
        const icon = optionalText(80).safeParse(value(formData, "icon"));
        const categoryId = parseCategoryId(value(formData, "category_id"));
        const status = z.enum(serviceStatuses).safeParse(value(formData, "status"));
        const sortOrder = z.coerce.number().int().min(-100000).max(100000).safeParse(value(formData, "sort_order"));
        const price = parseNullablePrice(value(formData, "price"));
        const imageUrl = optionalUrl(value(formData, "image_url"), "La imagen");
        if (!title.success || !slug.success || !shortDescription.success || !description.success || !icon.success || !categoryId.success || !status.success || !sortOrder.success || !price.success || !imageUrl.success) {
          return { error: (!title.success && title.error.issues[0]?.message) || (!slug.success && slug.error.issues[0]?.message) || (!shortDescription.success && shortDescription.error.issues[0]?.message) || (!description.success && description.error.issues[0]?.message) || (!icon.success && icon.error.issues[0]?.message) || (!categoryId.success && categoryId.message) || (!status.success && "El estado de servicio no es válido.") || (!sortOrder.success && "El orden debe ser un número entero válido.") || (!price.success && price.message) || (!imageUrl.success && imageUrl.message) || "Revisa los datos del servicio." };
        }
        if (categoryId.data) {
          const { data: category, error } = await supabase
            .from("categories")
            .select("id")
            .eq("id", categoryId.data)
            .eq("type", "SERVICE")
            .maybeSingle();
          if (error || !category) {
            return { error: "Selecciona una categoría válida para servicios." };
          }
        }
        const input = {
          title: title.data,
          slug: slug.data,
          short_description: shortDescription.data,
          description: description.data,
          icon: icon.data || null,
          image_url: imageUrl.data,
          category_id: categoryId.data,
          price: price.data,
          status: status.data,
          sort_order: sortOrder.data,
        };
        if (operation === "create") {
          const { error } = await supabase.from("services").insert(input);
          if (error) {
            console.error(`Admin service create failed. Supabase code: ${error.code}`);
            return { error: "No se pudo crear el servicio. Comprueba que el slug no esté en uso." };
          }
        } else {
          const id = idSchema.safeParse(recordId);
          if (!id.success) return { error: "El servicio seleccionado no es válido." };
          const { data, error } = await supabase.from("services").update(input).eq("id", id.data).select("id").maybeSingle();
          if (error || !data) {
            console.error(`Admin service update failed. Supabase code: ${error?.code ?? "NO_ROW"}`);
            return { error: "No se pudo actualizar el servicio. Comprueba que el slug no esté en uso." };
          }
        }
      }
      await revalidateAdminPaths(section);
      return { success: "El servicio se guardó correctamente." };
    }

    if (section === "proyectos") {
      if (!["create", "update", "delete"].includes(operation)) {
        return { error: "Operación no permitida." };
      }
      if (operation === "delete") {
        const id = idSchema.safeParse(recordId);
        if (!id.success) return { error: "El proyecto seleccionado no es válido." };
        const { data, error } = await supabase.from("projects").delete().eq("id", id.data).select("id").maybeSingle();
        if (error || !data) {
          console.error(`Admin project delete failed. Supabase code: ${error?.code ?? "NO_ROW"}`);
          return { error: "No se pudo eliminar el proyecto. Verifica los permisos." };
        }
      } else {
        const title = requiredText(2, 180).safeParse(value(formData, "title"));
        const slug = slugSchema.safeParse(value(formData, "slug"));
        const shortDescription = requiredText(3, 500).safeParse(value(formData, "short_description"));
        const description = requiredText(3, 12000).safeParse(value(formData, "description"));
        const categoryId = parseCategoryId(value(formData, "category_id"));
        const status = z.enum(projectStatuses).safeParse(value(formData, "status"));
        const mainImage = optionalUrl(value(formData, "main_image"), "La imagen principal");
        const demoUrl = optionalUrl(value(formData, "demo_url"), "La URL de demostración");
        const repositoryUrl = optionalUrl(value(formData, "repository_url"), "La URL del repositorio");
        const technologies = value(formData, "technologies")
          .split(/\r?\n/)
          .map((item) => item.trim())
          .filter(Boolean);
        if (technologies.length > 40 || technologies.some((item) => item.length > 80)) {
          return { error: "Indica hasta 40 tecnologías, con un máximo de 80 caracteres cada una." };
        }
        if (!title.success || !slug.success || !shortDescription.success || !description.success || !categoryId.success || !status.success || !mainImage.success || !demoUrl.success || !repositoryUrl.success) {
          return { error: (!title.success && title.error.issues[0]?.message) || (!slug.success && slug.error.issues[0]?.message) || (!shortDescription.success && shortDescription.error.issues[0]?.message) || (!description.success && description.error.issues[0]?.message) || (!categoryId.success && categoryId.message) || (!status.success && "El estado de proyecto no es válido.") || (!mainImage.success && mainImage.message) || (!demoUrl.success && demoUrl.message) || (!repositoryUrl.success && repositoryUrl.message) || "Revisa los datos del proyecto." };
        }
        if (categoryId.data) {
          const { data: category, error } = await supabase
            .from("categories")
            .select("id")
            .eq("id", categoryId.data)
            .eq("type", "PROJECT")
            .maybeSingle();
          if (error || !category) {
            return { error: "Selecciona una categoría válida para proyectos." };
          }
        }
        const input = {
          title: title.data,
          slug: slug.data,
          short_description: shortDescription.data,
          description: description.data,
          category_id: categoryId.data,
          main_image: mainImage.data,
          demo_url: demoUrl.data,
          repository_url: repositoryUrl.data,
          technologies,
          status: status.data,
          featured: value(formData, "featured") === "on",
        };
        if (operation === "create") {
          const { error } = await supabase.from("projects").insert(input);
          if (error) {
            console.error(`Admin project create failed. Supabase code: ${error.code}`);
            return { error: "No se pudo crear el proyecto. Comprueba que el slug no esté en uso." };
          }
        } else {
          const id = idSchema.safeParse(recordId);
          if (!id.success) return { error: "El proyecto seleccionado no es válido." };
          const { data, error } = await supabase.from("projects").update(input).eq("id", id.data).select("id").maybeSingle();
          if (error || !data) {
            console.error(`Admin project update failed. Supabase code: ${error?.code ?? "NO_ROW"}`);
            return { error: "No se pudo actualizar el proyecto. Comprueba que el slug no esté en uso." };
          }
        }
      }
      await revalidateAdminPaths(section);
      return { success: "El proyecto se guardó correctamente." };
    }

    if (section === "categorias") {
      if (!["create", "update", "delete"].includes(operation)) {
        return { error: "Operación no permitida." };
      }
      const id = operation === "create" ? null : idSchema.safeParse(recordId);
      if (operation !== "create" && id && !id.success) {
        return { error: "La categoría seleccionada no es válida." };
      }
      if (operation === "delete") {
        if (!id?.success) return { error: "La categoría seleccionada no es válida." };
        const { data, error } = await supabase
          .from("categories")
          .delete()
          .eq("id", id.data)
          .select("id")
          .maybeSingle();
        if (error || !data) {
          console.error(`Admin category delete failed. Supabase code: ${error?.code ?? "NO_ROW"}`);
          return { error: "No se pudo eliminar la categoría. Verifica los permisos." };
        }
      } else {
        const name = requiredText(2, 120).safeParse(value(formData, "name"));
        const slug = slugSchema.safeParse(value(formData, "slug"));
        const description = optionalText(1000).safeParse(value(formData, "description"));
        const type = z.enum(["SERVICE", "PROJECT"] satisfies [CategoryType, ...CategoryType[]]).safeParse(value(formData, "type"));
        if (!name.success || !slug.success || !description.success || !type.success) {
          return { error: (!name.success && name.error.issues[0]?.message) || (!slug.success && slug.error.issues[0]?.message) || (!description.success && description.error.issues[0]?.message) || (!type.success && "Selecciona un tipo de categoría válido.") || "Revisa los datos de la categoría." };
        }
        const input = {
          name: name.data,
          slug: slug.data,
          description: description.data || null,
          type: type.data,
        };
        if (operation === "create") {
          const { error } = await supabase.from("categories").insert(input);
          if (error) {
            console.error(`Admin category create failed. Supabase code: ${error.code}`);
            return { error: "No se pudo crear la categoría. Revisa si ya existe una categoría con el mismo tipo y slug." };
          }
        } else if (id?.success) {
          const { data, error } = await supabase.from("categories").update(input).eq("id", id.data).select("id").maybeSingle();
          if (error || !data) {
            console.error(`Admin category update failed. Supabase code: ${error?.code ?? "NO_ROW"}`);
            return { error: "No se pudo actualizar la categoría. Revisa si ya existe una categoría con el mismo tipo y slug." };
          }
        }
      }
      await revalidateAdminPaths(section);
      return { success: "La categoría se guardó correctamente." };
    }

    if (section === "solicitudes") {
      if (operation !== "update") return { error: "Solo se permite actualizar el estado de la solicitud." };
      const id = idSchema.safeParse(recordId);
      const status = z.enum(requestStatuses).safeParse(value(formData, "status"));
      if (!id.success || !status.success) return { error: "La solicitud o su estado no son válidos." };
      const { data, error } = await supabase
        .from("service_requests")
        .update({ status: status.data })
        .eq("id", id.data)
        .select("id")
        .maybeSingle();
      if (error || !data) {
        console.error(`Admin request update failed. Supabase code: ${error?.code ?? "NO_ROW"}`);
        return { error: "No se pudo actualizar el estado de la solicitud." };
      }
      await revalidateAdminPaths(section);
      return { success: "El estado de la solicitud se actualizó." };
    }

    if (section === "mensajes") {
      const id = idSchema.safeParse(recordId);
      if (!id.success) return { error: "El mensaje seleccionado no es válido." };
      if (operation === "delete") {
        const { data, error } = await supabase.from("contact_messages").delete().eq("id", id.data).select("id").maybeSingle();
        if (error || !data) {
          console.error(`Admin message delete failed. Supabase code: ${error?.code ?? "NO_ROW"}`);
          return { error: "No se pudo eliminar el mensaje." };
        }
      } else if (operation === "update") {
        const status = z.enum(messageStatuses).safeParse(value(formData, "status"));
        if (!status.success) return { error: "El estado del mensaje no es válido." };
        const { data, error } = await supabase.from("contact_messages").update({ status: status.data }).eq("id", id.data).select("id").maybeSingle();
        if (error || !data) {
          console.error(`Admin message update failed. Supabase code: ${error?.code ?? "NO_ROW"}`);
          return { error: "No se pudo actualizar el mensaje." };
        }
      } else {
        return { error: "Operación no permitida." };
      }
      await revalidateAdminPaths(section);
      return { success: "El mensaje se actualizó correctamente." };
    }

    if (section === "testimonios") {
      if (!["create", "update", "delete"].includes(operation)) {
        return { error: "Operación no permitida." };
      }
      const id = operation === "create" ? null : idSchema.safeParse(recordId);
      if (operation !== "create" && id && !id.success) {
        return { error: "El testimonio seleccionado no es válido." };
      }
      if (operation === "delete") {
        if (!id?.success) return { error: "El testimonio seleccionado no es válido." };
        const { data, error } = await supabase.from("testimonials").delete().eq("id", id.data).select("id").maybeSingle();
        if (error || !data) {
          console.error(`Admin testimonial delete failed. Supabase code: ${error?.code ?? "NO_ROW"}`);
          return { error: "No se pudo eliminar el testimonio." };
        }
      } else {
        const name = requiredText(2, 120).safeParse(value(formData, "name"));
        const position = optionalText(120).safeParse(value(formData, "position"));
        const company = optionalText(160).safeParse(value(formData, "company"));
        const comment = requiredText(3, 4000).safeParse(value(formData, "comment"));
        const photoUrl = optionalUrl(value(formData, "photo_url"), "La foto");
        const rating = z.coerce.number().int().min(1).max(5).safeParse(value(formData, "rating"));
        const status = z.enum(testimonialStatuses).safeParse(value(formData, "status"));
        if (!name.success || !position.success || !company.success || !comment.success || !photoUrl.success || !rating.success || !status.success) {
          return { error: (!name.success && name.error.issues[0]?.message) || (!position.success && position.error.issues[0]?.message) || (!company.success && company.error.issues[0]?.message) || (!comment.success && comment.error.issues[0]?.message) || (!photoUrl.success && photoUrl.message) || (!rating.success && "La calificación debe estar entre 1 y 5.") || (!status.success && "El estado del testimonio no es válido.") || "Revisa los datos del testimonio." };
        }
        const input = {
          name: name.data,
          position: position.data || null,
          company: company.data || null,
          comment: comment.data,
          photo_url: photoUrl.data,
          rating: rating.data,
          status: status.data,
        };
        if (operation === "create") {
          const { error } = await supabase.from("testimonials").insert(input);
          if (error) {
            console.error(`Admin testimonial create failed. Supabase code: ${error.code}`);
            return { error: "No se pudo crear el testimonio." };
          }
        } else if (id?.success) {
          const { data, error } = await supabase.from("testimonials").update(input).eq("id", id.data).select("id").maybeSingle();
          if (error || !data) {
            console.error(`Admin testimonial update failed. Supabase code: ${error?.code ?? "NO_ROW"}`);
            return { error: "No se pudo actualizar el testimonio." };
          }
        }
      }
      await revalidateAdminPaths(section);
      revalidatePath("/");
      return { success: "El testimonio se guardó correctamente." };
    }

    if (section === "usuarios") {
      if (operation !== "update") return { error: "Solo se pueden editar los datos de perfil permitidos." };
      const id = idSchema.safeParse(recordId);
      const fullName = z.union([z.literal(""), requiredText(2, 120)]).safeParse(value(formData, "full_name"));
      const phone = optionalText(40).safeParse(value(formData, "phone"));
      const avatarUrl = optionalUrl(value(formData, "avatar_url"), "La imagen de perfil");
      if (!id.success || !fullName.success || !phone.success || !avatarUrl.success) {
        return { error: (!fullName.success && fullName.error.issues[0]?.message) || (!phone.success && phone.error.issues[0]?.message) || (!avatarUrl.success && avatarUrl.message) || "Revisa los datos del perfil." };
      }
      const { data, error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.data || null,
          phone: phone.data || null,
          avatar_url: avatarUrl.data,
        })
        .eq("id", id.data)
        .select("id")
        .maybeSingle();
      if (error || !data) {
        console.error(`Admin profile update failed. Supabase code: ${error?.code ?? "NO_ROW"}`);
        return { error: "No se pudo actualizar el perfil. El correo y el rol no se editan aquí." };
      }
      await revalidateAdminPaths(section);
      return { success: "El perfil se actualizó. Correo y rol permanecen sin cambios." };
    }

    if (section === "configuracion") {
      if (!["create", "update", "delete"].includes(operation)) {
        return { error: "Operación no permitida." };
      }
      const key = value(formData, "key");
      if (!allowedPublicSettingKeys.has(key)) {
        return { error: "Esta clave no está autorizada como configuración pública." };
      }
      if (
        (operation === "update" || operation === "delete") &&
        value(formData, "record_id") !== key
      ) {
        return { error: "Solo puedes modificar la configuración seleccionada." };
      }
      if (operation === "delete") {
        const { data, error } = await supabase.from("site_settings").delete().eq("key", key).select("key").maybeSingle();
        if (error || !data) {
          console.error(`Admin site setting delete failed. Supabase code: ${error?.code ?? "NO_ROW"}`);
          return { error: "No se pudo eliminar la configuración." };
        }
      } else {
        const settingValue = parsePublicSettingValue(key, value(formData, "value"));
        if (!settingValue.success) return { error: settingValue.message };
        if (operation === "create") {
          const { error } = await supabase.from("site_settings").insert({
            key,
            value: settingValue.data,
          });
          if (error) {
            console.error(`Admin site setting create failed. Supabase code: ${error.code}`);
            return { error: "No se pudo crear la configuración. Puede que esa clave ya exista." };
          }
        } else {
          const { data, error } = await supabase
            .from("site_settings")
            .update({ value: settingValue.data })
            .eq("key", key)
            .select("key")
            .maybeSingle();
          if (error || !data) {
            console.error(`Admin site setting update failed. Supabase code: ${error?.code ?? "NO_ROW"}`);
            return { error: "No se pudo actualizar la configuración seleccionada." };
          }
        }
      }
      updateTag("public-site-settings");
      await revalidateAdminPaths(section);
      revalidatePath("/");
      return { success: "La configuración pública se guardó correctamente." };
    }

    return { error: "Sección administrativa desconocida." };
  } catch (error) {
    return actionError(error, "No fue posible completar la operación administrativa.");
  }
}
