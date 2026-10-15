"use server";

import { revalidatePath, updateTag } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { validateMediaFile } from "@/lib/admin/media-validation";
import { requireAdmin } from "@/lib/auth/identity";
import { isMissingServiceKindColumn } from "@/lib/service-kind";
import { publicSiteSettingKeys } from "@/lib/site-settings";
import type {
  CategoryType,
  ContactMessageStatus,
  DigitalOfferSource,
  ProjectStatus,
  ServiceKind,
  ServiceRequestStatus,
  ServiceStatus,
  TestimonialStatus,
} from "@/types/database";

export type AdminActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: string;
  mainImageUrl?: string;
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
const digitalDurationUnits = ["DAY", "MONTH", "YEAR", "PERMANENT"] as const;
const digitalOfferSources = ["SELF_PROVIDED", "THIRD_PARTY_AUTHORIZED"] as const satisfies readonly DigitalOfferSource[];
const digitalDistributionMethods = ["WHATSAPP_MANUAL", "OFFICIAL_REDEMPTION_CODE", "OFFICIAL_INVITATION", "AUTHORIZED_DOWNLOAD", "OTHER_AUTHORIZED"] as const;
const digitalRenewalPolicies = ["RENEWABLE_MANUALLY", "NOT_RENEWABLE", "CONFIRM_MANUALLY"] as const;
const digitalLicenseTypes = ["SUBSCRIPTION", "PERPETUAL_LICENSE", "COURSE_ACCESS", "DOWNLOAD", "OTHER"] as const;
const digitalAvailabilityStatuses = ["AVAILABLE", "ON_REQUEST", "OUT_OF_STOCK", "UNAVAILABLE"] as const;
const digitalStockModes = ["UNLIMITED", "LIMITED"] as const;

const allowedPublicSettingKeys = new Set<string>(publicSiteSettingKeys);
const projectMediaBucket = "site-media";
type AdminSupabaseClient = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

async function removeUploadedProjectImage(
  supabase: AdminSupabaseClient,
  path: string,
) {
  const { error } = await supabase.storage.from(projectMediaBucket).remove([path]);
  if (error) {
    console.error(`Project image rollback failed. Storage status: ${error.statusCode ?? "unknown"}.`);
  }
}

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

