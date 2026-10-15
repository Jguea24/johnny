"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useActionState } from "react";
import {
  adminMutationAction,
  type AdminActionState,
} from "@/lib/admin/actions";
import { parseYouTubeLink, safeHttpUrl } from "@/lib/portfolio-links";
import DigitalServicesManager from "@/components/admin/DigitalServicesManager";

type Section =
  | "usuarios"
  | "servicios"
  | "servicios-digitales"
  | "proyectos"
  | "categorias"
  | "solicitudes"
  | "mensajes"
  | "testimonios"
  | "configuracion";
type FieldKind = "text" | "textarea" | "url" | "number" | "select" | "checkbox" | "file";
type Option = { value: string; label: string };
type Field = {
  name: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  maxLength?: number;
  min?: string;
  step?: string;
  options?: Option[];
  group?: string;
};
export type AdminRecord = {
  id: string;
  title: string;
  details: string;
  fields: Record<string, string | boolean | null>;
};

const commonStatusOptions: Record<string, Option[]> = {
  service: [
    { value: "DRAFT", label: "Borrador" },
    { value: "ACTIVE", label: "Activo" },
    { value: "INACTIVE", label: "Inactivo" },
  ],
  project: [
    { value: "DRAFT", label: "Borrador" },
    { value: "PUBLISHED", label: "Publicado" },
    { value: "ARCHIVED", label: "Archivado" },
  ],
  request: [
    { value: "PENDIENTE", label: "Pendiente" },
    { value: "EN_REVISION", label: "En revisión" },
    { value: "EN_PROCESO", label: "En proceso" },
    { value: "COMPLETADA", label: "Completada" },
    { value: "CANCELADA", label: "Cancelada" },
  ],
  message: [
    { value: "NUEVO", label: "Nuevo" },
    { value: "LEIDO", label: "Leído" },
    { value: "RESPONDIDO", label: "Respondido" },
    { value: "ARCHIVADO", label: "Archivado" },
  ],
  testimonial: [
    { value: "DRAFT", label: "Borrador" },
    { value: "ACTIVE", label: "Activo" },
    { value: "INACTIVE", label: "Inactivo" },
  ],
};

const digitalProductOptions: Record<string, Option[]> = {
  offer_source: [
    { value: "", label: "Selecciona el tipo de oferta" },
    { value: "SELF_PROVIDED", label: "Servicio propio: lo presto yo" },
    { value: "THIRD_PARTY_AUTHORIZED", label: "Producto de terceros con distribución autorizada" },
  ],
  duration_unit: [
    { value: "DAY", label: "Días" },
    { value: "MONTH", label: "Meses" },
    { value: "YEAR", label: "Años" },
    { value: "PERMANENT", label: "Acceso permanente" },
  ],
  distribution_method: [
    { value: "WHATSAPP_MANUAL", label: "Entrega manual coordinada por WhatsApp" },
    { value: "OFFICIAL_REDEMPTION_CODE", label: "Código oficial de canje" },
    { value: "OFFICIAL_INVITATION", label: "Invitación oficial del proveedor" },
    { value: "AUTHORIZED_DOWNLOAD", label: "Descarga autorizada" },
    { value: "OTHER_AUTHORIZED", label: "Otra modalidad autorizada" },
  ],
  renewal_policy: [
    { value: "RENEWABLE_MANUALLY", label: "Sí, se renueva manualmente" },
    { value: "NOT_RENEWABLE", label: "No renovable" },
    { value: "CONFIRM_MANUALLY", label: "Confirmar con el administrador" },
  ],
  license_type: [
    { value: "SUBSCRIPTION", label: "Suscripción" },
    { value: "PERPETUAL_LICENSE", label: "Licencia permanente" },
    { value: "COURSE_ACCESS", label: "Acceso a curso" },
    { value: "DOWNLOAD", label: "Producto descargable" },
    { value: "OTHER", label: "Otro tipo de acceso" },
  ],
  availability_status: [
    { value: "AVAILABLE", label: "Disponible" },
    { value: "ON_REQUEST", label: "Consultar disponibilidad" },
    { value: "OUT_OF_STOCK", label: "Agotado" },
    { value: "UNAVAILABLE", label: "No disponible" },
  ],
  stock_mode: [
    { value: "UNLIMITED", label: "Sin límite de unidades" },
    { value: "LIMITED", label: "Stock limitado" },
  ],
};

const settingKeys: Option[] = [
  { value: "site.title", label: "Título del sitio" },
  { value: "site.description", label: "Descripción del sitio" },
  { value: "contact.email", label: "Correo público" },
  { value: "contact.phone", label: "Teléfono público" },
  { value: "contact.location", label: "Ubicación pública" },
  { value: "social.github", label: "GitHub" },
  { value: "social.linkedin", label: "LinkedIn" },
  { value: "social.instagram", label: "Instagram" },
  { value: "social.facebook", label: "Facebook" },
];

const sectionLabels: Partial<Record<Section, string>> = {
  servicios: "servicio",
  "servicios-digitales": "servicio digital",
  proyectos: "proyecto",
  categorias: "categoría",
  testimonios: "testimonio",
  configuracion: "configuración",
};

const fieldGroups: Partial<Record<Section, Record<string, string>>> = {
  usuarios: {
    full_name: "Datos del perfil",
    phone: "Datos de contacto",
    avatar_url: "Datos de contacto",
  },
  servicios: {
    title: "Información del servicio",
    slug: "Información del servicio",
    short_description: "Información del servicio",
    description: "Información del servicio",
    category_id: "Clasificación y presentación",
    icon: "Clasificación y presentación",
    image_url: "Clasificación y presentación",
    price: "Publicación y precio",
    status: "Publicación y precio",
    sort_order: "Publicación y precio",
  },
  "servicios-digitales": {
    title: "Información del servicio digital",
    slug: "Información del servicio digital",
    short_description: "Información del servicio digital",
    description: "Información del servicio digital",
    category_id: "Clasificación y presentación",
    icon: "Clasificación y presentación",
    image_url: "Clasificación y presentación",
    brand: "Marca y plan",
    offer_source: "Modalidad de oferta",
    family_name: "Marca y plan",
    plan_name: "Marca y plan",
    duration_value: "Duración y precio",
    duration_unit: "Duración y precio",
    price: "Duración y precio",
    previous_price: "Duración y precio",
    included_features: "Qué incluye el plan",
    distribution_method: "Entrega autorizada",
    distribution_authorized: "Entrega autorizada",
    authorization_reference: "Entrega autorizada",
    renewal_policy: "Acceso y renovación",
    license_type: "Acceso y renovación",
    availability_status: "Disponibilidad y stock",
    stock_mode: "Disponibilidad y stock",
    stock_quantity: "Disponibilidad y stock",
    conditions: "Condiciones e instrucciones",
    activation_instructions: "Condiciones e instrucciones",
    status: "Publicación y precio",
    sort_order: "Publicación y precio",
  },
  proyectos: {
    title: "Información del proyecto",
    slug: "Información del proyecto",
    short_description: "Información del proyecto",
    description: "Información del proyecto",
    category_id: "Clasificación y tecnologías",
    technologies: "Clasificación y tecnologías",
    main_image: "Multimedia y enlaces",
    demo_url: "Multimedia y enlaces",
    repository_url: "Multimedia y enlaces",
    status: "Publicación",
    featured: "Publicación",
  },
  categorias: {
    name: "Datos de la categoría",
    slug: "Datos de la categoría",
    description: "Datos de la categoría",
    type: "Clasificación",
  },
  solicitudes: { status: "Estado de la solicitud" },
  mensajes: { status: "Estado del mensaje" },
  testimonios: {
    name: "Datos de la persona",
    position: "Datos de la persona",
    company: "Datos de la persona",
    comment: "Testimonio",
    photo_url: "Presentación y publicación",
    rating: "Presentación y publicación",
    status: "Presentación y publicación",
  },
  configuracion: {
    key: "Configuración pública",
    value: "Configuración pública",
  },
};

const statusLabels: Record<string, string> = {
  DRAFT: "Borrador",
  PUBLISHED: "Publicado",
  ARCHIVED: "Archivado",
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
  PENDIENTE: "Pendiente",
  EN_REVISION: "En revisión",
  EN_PROCESO: "En proceso",
  COMPLETADA: "Completada",
  CANCELADA: "Cancelada",
  NUEVO: "Nuevo",
  LEIDO: "Leído",
  RESPONDIDO: "Respondido",
};

function field(
  name: string,
  label: string,
  kind: FieldKind = "text",
  extra: Partial<Field> = {},
): Field {
  return { name, label, kind, ...extra };
}