function logDatabaseError(context: string, error: { code?: string; message?: string }) {
  const constraint = error.message?.match(/constraint ["']([^"']+)["']/i)?.[1];
  const missingColumn = error.message?.match(/column ["']?([a-z_][a-z0-9_]*)["']? does not exist/i)?.[1];
  const knownTrigger = [
    "DIGITAL_PRODUCT_NOT_READY_FOR_PUBLICATION",
    "DIGITAL_AUTHORIZATION_REFERENCE_REQUIRED",
  ].find((marker) => error.message?.includes(marker));
  console.error(
    `${context}. Supabase code: ${error.code ?? "UNKNOWN"}${constraint ? `; constraint: ${constraint}` : ""}${missingColumn ? `; missing column: ${missingColumn}` : ""}${knownTrigger ? `; rule: ${knownTrigger}` : ""}.`,
  );
}

function serviceDatabaseError(error: { code?: string; message?: string }, fallback: string) {
  if (error.code === "23505") {
    return "Ya existe un servicio con ese slug. Elige otro para poder guardar.";
  }
  if (error.code === "23503") {
    return "La categoría o un registro relacionado impide guardar esta operación. Actualiza la categoría e inténtalo de nuevo.";
  }
  if (error.code === "42703" || error.code === "PGRST204") {
    return "El esquema de Supabase no incluye un campo digital requerido. Verifica que las migraciones locales del catálogo estén aplicadas.";
  }
  if (error.code === "23514") {
    if (error.message?.includes("DIGITAL_PRODUCT_NOT_READY_FOR_PUBLICATION")) {
      return "El producto no cumple los requisitos de publicación. Revisa precio, disponibilidad y autorización.";
    }
    return "Los datos del producto no cumplen una regla del catálogo. Revisa duración, existencias y autorización.";
  }
  if (error.code === "42501") {
    return "Supabase rechazó la operación por permisos. Comprueba que tu cuenta conserve el rol administrador.";
  }
  return fallback;
}

function isForeignKeyViolation(error: { code?: string } | null) {
  return error?.code === "23503";
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

function parseTaxAmount(raw: string) {
  const parsed = z
    .string()
    .regex(/^\d{1,10}(?:\.\d{1,2})?$/)
    .safeParse(raw);
  if (!parsed.success) {
    return { success: false as const, message: "Indica un importe no negativo con hasta dos decimales." };
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
  if (section === "servicios-digitales") {
    revalidatePath("/servicios-digitales");
    revalidatePath("/servicios/[slug]", "page");
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
  let supabase: AdminSupabaseClient;
  try {
    ({ supabase } = await requireAdmin());
  } catch (error) {
    unstable_rethrow(error);
    return actionError(error, "No se pudo verificar tu acceso administrativo. Vuelve a intentarlo.");
  }
  let uploadedProjectImagePath: string | null = null;
  try {
    if (section === "servicios" || section === "servicios-digitales") {
      const serviceKind: ServiceKind = section === "servicios-digitales" ? "DIGITAL" : "TECHNOLOGICAL";
      if (!["create", "update", "delete", "deactivate", "duplicate"].includes(operation)) {
        return { error: "Operación no permitida." };
      }
      if (operation === "deactivate") {
        if (serviceKind !== "DIGITAL") {
          return { error: "Esta operación solo está disponible para servicios digitales." };
        }
        const id = idSchema.safeParse(recordId);
        if (!id.success) return { error: "El producto seleccionado no es válido." };
        const { data, error } = await supabase
          .from("services")
          .update({ status: "INACTIVE" })
          .eq("id", id.data)
          .eq("service_kind", "DIGITAL")
          .select("id")
          .maybeSingle();
        if (error || !data) {
          console.error(`Admin digital service deactivation failed. Supabase code: ${error?.code ?? "NO_ROW"}.`);
          return { error: "No se pudo desactivar el producto. Comprueba sus permisos y vuelve a intentar." };
        }
        await revalidateAdminPaths(section);
        return { success: "Producto desactivado." };
      }
      if (operation === "duplicate") {
        if (serviceKind !== "DIGITAL") {
          return { error: "Esta operación solo está disponible para servicios digitales." };
        }
        const id = idSchema.safeParse(recordId);
        if (!id.success) return { error: "El producto seleccionado no es válido." };
        const { data: original, error: loadError } = await supabase
          .from("services")
          .select("*")
          .eq("id", id.data)
          .eq("service_kind", "DIGITAL")
          .maybeSingle();
        if (loadError || !original) {
          console.error(`Admin digital service duplication lookup failed. Supabase code: ${loadError?.code ?? "NO_ROW"}.`);
          return { error: "No se pudo cargar el producto para duplicarlo." };
        }
        const { id: _id, created_at: _createdAt, updated_at: _updatedAt, ...originalFields } = original;
        const duplicateTitle = `${original.title.slice(0, 172).trimEnd()} (copia)`;
        const baseSlug = `${original.slug.slice(0, 113).replace(/-+$/, "")}-copia`;
        let duplicateSlug = baseSlug;
        for (let suffix = 2; suffix <= 100; suffix += 1) {
          const { data: existingSlug, error: slugError } = await supabase
            .from("services")
            .select("id")
            .eq("slug", duplicateSlug)
            .maybeSingle();
          if (slugError) {
            console.error(`Admin digital service slug lookup failed. Supabase code: ${slugError.code}.`);
            return { error: "No se pudo comprobar la URL del duplicado." };
          }
          if (!existingSlug) break;
          const suffixText = `-${suffix}`;
          duplicateSlug = `${baseSlug.slice(0, 120 - suffixText.length)}${suffixText}`;
        }
        const { data: duplicate, error: duplicateError } = await supabase
          .from("services")
          .insert({
            ...originalFields,
            title: duplicateTitle,
            slug: duplicateSlug,
            status: "DRAFT",
          })
          .select("id")
          .single();
        if (duplicateError || !duplicate) {
          console.error(`Admin digital service duplication failed. Supabase code: ${duplicateError?.code ?? "NO_ROW"}.`);
          return { error: "No se pudo duplicar el producto. Comprueba que haya espacio para otra copia." };
        }
        await revalidateAdminPaths(section);
        return { success: "Copia creada como borrador. Revisa la autorización antes de publicarla." };
      }
      if (operation === "delete") {
        if (serviceKind !== "DIGITAL") {
          const id = idSchema.safeParse(recordId);
          if (!id.success) return { error: "El servicio seleccionado no es válido." };
          let deleteResult = await supabase.from("services").delete().eq("id", id.data).eq("service_kind", serviceKind).select("id").maybeSingle();
          if (deleteResult.error && isMissingServiceKindColumn(deleteResult.error)) {
            deleteResult = await supabase.from("services").delete().eq("id", id.data).select("id").maybeSingle();
          }
          if (deleteResult.error || !deleteResult.data) {
            logDatabaseError("Admin service delete failed", deleteResult.error ?? {});
            return { error: "No se pudo eliminar el servicio. Verifica permisos y relaciones." };
          }
          await revalidateAdminPaths(section);
          return { success: "El servicio se eliminó correctamente." };
        }
        if (value(formData, "confirm_delete") !== "confirmed") {
          return { error: "Confirma la eliminación desde el diálogo antes de continuar." };
        }
        const id = idSchema.safeParse(recordId);
        if (!id.success) return { error: "El servicio seleccionado no es válido." };
        const { data: service, error: serviceError } = await supabase
          .from("services")
          .select("id")
          .eq("id", id.data)
          .eq("service_kind", "DIGITAL")
          .maybeSingle();
        if (serviceError) {
          logDatabaseError("Admin digital service delete lookup failed", serviceError);
          return { error: "No se pudo comprobar el servicio seleccionado. No se eliminó ningún dato." };
        }
        if (!service) return { error: "El servicio digital ya no existe o no está disponible para tu cuenta." };

        const [digitalOrdersResult, serviceOrdersResult] = await Promise.all([
          supabase.from("digital_orders").select("id").eq("service_id", id.data).limit(1),
          supabase.from("service_orders").select("id").eq("service_id", id.data).limit(1),
        ]);
        if (digitalOrdersResult.error || serviceOrdersResult.error) {
          logDatabaseError(
            "Admin digital service order dependency check failed",
            digitalOrdersResult.error ?? serviceOrdersResult.error ?? {},
          );
          return { error: "No se pudo verificar si el servicio tiene pedidos. No se eliminó ningún dato; desactívalo si necesitas retirarlo del catálogo." };
        }
        if ((digitalOrdersResult.data?.length ?? 0) > 0 || (serviceOrdersResult.data?.length ?? 0) > 0) {
          return { error: "No se puede eliminar este servicio porque tiene pedidos asociados. Los pedidos y pagos históricos se conservaron; desactívalo para retirarlo del catálogo." };
        }

        const { data, error } = await supabase
          .from("services")
          .delete()
          .eq("id", id.data)
          .eq("service_kind", "DIGITAL")
          .select("id")
          .maybeSingle();
        if (error || !data) {
          if (error && isForeignKeyViolation(error)) {
            logDatabaseError("Admin digital service delete blocked by a related record", error);
            return { error: "No se puede eliminar este servicio porque un registro relacionado lo requiere. No se borró ningún pedido o pago; desactívalo como alternativa." };
          }
          if (error) logDatabaseError("Admin digital service delete failed", error);
          return { error: "No se pudo eliminar el servicio. Comprueba que siga existiendo y que tu cuenta tenga permisos administrativos." };
        }
        await revalidateAdminPaths(section);
        return { success: "El servicio digital se eliminó definitivamente." };
      } else {
        const title = requiredText(2, 180).safeParse(value(formData, "title"));
        const slug = slugSchema.safeParse(value(formData, "slug"));
        const shortDescription = requiredText(3, 500).safeParse(value(formData, "short_description"));
        const submittedDescription = value(formData, "description").trim() || value(formData, "short_description").trim();
        const description = requiredText(3, 12000).safeParse(submittedDescription);
        const icon = optionalText(80).safeParse(value(formData, "icon"));
        const categoryId = parseCategoryId(value(formData, "category_id"));
        const status = z.enum(serviceStatuses).safeParse(value(formData, "status"));
        const sortOrder = z.coerce.number().int().min(-100000).max(100000).safeParse(value(formData, "sort_order"));
        const price = parseNullablePrice(value(formData, "price"));
        const imageUrl = optionalUrl(value(formData, "image_url"), "La imagen");
        if (!title.success || !slug.success || !shortDescription.success || !description.success || !icon.success || !categoryId.success || !status.success || !sortOrder.success || !price.success || !imageUrl.success) {
          const fieldErrors: Record<string, string> = {};
          if (!title.success) fieldErrors.title = title.error.issues[0]?.message ?? "Escribe un nombre válido.";
          if (!slug.success) fieldErrors.slug = slug.error.issues[0]?.message ?? "Escribe una URL válida.";
          if (!shortDescription.success) fieldErrors.short_description = shortDescription.error.issues[0]?.message ?? "Escribe una descripción corta.";
          if (!description.success) fieldErrors.description = description.error.issues[0]?.message ?? "Escribe una descripción válida.";
          if (!categoryId.success) fieldErrors.category_id = categoryId.message;
          if (!status.success) fieldErrors.status = "Selecciona un estado válido.";
          if (!sortOrder.success) fieldErrors.sort_order = "El orden debe ser un número entero válido.";
          if (!price.success) fieldErrors.price = price.message;
          if (!imageUrl.success) fieldErrors.image_url = imageUrl.message;
          return {
            error: (!title.success && title.error.issues[0]?.message) || (!slug.success && slug.error.issues[0]?.message) || (!shortDescription.success && shortDescription.error.issues[0]?.message) || (!description.success && description.error.issues[0]?.message) || (!icon.success && icon.error.issues[0]?.message) || (!categoryId.success && categoryId.message) || (!status.success && "El estado de servicio no es válido.") || (!sortOrder.success && "El orden debe ser un número entero válido.") || (!price.success && price.message) || (!imageUrl.success && imageUrl.message) || "Revisa los datos del servicio.",
            fieldErrors,
          };
        }
        let digitalProduct: {
          offer_source: DigitalOfferSource;
          brand: string;
          family_name: string;
          plan_name: string;
          duration_value: number | null;
          duration_unit: (typeof digitalDurationUnits)[number];
          previous_price: number | null;
          included_features: string[];
          distribution_method: (typeof digitalDistributionMethods)[number];
          distribution_authorized: boolean;
          renewal_policy: (typeof digitalRenewalPolicies)[number];
          license_type: (typeof digitalLicenseTypes)[number];
          availability_status: (typeof digitalAvailabilityStatuses)[number];
          stock_mode: (typeof digitalStockModes)[number];
          stock_quantity: number | null;
          conditions: string;
          authorization_reference: string;
          activation_instructions: string;
        } | null = null;
        let digitalTaxBreakdown: {
          tax_base0: number;
          tax_baseimp: number;
          tax_iva: number;
        } | null = null;
        if (serviceKind === "DIGITAL") {
          const offerSource = z.enum(digitalOfferSources).safeParse(value(formData, "offer_source"));
          const selectedLicenseType = z.enum(digitalLicenseTypes).safeParse(value(formData, "license_type"));
          const submittedDurationUnit = value(formData, "duration_unit") || "PERMANENT";
          const durationUnit = z.enum(digitalDurationUnits).safeParse(submittedDurationUnit);
          const distributionMethod = z.enum(digitalDistributionMethods).safeParse(value(formData, "distribution_method"));
          const submittedRenewalPolicy = value(formData, "renewal_policy") || "NOT_RENEWABLE";
          const renewalPolicy = z.enum(digitalRenewalPolicies).safeParse(submittedRenewalPolicy);
          const availabilityStatus = z.enum(digitalAvailabilityStatuses).safeParse(value(formData, "availability_status"));
          const stockMode = z.enum(digitalStockModes).safeParse(value(formData, "stock_mode"));
          const brand = optionalText(120).safeParse(value(formData, "brand"));
          const familyName = optionalText(120).safeParse(value(formData, "family_name"));
          const planName = optionalText(120).safeParse(value(formData, "plan_name"));
          const durationRaw = value(formData, "duration_value").trim();
          const durationValue = durationRaw
            ? z.coerce.number().int().min(1).max(32767).safeParse(durationRaw)
            : null;
          const previousPrice = parseNullablePrice(value(formData, "previous_price"));
          const featuresRaw = optionalText(4000).safeParse(value(formData, "included_features"));
          const stockRaw = value(formData, "stock_quantity").trim();
          const stockQuantity = stockRaw
            ? z.coerce.number().int().min(0).max(10000000).safeParse(stockRaw)
            : null;
          const conditions = optionalText(4000).safeParse(value(formData, "conditions"));
          const authorizationReference = optionalText(1200).safeParse(value(formData, "authorization_reference"));
          const activationInstructions = optionalText(4000).safeParse(value(formData, "activation_instructions"));
          if (!offerSource.success || !durationUnit.success || !distributionMethod.success || !renewalPolicy.success || !selectedLicenseType.success || !availabilityStatus.success || !stockMode.success || !brand.success || !familyName.success || !planName.success || (durationRaw !== "" && !durationValue?.success) || !previousPrice.success || !featuresRaw.success || (stockRaw !== "" && !stockQuantity?.success) || !conditions.success || !authorizationReference.success || !activationInstructions.success) {
            const fieldErrors: Record<string, string> = {};
            if (!selectedLicenseType.success) fieldErrors.license_type = "Selecciona un tipo de producto.";
            if (!offerSource.success) fieldErrors.offer_source = "Selecciona el origen del producto.";
            if (!brand.success) fieldErrors.brand = "La marca no puede superar 120 caracteres.";
            if (!familyName.success) fieldErrors.family_name = "La familia no puede superar 120 caracteres.";
            if (!planName.success) fieldErrors.plan_name = "El plan no puede superar 120 caracteres.";
            if (!durationUnit.success) fieldErrors.duration_unit = "Selecciona una unidad de duración válida.";
            if (durationRaw !== "" && !durationValue?.success) fieldErrors.duration_value = "La duración debe ser un número entero positivo.";
            if (!previousPrice.success) fieldErrors.previous_price = previousPrice.message;
            if (!featuresRaw.success) fieldErrors.included_features = "Las características no pueden superar 4000 caracteres.";
            if (stockRaw !== "" && !stockQuantity?.success) fieldErrors.stock_quantity = "El stock debe ser un entero igual o mayor que cero.";
            if (!availabilityStatus.success) fieldErrors.availability_status = "Selecciona una disponibilidad válida.";
            if (!stockMode.success) fieldErrors.stock_mode = "Selecciona un control de stock válido.";
            if (!distributionMethod.success) fieldErrors.distribution_method = "Selecciona una modalidad de entrega válida.";
            if (!renewalPolicy.success) fieldErrors.renewal_policy = "Selecciona una política de renovación válida.";
            if (!conditions.success) fieldErrors.conditions = "Las condiciones no pueden superar 4000 caracteres.";
            if (!authorizationReference.success) fieldErrors.authorization_reference = "La referencia no puede superar 1200 caracteres.";
            if (!activationInstructions.success) fieldErrors.activation_instructions = "Las instrucciones no pueden superar 4000 caracteres.";
            return { error: "Revisa los campos marcados y vuelve a guardar.", fieldErrors };
          }
          const duration = durationValue?.success ? durationValue.data : null;
          const effectiveDurationUnit = durationUnit.data;
          const effectiveDuration = duration;
          if ((effectiveDurationUnit === "PERMANENT" && effectiveDuration !== null) || (effectiveDurationUnit !== "PERMANENT" && effectiveDuration === null)) {
            return {
              error: "Indica una duración positiva o selecciona acceso permanente sin cantidad de tiempo.",
              fieldErrors: {
                duration_value: "Indica una cantidad positiva.",
                duration_unit: "Elige días, meses, años o acceso permanente.",
              },
            };
          }
          const previous = previousPrice.data;
          if (previous !== null && (price.data === null || previous <= price.data)) {
            return {
              error: "El precio anterior solo puede ser mayor que el total actual.",
              fieldErrors: { previous_price: "Debe superar al precio total actual para mostrar una oferta real." },
            };
          }
          const featureList = featuresRaw.data.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
          if (featureList.length > 30 || featureList.some((item) => item.length > 200)) {
            return {
              error: "Revisa la lista de características.",
              fieldErrors: { included_features: "Usa hasta 30 líneas, con un máximo de 200 caracteres cada una." },
            };
          }
          const stock = stockQuantity?.success ? stockQuantity.data : null;
          if ((stockMode.data === "LIMITED" && stock === null) || (stockMode.data === "UNLIMITED" && stock !== null)) {
            return {
              error: "Revisa la configuración de existencias.",
              fieldErrors: { stock_quantity: stockMode.data === "LIMITED" ? "Indica las unidades disponibles." : "Deja las unidades vacías para existencias ilimitadas." },
            };
          }
          const needsProviderAuthorization = offerSource.data === "THIRD_PARTY_AUTHORIZED";
          const authorizationConfirmation = formData.get("distribution_authorized");
          const authorized = needsProviderAuthorization &&
            (authorizationConfirmation === "on" || authorizationConfirmation === "true");
          if (status.data === "ACTIVE" && needsProviderAuthorization && !authorized) {
            return {
              error: "Para publicar un producto de terceros, confirma que cuentas con autorización.",
              fieldErrors: {
                ...(!authorized ? { distribution_authorized: "Confirma que esta modalidad de distribución está autorizada." } : {}),
              },
            };
          }
          if (status.data === "ACTIVE" && ((needsProviderAuthorization && (!brand.data || !planName.data)) || price.data === null || price.data <= 0 || availabilityStatus.data === "UNAVAILABLE" || !categoryId.data)) {
            const fieldErrors: Record<string, string> = {};
            if (needsProviderAuthorization && !brand.data) fieldErrors.brand = "Indica la marca o proveedor para publicar.";
            if (needsProviderAuthorization && !planName.data) fieldErrors.plan_name = "Indica el plan o edición para publicar.";
            if (price.data === null || price.data <= 0) fieldErrors.price = "Indica un precio final positivo para publicar.";
            if (availabilityStatus.data === "UNAVAILABLE") fieldErrors.availability_status = "Selecciona una disponibilidad publicable.";
            if (!categoryId.data) fieldErrors.category_id = "Selecciona una categoría antes de publicar.";
            return { error: "Completa los datos necesarios para publicar el producto.", fieldErrors };
          }
          digitalProduct = {
            offer_source: offerSource.data,
            brand: brand.data,
            family_name: familyName.data,
            plan_name: planName.data,
            duration_value: effectiveDuration,
            duration_unit: effectiveDurationUnit,
            previous_price: previous,
            included_features: featureList,
            distribution_method: distributionMethod.data,
            distribution_authorized: authorized,
            renewal_policy: renewalPolicy.data,
            license_type: selectedLicenseType.data,
            availability_status: availabilityStatus.data,
            stock_mode: stockMode.data,
            stock_quantity: stock,
            conditions: conditions.data,
            authorization_reference: authorizationReference.data || (
              authorized
                ? "Confirmación de autorización aceptada por el administrador desde el panel."
                : ""
            ),
            activation_instructions: activationInstructions.data,
          };
          if (formData.get("tax_breakdown_enabled") === "on") {
            const taxBase0 = parseTaxAmount(value(formData, "tax_base0"));
            const taxBaseImp = parseTaxAmount(value(formData, "tax_baseimp"));
            const taxIva = parseTaxAmount(value(formData, "tax_iva"));
            const fieldErrors: Record<string, string> = {};
            if (!taxBase0.success) fieldErrors.tax_base0 = taxBase0.message;
            if (!taxBaseImp.success) fieldErrors.tax_baseimp = taxBaseImp.message;
            if (!taxIva.success) fieldErrors.tax_iva = taxIva.message;
            if (!taxBase0.success || !taxBaseImp.success || !taxIva.success) {
              return { error: "Revisa los importes del desglose tributario.", fieldErrors };
            }
            const totalCents =
              Math.round(taxBase0.data * 100) +
              Math.round(taxBaseImp.data * 100) +
              Math.round(taxIva.data * 100);
            if (price.data === null || totalCents !== Math.round(price.data * 100)) {
              return {
                error: "El precio total debe coincidir con la suma del desglose tributario.",
                fieldErrors: {
                  price: "Ajusta el total para que coincida con las bases e IVA configurados.",
                  tax_base0: "La suma de las bases y el IVA debe coincidir exactamente con el precio total.",
                  tax_baseimp: "La suma de las bases y el IVA debe coincidir exactamente con el precio total.",
                  tax_iva: "La suma de las bases y el IVA debe coincidir exactamente con el precio total.",
                },
              };
            }
            digitalTaxBreakdown = {
              tax_base0: taxBase0.data,
              tax_baseimp: taxBaseImp.data,
              tax_iva: taxIva.data,
            };
          }
        }
        if (categoryId.data) {
          const { data: category, error } = await supabase
            .from("categories")
            .select("id")
            .eq("id", categoryId.data)
            .eq("type", "SERVICE")
            .maybeSingle();
          if (error) {
            logDatabaseError("Admin service category validation failed", error);
            return { error: "No se pudo comprobar la categoría seleccionada. Inténtalo de nuevo." };
          }
          if (!category) {
            return { error: "Selecciona una categoría válida para servicios." };
          }
        }
        const {
          authorization_reference: authorizationReference = "",
          activation_instructions: activationInstructions = "",
          ...digitalProductFields
        } = digitalProduct ?? {};
        const input = {
          service_kind: serviceKind,
          title: title.data,
          slug: slug.data,
          short_description: shortDescription.data,
          description: description.data,
          icon: icon.data || null,
          image_url: imageUrl.data,
          category_id: categoryId.data,
          price: price.data,
          ...digitalProductFields,
          ...(digitalTaxBreakdown ?? {}),
          status: status.data,
          sort_order: sortOrder.data,
        };
        const legacyInput = {
          title: input.title,
          slug: input.slug,
          short_description: input.short_description,
          description: input.description,
          icon: input.icon,
          image_url: input.image_url,
          category_id: input.category_id,
          price: input.price,
          status: input.status,
          sort_order: input.sort_order,
        };
        if (operation === "create") {
          const insertInput = serviceKind === "DIGITAL" && status.data === "ACTIVE"
            ? { ...input, status: "DRAFT" as const }
            : input;
          let insertResult = await supabase.from("services").insert(insertInput).select("id").single();
          if (insertResult.error && isMissingServiceKindColumn(insertResult.error) && serviceKind === "TECHNOLOGICAL") {
            insertResult = await supabase.from("services").insert(legacyInput).select("id").single();
          }
          if (insertResult.error) {
            if (serviceKind === "DIGITAL" && isMissingServiceKindColumn(insertResult.error)) {
              return { error: "La sección digital requiere aplicar su migración antes de guardar servicios." };
            }
            logDatabaseError("Admin service create failed", insertResult.error);
            return { error: serviceKind === "DIGITAL"
              ? serviceDatabaseError(insertResult.error, "No se pudo crear el servicio digital. Revisa los datos e inténtalo de nuevo.")
              : "No se pudo crear el servicio. Comprueba que el slug no esté en uso." };
          }
          if (serviceKind === "DIGITAL") {
            const { error: notesError } = await supabase.from("digital_service_admin_notes").upsert({
              service_id: insertResult.data.id,
              authorization_reference: authorizationReference,
              activation_instructions: activationInstructions,
            }, { onConflict: "service_id" });
            if (notesError) {
              logDatabaseError("Digital service private notes save failed", notesError);
              const rollbackResult = await supabase
                .from("services")
                .delete()
                .eq("id", insertResult.data.id)
                .eq("service_kind", "DIGITAL")
                .select("id")
                .maybeSingle();
              if (rollbackResult.error || !rollbackResult.data) {
                if (rollbackResult.error) logDatabaseError("Digital service create rollback failed", rollbackResult.error);
                await revalidateAdminPaths(section);
                return { error: "No se pudieron guardar las referencias privadas. El producto quedó como borrador; revisa el listado antes de volver a intentarlo." };
              }
              return {
                error: serviceDatabaseError(
                  notesError,
                  "No se pudieron guardar las referencias privadas y se canceló la creación del producto. Inténtalo de nuevo.",
                ),
              };
            }
            if (status.data === "ACTIVE") {
              const { data: published, error: publishError } = await supabase.from("services").update({ status: "ACTIVE" }).eq("id", insertResult.data.id).eq("service_kind", "DIGITAL").select("id").maybeSingle();
              if (publishError || !published) {
                if (publishError) logDatabaseError("Digital service publication failed", publishError);
                await revalidateAdminPaths(section);
                return { error: publishError
                  ? serviceDatabaseError(publishError, "El producto quedó como borrador. Revisa la autorización y los datos antes de publicarlo.")
                  : "El producto quedó como borrador porque no se confirmó la publicación. Actualiza el listado e inténtalo de nuevo." };
              }
            }
          }
        } else {
          const id = idSchema.safeParse(recordId);
          if (!id.success) return { error: "El servicio seleccionado no es válido." };
          if (serviceKind === "DIGITAL") {
            const draftUpdate = await supabase.from("services").update({ ...input, status: "DRAFT" }).eq("id", id.data).eq("service_kind", "DIGITAL").select("id").maybeSingle();
            if (draftUpdate.error || !draftUpdate.data) {
              if (draftUpdate.error) logDatabaseError("Admin digital service update failed", draftUpdate.error);
              return { error: draftUpdate.error
                ? serviceDatabaseError(draftUpdate.error, "No se pudo guardar el producto. Comprueba los datos y vuelve a intentar.")
                : "El producto no existe o no está disponible para tu cuenta." };
            }
            const { error: notesError } = await supabase.from("digital_service_admin_notes").upsert({
              service_id: id.data,
              authorization_reference: authorizationReference,
              activation_instructions: activationInstructions,
            }, { onConflict: "service_id" });
            if (notesError) {
              logDatabaseError("Digital service private notes update failed", notesError);
              await revalidateAdminPaths(section);
              return { error: "El producto quedó en borrador porque no se pudieron guardar sus referencias privadas." };
            }
            if (status.data !== "DRAFT") {
              const { data: updatedStatus, error: statusError } = await supabase.from("services").update({ status: status.data }).eq("id", id.data).eq("service_kind", "DIGITAL").select("id").maybeSingle();
              if (statusError || !updatedStatus) {
                if (statusError) logDatabaseError("Digital service publication status failed", statusError);
                await revalidateAdminPaths(section);
                return { error: statusError
                  ? serviceDatabaseError(statusError, "El producto quedó como borrador. Revisa la autorización y vuelve a publicar.")
                  : "El producto quedó como borrador porque no se confirmó el estado solicitado. Actualiza el listado." };
              }
            }
          } else {
            let updateResult = await supabase.from("services").update(input).eq("id", id.data).eq("service_kind", serviceKind).select("id").maybeSingle();
            if (updateResult.error && isMissingServiceKindColumn(updateResult.error)) {
              updateResult = await supabase.from("services").update(legacyInput).eq("id", id.data).select("id").maybeSingle();
            }
            const { data, error } = updateResult;
            if (error || !data) {
              console.error(`Admin service update failed. Supabase code: ${error?.code ?? "NO_ROW"}`);
              return { error: "No se pudo actualizar el servicio. Comprueba que el slug no esté en uso." };
            }
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
        const selectedFileEntry = formData.get("main_image_file");
        const selectedImage =
          selectedFileEntry instanceof File && selectedFileEntry.size > 0
            ? selectedFileEntry
            : null;
        const fileValidation = selectedImage
          ? await validateMediaFile(selectedImage, "image")
          : null;
        if (fileValidation && !fileValidation.success) {
          return { error: fileValidation.error };
        }
        const title = requiredText(2, 180).safeParse(value(formData, "title"));
        const slug = slugSchema.safeParse(value(formData, "slug"));
        const shortDescription = requiredText(3, 500).safeParse(value(formData, "short_description"));
        const description = requiredText(3, 12000).safeParse(value(formData, "description"));
        const categoryId = parseCategoryId(value(formData, "category_id"));
        const projectIntent = value(formData, "project_intent");
        if (projectIntent && projectIntent !== "DRAFT" && projectIntent !== "PUBLISHED") {
          return { error: "La acción del proyecto no es válida." };
        }
        const status = z.enum(projectStatuses).safeParse(
          projectIntent || value(formData, "status"),
        );
        const mainImage = selectedImage
          ? { success: true as const, data: null }
          : optionalUrl(value(formData, "main_image"), "La imagen principal");
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
            .maybeSingle();
          if (error) {
            console.error(`Admin project category validation failed. Supabase code: ${error.code}`);
            return { error: "No se pudo validar la categoría seleccionada. Inténtalo de nuevo." };
          }
          if (!category) {
            return { error: "La categoría seleccionada ya no existe. Elige otra." };
          }
        }
        let projectId: string;
        if (operation === "create") {
          projectId = crypto.randomUUID();
        } else {
          const parsedId = idSchema.safeParse(recordId);
          if (!parsedId.success) return { error: "El proyecto seleccionado no es válido." };
          projectId = parsedId.data;
        }
        let mainImageUrl = mainImage.data;
        if (selectedImage && fileValidation?.success) {
          const path = `projects/${projectId}/${crypto.randomUUID()}.${fileValidation.extension}`;
          const { error } = await supabase.storage.from(projectMediaBucket).upload(path, selectedImage, {
            cacheControl: "31536000",
            contentType: fileValidation.mimeType,
            upsert: false,
          });
          if (error) {
            console.error(`Admin project image upload failed. Storage status: ${error.statusCode ?? "unknown"}.`);
            return { error: "No se pudo subir la imagen. Comprueba el acceso al almacenamiento e inténtalo de nuevo." };
          }
          uploadedProjectImagePath = path;
          mainImageUrl = supabase.storage.from(projectMediaBucket).getPublicUrl(path).data.publicUrl;
        }
        const input = {
          id: projectId,
          title: title.data,
          slug: slug.data,
          short_description: shortDescription.data,
          description: description.data,
          category_id: categoryId.data,
          main_image: mainImageUrl,
          demo_url: demoUrl.data,
          repository_url: repositoryUrl.data,
          technologies,
          status: status.data,
          featured: value(formData, "featured") === "on",
        };
        if (operation === "create") {
          const { error } = await supabase.from("projects").insert(input);
          if (error) {
            if (uploadedProjectImagePath) await removeUploadedProjectImage(supabase, uploadedProjectImagePath);
            uploadedProjectImagePath = null;
            console.error(`Admin project create failed. Supabase code: ${error.code}`);
            return { error: "No se pudo crear el proyecto. Comprueba que el slug no esté en uso." };
          }
        } else {
          const { data, error } = await supabase.from("projects").update(input).eq("id", projectId).select("id").maybeSingle();
          if (error || !data) {
            if (uploadedProjectImagePath) await removeUploadedProjectImage(supabase, uploadedProjectImagePath);
            uploadedProjectImagePath = null;
            console.error(`Admin project update failed. Supabase code: ${error?.code ?? "NO_ROW"}`);
            return { error: "No se pudo actualizar el proyecto. Comprueba que el slug no esté en uso." };
          }
        }
        const savedMainImageUrl = mainImageUrl ?? "";
        uploadedProjectImagePath = null;
        await revalidateAdminPaths(section);
        return { success: "El proyecto se guardó correctamente.", mainImageUrl: savedMainImageUrl };
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
      if (operation !== "update" && operation !== "delete") {
        return { error: "Operación no permitida para la solicitud." };
      }
      const id = idSchema.safeParse(recordId);
      if (!id.success) return { error: "La solicitud seleccionada no es válida." };
      if (operation === "delete") {
        const { data, error } = await supabase
          .from("service_requests")
          .delete()
          .eq("id", id.data)
          .select("id")
          .maybeSingle();
        if (error || !data) {
          console.error(`Admin request delete failed. Supabase code: ${error?.code ?? "NO_ROW"}`);
          return { error: "No se pudo eliminar la solicitud. Verifica los permisos e inténtalo de nuevo." };
        }
        await revalidateAdminPaths(section);
        return { success: "La solicitud se eliminó correctamente." };
      }
      const status = z.enum(requestStatuses).safeParse(value(formData, "status"));
      if (!status.success) return { error: "El estado de la solicitud no es válido." };
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
    if (uploadedProjectImagePath) {
      await removeUploadedProjectImage(supabase, uploadedProjectImagePath);
    }
    return actionError(error, "No fue posible completar la operación administrativa.");
  }
}