function fieldsFor(
  section: Section,
  categoryOptions: Option[],
): Field[] {
  switch (section) {
    case "usuarios":
      return [
        field("full_name", "Nombre", "text", { maxLength: 120 }),
        field("phone", "Teléfono", "text", { maxLength: 40 }),
        field("avatar_url", "URL de imagen de perfil", "url", { maxLength: 2048 }),
      ];
    case "servicios":
      return [
        field("title", "Título", "text", { required: true, maxLength: 180 }),
        field("slug", "Slug", "text", { required: true, maxLength: 120 }),
        field("short_description", "Descripción corta", "textarea", { required: true, maxLength: 500 }),
        field("description", "Descripción completa", "textarea", { required: true, maxLength: 12000 }),
        field("category_id", "Categoría", "select", {
          options: [{ value: "", label: "Sin categoría" }, ...categoryOptions],
        }),
        field("icon", "Icono", "text", { maxLength: 80 }),
        field("image_url", "URL de imagen", "url", { maxLength: 2048 }),
        field("price", "Precio total (opcional)", "number", { min: "0", step: "0.01" }),
        field("status", "Estado", "select", { required: true, options: commonStatusOptions.service }),
        field("sort_order", "Orden", "number", { required: true, step: "1" }),
      ];
    case "servicios-digitales":
      return [
        field("title", "Nombre comercial", "text", { required: true, maxLength: 180 }),
        field("offer_source", "Tipo de oferta", "select", { required: true, options: digitalProductOptions.offer_source }),
        field("slug", "Identificador URL", "text", { required: true, maxLength: 120 }),
        field("short_description", "Resumen del producto", "textarea", { required: true, maxLength: 500 }),
        field("description", "Descripción completa", "textarea", { required: true, maxLength: 12000 }),
        field("category_id", "Categoría", "select", { options: [{ value: "", label: "Sin categoría" }, ...categoryOptions] }),
        field("image_url", "Imagen del producto (URL)", "url", { maxLength: 2048 }),
        field("brand", "Marca o proveedor", "text", { maxLength: 120 }),
        field("family_name", "Familia de producto (para relacionar planes)", "text", { maxLength: 120 }),
        field("plan_name", "Plan o edición", "text", { maxLength: 120 }),
        field("duration_value", "Duración", "number", { min: "1", step: "1" }),
        field("duration_unit", "Unidad de duración", "select", { options: digitalProductOptions.duration_unit }),
        field("price", "Precio de venta (USD)", "number", { min: "0.01", step: "0.01" }),
        field("previous_price", "Precio anterior (opcional; solo oferta real)", "number", { min: "0.01", step: "0.01" }),
        field("included_features", "Características incluidas (una por línea)", "textarea", { maxLength: 4000 }),
        field("distribution_method", "Modalidad de entrega", "select", { options: digitalProductOptions.distribution_method }),
        field("distribution_authorized", "Confirmo que el proveedor autoriza esta modalidad de distribución", "checkbox"),
        field("authorization_reference", "Referencia interna que respalda la autorización", "textarea", { maxLength: 1200 }),
        field("renewal_policy", "Renovación", "select", { options: digitalProductOptions.renewal_policy }),
        field("license_type", "Tipo de licencia o acceso", "select", { options: digitalProductOptions.license_type }),
        field("availability_status", "Disponibilidad", "select", { options: digitalProductOptions.availability_status }),
        field("stock_mode", "Control de stock", "select", { options: digitalProductOptions.stock_mode }),
        field("stock_quantity", "Unidades disponibles", "number", { min: "0", step: "1" }),
        field("conditions", "Condiciones y restricciones", "textarea", { maxLength: 4000 }),
        field("activation_instructions", "Instrucciones internas de activación (sin claves ni contraseñas)", "textarea", { maxLength: 4000 }),
        field("status", "Estado de publicación", "select", { required: true, options: commonStatusOptions.service }),
        field("sort_order", "Orden en el catálogo", "number", { required: true, step: "1" }),
      ];
    case "proyectos":
      return [
        field("title", "Nombre", "text", { required: true, maxLength: 180 }),
        field("slug", "Slug", "text", { required: true, maxLength: 120 }),
        field("short_description", "Descripción corta", "textarea", { required: true, maxLength: 500 }),
        field("description", "Descripción completa", "textarea", { required: true, maxLength: 12000 }),
        field("category_id", "Categoría", "select", {
          options: [{ value: "", label: "Sin categoría" }, ...categoryOptions],
        }),
        field("main_image", "Imagen principal", "file"),
        field("demo_url", "URL de demostración", "url", { maxLength: 2048 }),
        field("repository_url", "URL del repositorio", "url", { maxLength: 2048 }),
        field("technologies", "Tecnologías (una por línea)", "textarea", { maxLength: 4000 }),
        field("status", "Estado", "select", { required: true, options: commonStatusOptions.project }),
        field("featured", "Proyecto destacado", "checkbox"),
      ];
    case "categorias":
      return [
        field("name", "Nombre", "text", { required: true, maxLength: 120 }),
        field("slug", "Slug", "text", { required: true, maxLength: 120 }),
        field("description", "Descripción", "textarea", { maxLength: 1000 }),
        field("type", "Tipo", "select", {
          required: true,
          options: [
            { value: "SERVICE", label: "Servicios" },
            { value: "PROJECT", label: "Proyectos" },
          ],
        }),
      ];
    case "solicitudes":
      return [field("status", "Estado", "select", { required: true, options: commonStatusOptions.request })];
    case "mensajes":
      return [field("status", "Estado", "select", { required: true, options: commonStatusOptions.message })];
    case "testimonios":
      return [
        field("name", "Nombre", "text", { required: true, maxLength: 120 }),
        field("position", "Cargo", "text", { maxLength: 120 }),
        field("company", "Empresa", "text", { maxLength: 160 }),
        field("comment", "Comentario", "textarea", { required: true, maxLength: 4000 }),
        field("photo_url", "URL de fotografía", "url", { maxLength: 2048 }),
        field("rating", "Calificación (1–5)", "number", { required: true, min: "1", step: "1" }),
        field("status", "Estado", "select", { required: true, options: commonStatusOptions.testimonial }),
      ];
    case "configuracion":
      return [
        field("key", "Configuración pública", "select", { required: true, options: settingKeys }),
        field("value", "Valor público", "textarea", { required: true, maxLength: 1000 }),
      ];
  }
}

function AdminForm({
  section,
  fields,
  values,
  recordId,
  recordKey,
  operation,
  title,
}: {
  section: Section;
  fields: Field[];
  values?: Record<string, string | boolean | null>;
  recordId?: string;
  recordKey?: string;
  operation: "create" | "update" | "delete";
  title?: string;
}) {
  const [formValues, setFormValues] = useState(values ?? (section === "servicios-digitales"
    ? { status: "DRAFT", sort_order: "1", distribution_method: "WHATSAPP_MANUAL", renewal_policy: "CONFIRM_MANUALLY", license_type: "OTHER", availability_status: "ON_REQUEST", stock_mode: "UNLIMITED" }
    : {}));
  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const [imagePreviewFailed, setImagePreviewFailed] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const storedImageUrl = safeHttpUrl(
    typeof formValues.main_image === "string" ? formValues.main_image : "",
  );
  const previewImageUrl = filePreviewUrl || storedImageUrl;
  const previewDemoUrl = typeof formValues.demo_url === "string" ? formValues.demo_url : "";
  const youtubePreview = parseYouTubeLink(previewDemoUrl);
  function cancelFormChanges() {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    setSelectedImage(null);
    setFilePreviewUrl(null);
    setImagePreviewFailed(false);
    setFormValues(values ?? {});
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (operation === "update") {
      const details = formRef.current?.closest("details");
      if (details) details.open = false;
    }
  }
  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    [],
  );
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    async (previous, formData) => {
      if (section === "proyectos" && selectedImage) {
        formData.set("main_image_file", selectedImage);
      }
      const result = await adminMutationAction(previous, formData);
      if (section === "proyectos" && result.success) {
        if (typeof result.mainImageUrl === "string") {
          const mainImageUrl = result.mainImageUrl;
          setFormValues((current) => ({ ...current, main_image: mainImageUrl }));
        }
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
        setSelectedImage(null);
        setFilePreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
      return result;
    },
    {},
  );
  const showAdvanced = advancedExpanded || (section === "servicios-digitales" && Boolean(state.error?.toLowerCase().includes("autorizaci")));
  const selfProvided = section === "servicios-digitales" && formValues.offer_source === "SELF_PROVIDED";
  if (operation === "delete") {
    return (
      <form
        action={action}
        onSubmit={(event) => {
          const confirmation = section === "solicitudes"
            ? `¿Eliminar definitivamente la solicitud de ${title ?? "esta persona"}? Esta acción no se puede deshacer.`
            : `¿Seguro que deseas eliminar ${title ?? "este registro"}? Esta acción no se puede deshacer.`;
          if (!window.confirm(confirmation)) {
            event.preventDefault();
          }
        }}
        className="mt-3"
      >
        <input type="hidden" name="section" value={section} />
        <input type="hidden" name="operation" value="delete" />
        <input type="hidden" name="record_id" value={recordId ?? ""} />
        {section === "configuracion" ? (
          <input type="hidden" name="key" value={recordKey ?? ""} />
        ) : null}
        <button
          type="submit"
          disabled={pending}
          aria-label={section === "solicitudes" ? `Eliminar solicitud de ${title ?? "esta persona"}` : undefined}
          className="min-h-10 rounded-lg border border-rose-400/30 px-3 text-sm font-medium text-rose-200 hover:bg-rose-400/10 disabled:opacity-60"
        >
          {pending ? "Eliminando…" : "Eliminar"}
        </button>
        {state.error || state.success ? (
          <p className="mt-2 text-xs text-rose-200" role={state.error ? "alert" : "status"}>
            {state.error || state.success}
          </p>
        ) : null}
      </form>
    );
  }

  return (
    <form ref={formRef} action={action} className="grid min-w-0 gap-4 md:grid-cols-2">
      <input type="hidden" name="section" value={section} />
      <input type="hidden" name="operation" value={operation} />
      {recordId ? <input type="hidden" name="record_id" value={recordId} /> : null}
      {section === "servicios-digitales" ? (
        <input type="hidden" name="slug" value={typeof formValues.slug === "string" && formValues.slug ? formValues.slug : (typeof formValues.title === "string" ? formValues.title : "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120)} />
      ) : null}
      {section === "servicios-digitales" ? (
        <div className="rounded-lg border border-cyan-300/15 bg-cyan-300/[0.04] p-3 text-sm text-slate-300 md:col-span-2">
          Empieza con nombre, plan, duración y precio. Los detalles adicionales son opcionales o se completan en <button type="button" onClick={() => setAdvancedExpanded((visible) => !visible)} className="font-semibold text-cyan-200 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">{showAdvanced ? "menos opciones" : "más opciones"}</button>.
        </div>
      ) : null}
      {section === "servicios-digitales" && (!showAdvanced || selfProvided) ? fields
        .filter((item) => (!showAdvanced || (selfProvided && ["distribution_authorized", "authorization_reference"].includes(item.name))) && !["title", "offer_source", "brand", "family_name", "plan_name", "duration_value", "duration_unit", "price", "category_id", "short_description", "status", "slug"].includes(item.name))
        .map((item) => (
          <input
            key={`hidden-${item.name}`}
            type="hidden"
            name={item.name}
            value={item.kind === "checkbox" ? (formValues[item.name] === true ? "on" : "") : String(formValues[item.name] ?? "")}
          />
        )) : null}
      {fields.filter((item) => section !== "servicios-digitales" || ((["title", "offer_source", "brand", "family_name", "plan_name", "duration_value", "duration_unit", "price", "category_id", "short_description", "status"].includes(item.name) || showAdvanced) && !(selfProvided && ["distribution_authorized", "authorization_reference"].includes(item.name)))).map((item, index) => {
        if (section === "proyectos" && operation === "create" && item.name === "status") {
          return null;
        }
        if (section === "servicios-digitales" && item.name === "slug") return null;
        const value = formValues[item.name];
        const id = `${operation}-${recordId ?? "new"}-${item.name}`;
        const common = {
          id,
          name: item.name,
          required: item.required,
          maxLength: item.maxLength,
          className: "field-control",
        };
        const group = fieldGroups[section]?.[item.name];
        const previousGroup = index > 0
          ? fieldGroups[section]?.[fields[index - 1]?.name]
          : undefined;
        return (
          <Fragment key={item.name}>
          {group && group !== previousGroup ? (
            <h3 className="mt-2 border-b border-white/10 pb-2 text-sm font-semibold uppercase tracking-[0.12em] text-cyan-200 md:col-span-2">
              {group}
            </h3>
          ) : null}
          <div
            className={item.kind === "textarea" || item.kind === "file" ? "md:col-span-2" : ""}
          >
            {item.kind !== "checkbox" ? (
              <div className="mb-1.5 flex min-h-5 items-center justify-between gap-3">
                <label htmlFor={id} className="text-sm font-medium text-slate-200">
                  {item.label}{item.required ? <span className="ml-1 text-cyan-300" aria-hidden="true">*</span> : null}
                </label>
                {!item.required ? <span className="text-xs text-slate-500">Opcional</span> : null}
              </div>
            ) : null}
            {item.kind === "textarea" ? (
              <textarea
                {...common}
                rows={item.name === "description" || item.name === "comment" ? 5 : 3}
                value={typeof value === "string" ? value : ""}
                onChange={(event) => setFormValues((current) => ({ ...current, [item.name]: event.target.value }))}
                className={`${common.className} resize-y py-2`}
              />
            ) : item.kind === "select" ? (
              <select
                {...common}
                value={typeof value === "string" ? value : ""}
                onChange={(event) => setFormValues((current) => ({
                  ...current,
                  [item.name]: event.target.value,
                  ...(item.name === "duration_unit" && event.target.value === "PERMANENT" ? { duration_value: "" } : {}),
                  ...(item.name === "stock_mode" && event.target.value === "UNLIMITED" ? { stock_quantity: "" } : {}),
                }))}
              >
                {!item.required && !item.options?.some((option) => option.value === "") ? (
                  <option value="">—</option>
                ) : null}
                {item.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : item.kind === "file" ? (
              <>
                <input type="hidden" name="main_image" value={typeof value === "string" ? value : ""} />
                <input
                  {...common}
                  ref={fileInputRef}
                  name="main_image_file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  aria-describedby={`${id}-help`}
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0] ?? null;
                    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
                    objectUrlRef.current = file ? URL.createObjectURL(file) : null;
                    setSelectedImage(file);
                    setFilePreviewUrl(objectUrlRef.current);
                    setImagePreviewFailed(false);
                  }}
                />
                <p id={`${id}-help`} className="mt-1 text-xs leading-5 text-slate-400">
                  JPEG, PNG, WebP o AVIF; máximo 8 MB. {operation === "update" && storedImageUrl ? "Deja este campo vacío para conservar la imagen actual." : ""}
                </p>
                {selectedImage ? <p className="mt-1 break-all text-xs text-cyan-200">Imagen seleccionada: {selectedImage.name}</p> : null}
              </>
            ) : item.kind === "checkbox" ? (
              <label htmlFor={id} className="flex min-h-11 items-center gap-3 text-sm text-slate-200">
                <input
                  id={id}
                  name={item.name}
                  type="checkbox"
                  checked={value === true}
                  onChange={(event) => setFormValues((current) => ({ ...current, [item.name]: event.target.checked }))}
                  className="h-4 w-4 accent-cyan-400"
                />
                <span>{item.label}{item.required ? <span className="ml-1 text-cyan-300" aria-hidden="true">*</span> : null}</span>
              </label>
            ) : (
              <input
                {...common}
                type={item.kind}
                min={item.min}
                step={item.step}
                value={typeof value === "string" ? value : ""}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setFormValues((current) => ({
                    ...current,
                    [item.name]: nextValue,
                    ...(section === "servicios-digitales" && item.name === "title" && operation === "create"
                      ? { slug: nextValue.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120) }
                      : {}),
                  }));
                  if (item.name === "main_image") setImagePreviewFailed(false);
                }}
              />
            )}
          </div>
          </Fragment>
        );
      })}
      {section === "proyectos" ? (
        <section className="grid gap-4 rounded-xl border border-white/10 bg-black/10 p-4 md:col-span-2 sm:grid-cols-2" aria-label="Vista previa multimedia">
          <div>
            <p className="mb-2 text-xs font-medium text-slate-300">Vista previa de imagen (16:9)</p>
            <div className="relative aspect-video overflow-hidden rounded-lg bg-slate-900">
              {previewImageUrl && !imagePreviewFailed ? (
                <Image src={previewImageUrl} alt="Vista previa de imagen principal" fill unoptimized sizes="(max-width: 640px) 100vw, 50vw" className="object-cover" onError={() => setImagePreviewFailed(true)} />
              ) : (
                <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-400">{previewImageUrl ? "No se pudo cargar la imagen." : "Selecciona una imagen para ver la vista previa."}</div>
              )}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-slate-300">Vista previa de YouTube</p>
            <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-slate-900">
              {youtubePreview?.thumbnailUrl ? (
                <Image src={youtubePreview.thumbnailUrl} alt="Miniatura del video de YouTube" fill unoptimized sizes="(max-width: 640px) 100vw, 50vw" className="object-cover" />
              ) : (
                <p className="px-4 text-center text-sm text-slate-400">
                  {youtubePreview ? "Es una playlist; no se puede asegurar una miniatura de la lista completa." : "Una URL válida de video o playlist aparecerá aquí."}
                </p>
              )}
            </div>
            {youtubePreview ? <p className="mt-2 text-xs text-rose-200">Se identificará como tutorial. El enlace original se conservará.</p> : null}
          </div>
        </section>
      ) : null}
      {state.error || state.success ? (
        <p
          className={`rounded-lg border px-3 py-2 text-sm md:col-span-2 ${
            state.error
              ? "border-rose-400/30 bg-rose-400/10 text-rose-200"
              : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
          }`}
          role={state.error ? "alert" : "status"}
          aria-live="polite"
        >
          {state.error || state.success}
        </p>
      ) : null}
      <div className="space-y-3 border-t border-white/10 pt-4 md:col-span-2">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">
          Acciones
        </h3>
        {section === "proyectos" ? (
          <p className="text-xs leading-5 text-slate-500">
            {operation === "create"
              ? "Elige si quieres dejar el proyecto como borrador o publicarlo."
              : "Guarda el estado actual o selecciona una acción de publicación."}
          </p>
        ) : null}
        {section === "proyectos" ? (
          <div className="flex flex-wrap gap-3">
            {operation === "update" ? (
              <button type="submit" disabled={pending} className="button-primary min-h-11 px-4">
                {pending ? "Guardando…" : "Guardar cambios"}
              </button>
            ) : null}
            <button type="submit" name="project_intent" value="DRAFT" disabled={pending} className="button-secondary min-h-11 px-4 disabled:opacity-60">
              {pending ? "Guardando…" : "Guardar como borrador"}
            </button>
            <button type="submit" name="project_intent" value="PUBLISHED" disabled={pending} className={operation === "create" ? "button-primary min-h-11 px-4 disabled:opacity-60" : "button-secondary min-h-11 px-4 disabled:opacity-60"}>
              {pending ? "Guardando…" : operation === "create" ? "Publicar proyecto" : "Publicar / actualizar"}
            </button>
            <button type="button" onClick={cancelFormChanges} disabled={pending} className="button-secondary min-h-11 px-4 disabled:opacity-50">
              Cancelar
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={pending} className="button-primary min-h-11 px-4">
              {pending ? "Guardando…" : operation === "create" ? "Crear registro" : "Guardar cambios"}
            </button>
            <button type="button" onClick={cancelFormChanges} disabled={pending} className="button-secondary min-h-11 px-4 disabled:opacity-50">
              Cancelar
            </button>
          </div>
        )}
      </div>
    </form>
  );
}

function AdminDataManagerGeneric({
  section,
  records,
  categories,
}: {
  section: Section;
  records: AdminRecord[];
  categories: Option[];
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const fields = fieldsFor(section, categories);
  if (section === "servicios-digitales") {
    const digitalFieldOrder = [
      "title", "offer_source", "brand", "family_name", "plan_name", "duration_value", "duration_unit",
      "price", "category_id", "short_description", "status", "slug", "description",
      "image_url", "previous_price", "included_features", "distribution_method",
      "distribution_authorized", "authorization_reference", "renewal_policy", "license_type",
      "availability_status", "stock_mode", "stock_quantity", "conditions",
      "activation_instructions", "sort_order",
    ];
    fields.sort((a, b) => digitalFieldOrder.indexOf(a.name) - digitalFieldOrder.indexOf(b.name));
  }
  if (section === "proyectos") {
    const projectFieldOrder = [
      "title", "slug", "short_description", "description", "category_id",
      "technologies", "main_image", "demo_url", "repository_url", "status", "featured",
    ];
    fields.sort((a, b) => projectFieldOrder.indexOf(a.name) - projectFieldOrder.indexOf(b.name));
  }
  const canCreate = ["servicios", "servicios-digitales", "proyectos", "categorias", "testimonios", "configuracion"].includes(section);
  const canDelete = ["servicios", "servicios-digitales", "proyectos", "categorias", "solicitudes", "mensajes", "testimonios", "configuracion"].includes(section);
  const filteredRecords = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    if (!normalized) return records;
    return records.filter((record) =>
      `${record.title} ${record.details} ${Object.values(record.fields).join(" ")}`
        .toLocaleLowerCase("es")
        .includes(normalized),
    );
  }, [query, records]);
  const pageSize = 10;
  const pageCount = Math.ceil(filteredRecords.length / pageSize);
  const visibleRecords = filteredRecords.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="space-y-8">
      {canCreate ? (
        <section className="surface-card border-cyan-300/20 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-white">
            Crear {sectionLabels[section] ?? "registro"}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Completa la información por secciones. Los campos marcados con * son obligatorios.
          </p>
          {section === "servicios-digitales" ? (
            <div className="mt-4 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.04] p-4 text-sm leading-6 text-slate-300">
              <p>Configura cada plan independiente con marca, edición, duración, precio, características, disponibilidad y entrega. Para publicarlo debes confirmar la autorización del proveedor y guardar una referencia verificable. Las instrucciones de activación y la referencia quedan privadas para el administrador; nunca guardes claves ni contraseñas aquí. Pago y entrega se coordinan manualmente por WhatsApp.</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Link href="/admin/categorias" className="inline-flex min-h-10 items-center rounded-lg border border-white/15 px-3 font-semibold text-cyan-200 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Administrar categorías</Link>
                <Link href="/servicios-digitales" target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center rounded-lg border border-white/15 px-3 font-semibold text-cyan-200 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Vista previa de la tienda</Link>
              </div>
            </div>
          ) : null}
          {section === "servicios-digitales" && categories.length === 0 ? (
            <p className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/5 px-3 py-2 text-sm text-amber-100">
              Aún no hay categorías de servicios. Crea las familias del catálogo desde{" "}
              <Link href="/admin/categorias" className="font-semibold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Administrar categorías</Link>.
            </p>
          ) : null}
          {section === "proyectos" && categories.length === 0 ? (
            <p className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/5 px-3 py-2 text-sm text-amber-100">
              No hay categorías de proyectos disponibles. Puedes gestionarlas en{" "}
              <Link href="/admin/categorias" className="font-semibold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                Administración de categorías
              </Link>.
            </p>
          ) : null}
          <div className="mt-5">
            <AdminForm section={section} fields={fields} operation="create" />
          </div>
        </section>
      ) : null}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Registros</h2>
            <p className="mt-1 text-sm text-slate-400">
              {filteredRecords.length} resultado(s); se cargaron hasta 200 registros.
            </p>
          </div>
          <div className="w-full sm:max-w-xs">
            <label htmlFor="admin-search" className="sr-only">
              Buscar registros
            </label>
            <input
              id="admin-search"
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
              placeholder="Buscar registros…"
              className="field-control"
            />
          </div>
        </div>
        {visibleRecords.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-slate-400" role="status">
            {records.length === 0
              ? "Aún no hay registros."
              : "No hay resultados para esa búsqueda."}
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {visibleRecords.map((record) => (
              <article
                key={record.id}
                className="surface-card p-5 sm:p-6"
              >
                <header className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-white">{record.title}</h3>
                    <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-400">
                      {record.details}
                    </p>
                  </div>
                  {typeof record.fields.status === "string" ? (
                    <span
                      className={`inline-flex min-h-7 shrink-0 items-center rounded-full border px-2.5 text-xs font-semibold ${
                        record.fields.status === "PENDIENTE"
                          ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
                          : record.fields.status === "NUEVO"
                            ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
                            : "border-white/10 bg-white/[0.04] text-slate-300"
                      }`}
                    >
                      {statusLabels[record.fields.status] ?? record.fields.status}
                    </span>
                  ) : null}
                  {canDelete ? (
                    <AdminForm
                      section={section}
                      fields={[]}
                      recordId={record.id}
                      recordKey={typeof record.fields.key === "string" ? record.fields.key : undefined}
                      operation="delete"
                      title={record.title}
                    />
                  ) : null}
                </header>
                {section === "mensajes" || section === "solicitudes" ? null : (
                  <details className="mt-5 border-t border-white/10 pt-4">
                    <summary className="cursor-pointer text-sm font-medium text-cyan-300 outline-none hover:text-cyan-200 focus-visible:ring-2 focus-visible:ring-cyan-300">
                      Editar datos
                    </summary>
                    <div className="mt-4">
                      <AdminForm
                        section={section}
                        fields={fields}
                        values={record.fields}
                        recordId={record.id}
                        operation="update"
                      />
                    </div>
                  </details>
                )}
                {section === "mensajes" || section === "solicitudes" ? (
                  <div className="mt-5 border-t border-white/10 pt-4">
                    <AdminForm
                      section={section}
                      fields={fields}
                      values={record.fields}
                      recordId={record.id}
                      operation="update"
                    />
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
        {pageCount > 1 ? (
          <nav
            className="mt-6 flex items-center justify-between gap-4"
            aria-label="Paginación de registros"
          >
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              className="button-secondary min-h-11 px-4 disabled:opacity-40"
            >
              Anterior
            </button>
            <p className="text-sm text-slate-400" aria-live="polite">
              Página {page + 1} de {pageCount}
            </p>
            <button
              type="button"
              disabled={page + 1 >= pageCount}
              onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
              className="button-secondary min-h-11 px-4 disabled:opacity-40"
            >
              Siguiente
            </button>
          </nav>
        ) : null}
      </section>
    </div>
  );
}

export default function AdminDataManager(props: {
  section: Section;
  records: AdminRecord[];
  categories: Option[];
}) {
  if (props.section === "servicios-digitales") {
    return (
      <DigitalServicesManager
        records={props.records}
        categories={props.categories}
      />
    );
  }
  return <AdminDataManagerGeneric {...props} />;
}
