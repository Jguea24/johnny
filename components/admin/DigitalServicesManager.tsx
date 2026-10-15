"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  adminMutationAction,
  type AdminActionState,
} from "@/lib/admin/actions";
import type { AdminRecord } from "@/components/admin/AdminDataManager";

type CategoryOption = { value: string; label: string };
type DigitalFields = Record<string, string | boolean | null>;
type ProductType =
  | "SUBSCRIPTION"
  | "PERPETUAL_LICENSE"
  | "COURSE_ACCESS"
  | "DOWNLOAD"
  | "OTHER";
type OfferSource = "SELF_PROVIDED" | "THIRD_PARTY_AUTHORIZED";
type DurationUnit = "DAY" | "MONTH" | "YEAR" | "PERMANENT";
type Availability =
  | "AVAILABLE"
  | "ON_REQUEST"
  | "OUT_OF_STOCK"
  | "UNAVAILABLE";

const productTypes: { value: ProductType; label: string }[] = [
  { value: "SUBSCRIPTION", label: "Suscripción digital" },
  { value: "PERPETUAL_LICENSE", label: "Licencia de software" },
  { value: "DOWNLOAD", label: "Producto descargable" },
  { value: "COURSE_ACCESS", label: "Curso o capacitación" },
  { value: "OTHER", label: "Servicio tecnológico u otro" },
];

const statusOptions = [
  { value: "DRAFT", label: "Borrador" },
  { value: "ACTIVE", label: "Publicado" },
  { value: "INACTIVE", label: "Desactivado" },
];

const availabilityOptions: { value: Availability; label: string }[] = [
  { value: "AVAILABLE", label: "Disponible" },
  { value: "ON_REQUEST", label: "Consultar disponibilidad" },
  { value: "OUT_OF_STOCK", label: "Agotado" },
  { value: "UNAVAILABLE", label: "No disponible" },
];

const durationOptions: { value: DurationUnit; label: string }[] = [
  { value: "DAY", label: "Días" },
  { value: "MONTH", label: "Meses" },
  { value: "YEAR", label: "Años" },
  { value: "PERMANENT", label: "Permanente" },
];

const deliveryOptions = [
  { value: "WHATSAPP_MANUAL", label: "Coordinada manualmente por WhatsApp" },
  { value: "OFFICIAL_REDEMPTION_CODE", label: "Código oficial de canje" },
  { value: "OFFICIAL_INVITATION", label: "Invitación oficial del proveedor" },
  { value: "AUTHORIZED_DOWNLOAD", label: "Descarga autorizada" },
  { value: "OTHER_AUTHORIZED", label: "Otra modalidad autorizada" },
];

const renewalOptions = [
  { value: "RENEWABLE_MANUALLY", label: "Renovable manualmente" },
  { value: "NOT_RENEWABLE", label: "No renovable" },
  { value: "CONFIRM_MANUALLY", label: "Por confirmar" },
];

const offerSourceOptions: { value: OfferSource; label: string }[] = [
  { value: "THIRD_PARTY_AUTHORIZED", label: "Producto de un tercero" },
  { value: "SELF_PROVIDED", label: "Servicio propio" },
];

const initialValues: DigitalFields = {
  title: "",
  slug: "",
  short_description: "",
  description: "",
  category_id: "",
  image_url: "",
  price: "",
  status: "DRAFT",
  license_type: "SUBSCRIPTION",
  brand: "",
  family_name: "",
  plan_name: "",
  duration_value: "1",
  duration_unit: "MONTH",
  renewal_policy: "CONFIRM_MANUALLY",
  offer_source: "THIRD_PARTY_AUTHORIZED",
  distribution_method: "WHATSAPP_MANUAL",
  distribution_authorized: false,
  authorization_reference: "",
  activation_instructions: "",
  previous_price: "",
  tax_base0: "0",
  tax_baseimp: "0",
  tax_iva: "0",
  included_features: "",
  conditions: "",
  availability_status: "ON_REQUEST",
  stock_mode: "UNLIMITED",
  stock_quantity: "",
  sort_order: "0",
};

function slugFromTitle(title: string) {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120)
    .replace(/-+$/, "");
}

function formatPrice(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === "") return "Precio por definir";
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `USD ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "Precio por definir";
}

function typeLabel(value: string | null | undefined) {
  return productTypes.find((type) => type.value === value)?.label ?? "Otro producto";
}

function availabilityLabel(value: string | null | undefined) {
  return availabilityOptions.find((option) => option.value === value)?.label ?? "Por confirmar";
}

function statusLabel(value: string | null | undefined) {
  return statusOptions.find((option) => option.value === value)?.label ?? value ?? "Borrador";
}

function textValue(value: string | boolean | null | undefined) {
  return typeof value === "string" ? value : "";
}

function ActionMessage({ state }: { state: AdminActionState }) {
  if (!state.error && !state.success) return null;
  return (
    <p
      className={`rounded-xl border px-4 py-3 text-sm ${
        state.error
          ? "border-rose-300/25 bg-rose-300/[0.06] text-rose-100"
          : "border-emerald-300/25 bg-emerald-300/[0.06] text-emerald-100"
      }`}
      role={state.error ? "alert" : "status"}
      aria-live="polite"
    >
      {state.error || state.success}
    </p>
  );
}

function ProductImage({
  src,
  alt,
  className,
  sizes,
}: {
  src: string;
  alt: string;
  className: string;
  sizes: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        className={`${className} flex items-center justify-center bg-gradient-to-br from-cyan-950 via-slate-900 to-indigo-950 text-4xl text-cyan-200`}
        aria-label="Sin portada disponible"
      >
        ◇
      </div>
    );
  }
  return (
    <div className={`relative ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        unoptimized
        sizes={sizes}
        className="object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function DigitalProductForm({
  categories,
  record,
  operation,
}: {
  categories: CategoryOption[];
  record?: AdminRecord;
  operation: "create" | "update";
}) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    adminMutationAction,
    {},
  );
  const [values, setValues] = useState<DigitalFields>({
    ...initialValues,
    ...(record?.fields ?? {}),
  });
  const [slugEdited, setSlugEdited] = useState(Boolean(record));
  const [hideFieldErrors, setHideFieldErrors] = useState(false);
  const existingTaxBreakdown = Boolean(record) && [
    record?.fields.tax_base0,
    record?.fields.tax_baseimp,
    record?.fields.tax_iva,
  ].some((amount) => Number(amount) > 0);
  const [taxBreakdownEnabled, setTaxBreakdownEnabled] = useState(existingTaxBreakdown);

  const get = (name: string) => values[name];
  const set = (name: string, value: string | boolean) => {
    setHideFieldErrors(true);
    setValues((current) => ({ ...current, [name]: value }));
  };
  const productType = textValue(get("license_type")) as ProductType;
  const isSubscription = productType === "SUBSCRIPTION";
  const offerSource = textValue(get("offer_source")) as OfferSource;
  const isThirdParty = offerSource === "THIRD_PARTY_AUTHORIZED";
  const isPublished = get("status") === "ACTIVE";
  const price = textValue(get("price"));
  const previousPrice = textValue(get("previous_price"));
  const hasRealDiscount =
    previousPrice !== "" &&
    price !== "" &&
    Number(previousPrice) > Number(price);
  const durationValue = textValue(get("duration_value"));
  const durationUnit = textValue(get("duration_unit")) as DurationUnit;
  const durationUnitLabels: Record<Exclude<DurationUnit, "PERMANENT">, [string, string]> = {
    DAY: ["día", "días"],
    MONTH: ["mes", "meses"],
    YEAR: ["año", "años"],
  };
  const durationLabel = durationUnit === "PERMANENT"
    ? "Acceso permanente"
    : `${durationValue || "—"} ${durationUnitLabels[durationUnit]?.[Number(durationValue) === 1 ? 0 : 1] ?? "periodos"}`;
  const previewTitle = textValue(get("title")) || "Nombre del producto";
  const categoryName =
    categories.find((category) => category.value === get("category_id"))?.label ??
    "Categoría";
  const fieldError = (name: string) =>
    hideFieldErrors ? undefined : state.fieldErrors?.[name] || undefined;

  function cancel() {
    setValues({ ...initialValues, ...(record?.fields ?? {}) });
    setSlugEdited(Boolean(record));
    setTaxBreakdownEnabled(existingTaxBreakdown);
    setHideFieldErrors(true);
    if (operation === "update") {
      const details = document.getElementById(`edit-digital-${record?.id}`);
      if (details instanceof HTMLDetailsElement) details.open = false;
    }
  }

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (pending) {
          event.preventDefault();
          return;
        }
        setHideFieldErrors(false);
        if (
          record?.fields.status === "ACTIVE" &&
          get("status") === "INACTIVE" &&
          !window.confirm(`¿Desactivar «${record.title}»? Dejará de aparecer en el catálogo público.`)
        ) {
          event.preventDefault();
        }
      }}
      className="grid min-w-0 gap-5"
    >
      <input type="hidden" name="section" value="servicios-digitales" />
      <input type="hidden" name="operation" value={operation} />
      {record ? <input type="hidden" name="record_id" value={record.id} /> : null}
      <input type="hidden" name="icon" value={textValue(get("icon"))} />
      {!isSubscription ? (
        <>
          <input type="hidden" name="duration_value" value={textValue(get("duration_value"))} />
          <input type="hidden" name="duration_unit" value={textValue(get("duration_unit")) || "PERMANENT"} />
          <input type="hidden" name="renewal_policy" value={textValue(get("renewal_policy")) || "NOT_RENEWABLE"} />
        </>
      ) : null}
      {!isSubscription && !isThirdParty ? (
        <>
          <input type="hidden" name="brand" value={textValue(get("brand"))} />
          <input type="hidden" name="plan_name" value={textValue(get("plan_name"))} />
        </>
      ) : null}

      <section className="grid gap-4 rounded-2xl border border-white/10 bg-black/10 p-4 sm:p-5 md:grid-cols-2">
        <h3 className="md:col-span-2 text-sm font-semibold uppercase tracking-[0.14em] text-cyan-200">
          Información principal
        </h3>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-200" htmlFor={`${operation}-${record?.id ?? "new"}-title`}>
            Nombre comercial <span className="text-cyan-300">*</span>
          </label>
          <input
            id={`${operation}-${record?.id ?? "new"}-title`}
            name="title"
            required
            minLength={2}
            maxLength={180}
            value={textValue(get("title"))}
            onChange={(event) => {
              const title = event.target.value;
              setHideFieldErrors(true);
              setValues((current) => ({
                ...current,
                title,
                ...(slugEdited ? {} : { slug: slugFromTitle(title) }),
              }));
            }}
            className="field-control"
            aria-invalid={Boolean(fieldError("title"))}
            aria-describedby={fieldError("title") ? `${operation}-${record?.id ?? "new"}-title-error` : undefined}
          />
          {fieldError("title") ? <p id={`${operation}-${record?.id ?? "new"}-title-error`} className="mt-1 text-xs text-rose-200">{fieldError("title")}</p> : null}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-200" htmlFor={`${operation}-${record?.id ?? "new"}-category`}>
            Categoría
          </label>
          <select
            id={`${operation}-${record?.id ?? "new"}-category`}
            name="category_id"
            value={textValue(get("category_id"))}
            onChange={(event) => set("category_id", event.target.value)}
            className="field-control"
            aria-invalid={Boolean(fieldError("category_id"))}
          >
            <option value="">Selecciona una categoría</option>
            {categories.map((category) => (
              <option key={category.value} value={category.value}>{category.label}</option>
            ))}
          </select>
          {fieldError("category_id") ? <p className="mt-1 text-xs text-rose-200">{fieldError("category_id")}</p> : null}
        </div>

        <div className="md:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-slate-200" htmlFor={`${operation}-${record?.id ?? "new"}-short-description`}>
            Descripción corta <span className="text-cyan-300">*</span>
          </label>
          <textarea
            id={`${operation}-${record?.id ?? "new"}-short-description`}
            name="short_description"
            required
            minLength={3}
            maxLength={500}
            rows={2}
            value={textValue(get("short_description"))}
            onChange={(event) => set("short_description", event.target.value)}
            className="field-control resize-y py-2"
            aria-invalid={Boolean(fieldError("short_description"))}
          />
          {fieldError("short_description") ? <p className="mt-1 text-xs text-rose-200">{fieldError("short_description")}</p> : null}
        </div>

        <div className="md:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-slate-200" htmlFor={`${operation}-${record?.id ?? "new"}-image-url`}>
            Imagen o portada <span className="font-normal text-slate-500">· opcional</span>
          </label>
          <input
            id={`${operation}-${record?.id ?? "new"}-image-url`}
            name="image_url"
            type="url"
            maxLength={2048}
            placeholder="https://…"
            value={textValue(get("image_url"))}
            onChange={(event) => set("image_url", event.target.value)}
            className="field-control"
            aria-invalid={Boolean(fieldError("image_url"))}
          />
          <p className="mt-1 text-xs text-slate-500">Si la dejas vacía, se mostrará una portada gráfica de reemplazo.</p>
          {fieldError("image_url") ? <p className="mt-1 text-xs text-rose-200">{fieldError("image_url")}</p> : null}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-200" htmlFor={`${operation}-${record?.id ?? "new"}-product-type`}>
            Tipo de producto <span className="text-cyan-300">*</span>
          </label>
          <select
            id={`${operation}-${record?.id ?? "new"}-product-type`}
            name="license_type"
            required
            value={productType}
            onChange={(event) => {
              const nextType = event.target.value as ProductType;
              setHideFieldErrors(true);
              setValues((current) => ({
                ...current,
                license_type: nextType,
                ...(nextType === "SUBSCRIPTION"
                  ? {}
                  : {
                      duration_value: "",
                      duration_unit: "PERMANENT",
                      renewal_policy: "NOT_RENEWABLE",
                    }),
              }));
            }}
            className="field-control"
            aria-invalid={Boolean(fieldError("license_type"))}
          >
            {productTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
          {fieldError("license_type") ? <p className="mt-1 text-xs text-rose-200">{fieldError("license_type")}</p> : null}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-200" htmlFor={`${operation}-${record?.id ?? "new"}-price`}>
            Precio total (USD){isPublished ? <span className="text-cyan-300"> *</span> : null}
          </label>
          <input
            id={`${operation}-${record?.id ?? "new"}-price`}
            name="price"
            type="number"
            min="0.01"
            max="9999999999.99"
            step="0.01"
            required={isPublished}
            placeholder="0.00"
            value={price}
            onChange={(event) => set("price", event.target.value)}
            className="field-control"
            aria-invalid={Boolean(fieldError("price"))}
            aria-describedby={`${operation}-${record?.id ?? "new"}-price-help`}
          />
          <p id={`${operation}-${record?.id ?? "new"}-price-help`} className="mt-1 text-xs leading-5 text-slate-500">
            Es el total que se muestra y se registra en el pedido, con los impuestos aplicables incluidos. No se suma IVA automáticamente.
          </p>
          {fieldError("price") ? <p className="mt-1 text-xs text-rose-200">{fieldError("price")}</p> : null}
        </div>

        {isSubscription ? (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-200" htmlFor={`${operation}-${record?.id ?? "new"}-duration-value`}>
                Duración
              </label>
              <input
                id={`${operation}-${record?.id ?? "new"}-duration-value`}
                name="duration_value"
                type="number"
                min="1"
                max="32767"
                step="1"
                required={durationUnit !== "PERMANENT"}
                value={durationValue}
                onChange={(event) => set("duration_value", event.target.value)}
                className="field-control"
                aria-invalid={Boolean(fieldError("duration_value"))}
              />
              {fieldError("duration_value") ? <p className="mt-1 text-xs text-rose-200">{fieldError("duration_value")}</p> : null}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-200" htmlFor={`${operation}-${record?.id ?? "new"}-duration-unit`}>
                Unidad de duración
              </label>
              <select
                id={`${operation}-${record?.id ?? "new"}-duration-unit`}
                name="duration_unit"
                value={durationUnit}
                onChange={(event) => {
                  const nextUnit = event.target.value as DurationUnit;
                  setHideFieldErrors(true);
                  setValues((current) => ({
                    ...current,
                    duration_unit: nextUnit,
                    ...(nextUnit === "PERMANENT" ? { duration_value: "" } : {}),
                  }));
                }}
                className="field-control"
                aria-invalid={Boolean(fieldError("duration_unit"))}
              >
                {durationOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              {fieldError("duration_unit") ? <p className="mt-1 text-xs text-rose-200">{fieldError("duration_unit")}</p> : null}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-200" htmlFor={`${operation}-${record?.id ?? "new"}-renewal`}>
                Renovación
              </label>
              <select
                id={`${operation}-${record?.id ?? "new"}-renewal`}
                name="renewal_policy"
                value={textValue(get("renewal_policy")) || "CONFIRM_MANUALLY"}
                onChange={(event) => set("renewal_policy", event.target.value)}
                className="field-control"
                aria-invalid={Boolean(fieldError("renewal_policy"))}
              >
                {renewalOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              {fieldError("renewal_policy") ? <p className="mt-1 text-xs text-rose-200">{fieldError("renewal_policy")}</p> : null}
            </div>
          </>
        ) : null}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-200" htmlFor={`${operation}-${record?.id ?? "new"}-availability`}>
            Disponibilidad
          </label>
          <select
            id={`${operation}-${record?.id ?? "new"}-availability`}
            name="availability_status"
            value={textValue(get("availability_status")) || "ON_REQUEST"}
            onChange={(event) => set("availability_status", event.target.value)}
            className="field-control"
            aria-invalid={Boolean(fieldError("availability_status"))}
          >
            {availabilityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          {fieldError("availability_status") ? <p className="mt-1 text-xs text-rose-200">{fieldError("availability_status")}</p> : null}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-200" htmlFor={`${operation}-${record?.id ?? "new"}-stock-mode`}>
            Control de existencias
          </label>
          <select
            id={`${operation}-${record?.id ?? "new"}-stock-mode`}
            name="stock_mode"
            value={textValue(get("stock_mode")) || "UNLIMITED"}
            onChange={(event) => {
              const stockMode = event.target.value;
              setHideFieldErrors(true);
              setValues((current) => ({
                ...current,
                stock_mode: stockMode,
                ...(stockMode === "UNLIMITED" ? { stock_quantity: "" } : {}),
              }));
            }}
            className="field-control"
            aria-invalid={Boolean(fieldError("stock_mode"))}
          >
            <option value="UNLIMITED">Sin límite de unidades</option>
            <option value="LIMITED">Tengo unidades limitadas</option>
          </select>
          <p className="mt-1 text-xs text-slate-500">Activa el control si necesitas indicar cuántas unidades tienes disponibles.</p>
          {fieldError("stock_mode") ? <p className="mt-1 text-xs text-rose-200">{fieldError("stock_mode")}</p> : null}
        </div>

        {get("stock_mode") === "LIMITED" ? (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-200" htmlFor={`${operation}-${record?.id ?? "new"}-stock-quantity`}>
              Unidades disponibles
            </label>
            <input
              id={`${operation}-${record?.id ?? "new"}-stock-quantity`}
              name="stock_quantity"
              type="number"
              min="0"
              max="10000000"
              step="1"
              required
              value={textValue(get("stock_quantity"))}
              onChange={(event) => set("stock_quantity", event.target.value)}
              className="field-control"
              aria-invalid={Boolean(fieldError("stock_quantity"))}
            />
            <p className="mt-1 text-xs text-slate-500">Escribe 0 si temporalmente no tienes unidades.</p>
            {fieldError("stock_quantity") ? <p className="mt-1 text-xs text-rose-200">{fieldError("stock_quantity")}</p> : null}
          </div>
        ) : (
          <input type="hidden" name="stock_quantity" value="" />
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-200" htmlFor={`${operation}-${record?.id ?? "new"}-status`}>
            Estado de publicación
          </label>
          <select
            id={`${operation}-${record?.id ?? "new"}-status`}
            name="status"
            required
            value={textValue(get("status")) || "DRAFT"}
            onChange={(event) => {
              const nextStatus = event.target.value;
              set("status", nextStatus);
            }}
            className="field-control"
            aria-invalid={Boolean(fieldError("status"))}
          >
            {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          {fieldError("status") ? <p className="mt-1 text-xs text-rose-200">{fieldError("status")}</p> : null}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-200" htmlFor={`${operation}-${record?.id ?? "new"}-offer-source`}>
            Origen del producto
          </label>
          <select
            id={`${operation}-${record?.id ?? "new"}-offer-source`}
            name="offer_source"
            value={offerSource}
            onChange={(event) => set("offer_source", event.target.value)}
            className="field-control"
            aria-invalid={Boolean(fieldError("offer_source"))}
          >
            {offerSourceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          {fieldError("offer_source") ? <p className="mt-1 text-xs text-rose-200">{fieldError("offer_source")}</p> : null}
        </div>

        {isSubscription || isThirdParty ? (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-200" htmlFor={`${operation}-${record?.id ?? "new"}-brand`}>
                Marca o proveedor{isPublished && isThirdParty ? <span className="text-cyan-300"> *</span> : null}
              </label>
              <input
                id={`${operation}-${record?.id ?? "new"}-brand`}
                name="brand"
                maxLength={120}
                required={isPublished && isThirdParty}
                value={textValue(get("brand"))}
                onChange={(event) => set("brand", event.target.value)}
                className="field-control"
                aria-invalid={Boolean(fieldError("brand"))}
              />
              {fieldError("brand") ? <p className="mt-1 text-xs text-rose-200">{fieldError("brand")}</p> : null}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-200" htmlFor={`${operation}-${record?.id ?? "new"}-plan`}>
                Plan o edición{isPublished && isThirdParty ? <span className="text-cyan-300"> *</span> : null}
              </label>
              <input
                id={`${operation}-${record?.id ?? "new"}-plan`}
                name="plan_name"
                maxLength={120}
                required={isPublished && isThirdParty}
                value={textValue(get("plan_name"))}
                onChange={(event) => set("plan_name", event.target.value)}
                className="field-control"
                aria-invalid={Boolean(fieldError("plan_name"))}
              />
              {fieldError("plan_name") ? <p className="mt-1 text-xs text-rose-200">{fieldError("plan_name")}</p> : null}
            </div>
          </>
        ) : (
          <>
            <input type="hidden" name="brand" value={textValue(get("brand"))} />
            <input type="hidden" name="plan_name" value={textValue(get("plan_name"))} />
          </>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-200" htmlFor={`${operation}-${record?.id ?? "new"}-distribution`}>
            Modalidad de entrega
          </label>
          <select
            id={`${operation}-${record?.id ?? "new"}-distribution`}
            name="distribution_method"
            value={textValue(get("distribution_method")) || "WHATSAPP_MANUAL"}
            onChange={(event) => set("distribution_method", event.target.value)}
            className="field-control"
            aria-invalid={Boolean(fieldError("distribution_method"))}
          >
            {deliveryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          {fieldError("distribution_method") ? <p className="mt-1 text-xs text-rose-200">{fieldError("distribution_method")}</p> : null}
        </div>

        {isThirdParty ? (
          <div className="md:col-span-2 rounded-xl border border-amber-300/20 bg-amber-300/[0.04] p-4">
            <label className="flex min-h-11 items-start gap-3 text-sm leading-6 text-amber-50">
              <input
                type="checkbox"
                checked={get("distribution_authorized") === true}
                onChange={(event) => set("distribution_authorized", event.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 accent-cyan-300"
                required={isPublished}
                aria-invalid={Boolean(fieldError("distribution_authorized"))}
                aria-describedby={fieldError("distribution_authorized") ? `${operation}-${record?.id ?? "new"}-authorization-error` : undefined}
              />
              <span>Confirmo que cuento con autorización para ofrecer y entregar este producto conforme a las condiciones del proveedor.</span>
            </label>
            {fieldError("distribution_authorized") ? (
              <p id={`${operation}-${record?.id ?? "new"}-authorization-error`} className="mt-1 text-xs text-rose-200">
                {fieldError("distribution_authorized")}
              </p>
            ) : null}
          </div>
        ) : null}
        <input
          type="hidden"
          name="distribution_authorized"
          value={get("distribution_authorized") === true && isThirdParty ? "on" : ""}
        />
        <input
          type="hidden"
          name="authorization_reference"
          value={textValue(get("authorization_reference"))}
        />
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/10 p-4 sm:p-5" aria-label="Vista previa del producto">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Vista previa de la tarjeta</p>
        <article className="mx-auto flex max-w-sm min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111318]">
          <ProductImage
            key={textValue(get("image_url"))}
            src={textValue(get("image_url"))}
            alt={previewTitle}
            className="aspect-[16/9] w-full overflow-hidden"
            sizes="(max-width: 640px) 100vw, 24rem"
          />
          <div className="flex flex-1 flex-col p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-300">{categoryName}</p>
            <h4 className="mt-2 line-clamp-2 min-h-12 break-words text-lg font-bold text-white">{previewTitle}</h4>
            {isSubscription ? <p className="mt-1 text-sm text-cyan-100">{textValue(get("brand"))}{textValue(get("plan_name")) ? ` · ${textValue(get("plan_name"))}` : ""} · {durationLabel}</p> : null}
            <p className="mt-3 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-slate-400">{textValue(get("short_description")) || "La descripción corta aparecerá aquí."}</p>
            <div className="mt-auto flex min-h-10 items-end gap-2 pt-4">
              {hasRealDiscount ? <span className="text-sm text-slate-500 line-through">{formatPrice(previousPrice)}</span> : null}
              <p className="text-xl font-extrabold text-white">{formatPrice(price)}</p>
              {hasRealDiscount ? <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-xs font-bold text-rose-200">-{Math.round(((Number(previousPrice) - Number(price)) / Number(previousPrice)) * 100)}%</span> : null}
            </div>
            <p className="mt-2 text-xs text-slate-400">{availabilityLabel(textValue(get("availability_status")))}</p>
          </div>
        </article>
      </section>

      <details
        hidden
        className="rounded-2xl border border-white/10 bg-white/[0.02]"
      >
        <summary className="cursor-pointer list-none px-4 py-4 text-sm font-semibold text-cyan-200 outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 sm:px-5">
          Opciones avanzadas
          <span className="ml-2 text-xs font-normal text-slate-500">Slug, entrega, autorización, oferta, existencias y condiciones</span>
        </summary>
        <div className="grid gap-5 border-t border-white/10 p-4 sm:p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-200" htmlFor={`${operation}-${record?.id ?? "new"}-slug`}>
              Slug
            </label>
            <input
              id={`${operation}-${record?.id ?? "new"}-slug`}
              name="slug"
              maxLength={120}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              placeholder="Se genera a partir del nombre"
              value={textValue(get("slug")) || slugFromTitle(textValue(get("title")))}
              onChange={(event) => {
                set("slug", event.target.value);
                setSlugEdited(true);
              }}
              className="field-control"
              aria-invalid={Boolean(fieldError("slug"))}
            />
            <p className="mt-1 text-xs text-slate-500">Se genera automáticamente; puedes personalizarlo. Usa minúsculas y guiones.</p>
            {fieldError("slug") ? <p className="mt-1 text-xs text-rose-200">{fieldError("slug")}</p> : null}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-200" htmlFor={`${operation}-${record?.id ?? "new"}-offer-source`}>
              Origen del producto
            </label>
            <select
              id={`${operation}-${record?.id ?? "new"}-offer-source`}
              name="offer_source"
              value={offerSource}
              onChange={(event) => set("offer_source", event.target.value)}
              className="field-control"
              aria-invalid={Boolean(fieldError("offer_source"))}
            >
              {offerSourceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            {fieldError("offer_source") ? <p className="mt-1 text-xs text-rose-200">{fieldError("offer_source")}</p> : null}
          </div>

          {isSubscription || isThirdParty ? (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-200" htmlFor={`${operation}-${record?.id ?? "new"}-brand`}>
                  Marca o proveedor
                </label>
                <input id={`${operation}-${record?.id ?? "new"}-brand`} name="brand" maxLength={120} value={textValue(get("brand"))} onChange={(event) => set("brand", event.target.value)} className="field-control" aria-invalid={Boolean(fieldError("brand"))} />
                {fieldError("brand") ? <p className="mt-1 text-xs text-rose-200">{fieldError("brand")}</p> : null}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-200" htmlFor={`${operation}-${record?.id ?? "new"}-plan`}>
                  Plan o edición
                </label>
                <input id={`${operation}-${record?.id ?? "new"}-plan`} name="plan_name" maxLength={120} value={textValue(get("plan_name"))} onChange={(event) => set("plan_name", event.target.value)} className="field-control" aria-invalid={Boolean(fieldError("plan_name"))} />
                {fieldError("plan_name") ? <p className="mt-1 text-xs text-rose-200">{fieldError("plan_name")}</p> : null}
              </div>
            </>
          ) : null}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-200" htmlFor={`${operation}-${record?.id ?? "new"}-distribution`}>
              Modalidad de entrega
            </label>
            <select id={`${operation}-${record?.id ?? "new"}-distribution`} name="distribution_method" value={textValue(get("distribution_method")) || "WHATSAPP_MANUAL"} onChange={(event) => set("distribution_method", event.target.value)} className="field-control" aria-invalid={Boolean(fieldError("distribution_method"))}>
              {deliveryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            {fieldError("distribution_method") ? <p className="mt-1 text-xs text-rose-200">{fieldError("distribution_method")}</p> : null}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-200" htmlFor={`${operation}-${record?.id ?? "new"}-family`}>
              Familia de producto <span className="font-normal text-slate-500">· opcional</span>
            </label>
            <input id={`${operation}-${record?.id ?? "new"}-family`} name="family_name" maxLength={120} value={textValue(get("family_name"))} onChange={(event) => set("family_name", event.target.value)} className="field-control" />
            <p className="mt-1 text-xs text-slate-500">Úsala solo si relacionas varias ediciones o planes.</p>
            {fieldError("family_name") ? <p className="mt-1 text-xs text-rose-200">{fieldError("family_name")}</p> : null}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-200" htmlFor={`${operation}-${record?.id ?? "new"}-previous-price`}>
              Precio anterior (USD) <span className="font-normal text-slate-500">· solo si hubo una oferta real</span>
            </label>
            <input id={`${operation}-${record?.id ?? "new"}-previous-price`} name="previous_price" type="number" min="0.01" max="9999999999.99" step="0.01" value={textValue(get("previous_price"))} onChange={(event) => set("previous_price", event.target.value)} className="field-control" aria-invalid={Boolean(fieldError("previous_price"))} />
            {fieldError("previous_price") ? <p className="mt-1 text-xs text-rose-200">{fieldError("previous_price")}</p> : null}
          </div>

          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-200" htmlFor={`${operation}-${record?.id ?? "new"}-features`}>
              Características <span className="font-normal text-slate-500">· una por línea</span>
            </label>
            <textarea id={`${operation}-${record?.id ?? "new"}-features`} name="included_features" maxLength={4000} rows={3} value={textValue(get("included_features"))} onChange={(event) => set("included_features", event.target.value)} className="field-control resize-y py-2" aria-invalid={Boolean(fieldError("included_features"))} />
            {fieldError("included_features") ? <p className="mt-1 text-xs text-rose-200">{fieldError("included_features")}</p> : null}
          </div>

          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-200" htmlFor={`${operation}-${record?.id ?? "new"}-conditions`}>
              Condiciones y restricciones
            </label>
            <textarea id={`${operation}-${record?.id ?? "new"}-conditions`} name="conditions" maxLength={4000} rows={3} value={textValue(get("conditions"))} onChange={(event) => set("conditions", event.target.value)} className="field-control resize-y py-2" aria-invalid={Boolean(fieldError("conditions"))} />
            {fieldError("conditions") ? <p className="mt-1 text-xs text-rose-200">{fieldError("conditions")}</p> : null}
          </div>

          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-200" htmlFor={`${operation}-${record?.id ?? "new"}-description`}>
              Descripción completa <span className="font-normal text-slate-500">· opcional</span>
            </label>
            <textarea id={`${operation}-${record?.id ?? "new"}-description`} name="description" maxLength={12000} rows={4} value={textValue(get("description"))} onChange={(event) => set("description", event.target.value)} className="field-control resize-y py-2" aria-invalid={Boolean(fieldError("description"))} />
            {fieldError("description") ? <p className="mt-1 text-xs text-rose-200">{fieldError("description")}</p> : null}
          </div>

          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-200" htmlFor={`${operation}-${record?.id ?? "new"}-activation`}>
              Instrucciones internas de activación
            </label>
            <textarea id={`${operation}-${record?.id ?? "new"}-activation`} name="activation_instructions" maxLength={4000} rows={2} value={textValue(get("activation_instructions"))} onChange={(event) => set("activation_instructions", event.target.value)} className="field-control resize-y py-2" aria-invalid={Boolean(fieldError("activation_instructions"))} />
            <p className="mt-1 text-xs text-slate-500">Privadas para el equipo. No guardes claves, contraseñas ni datos de acceso.</p>
            {fieldError("activation_instructions") ? <p className="mt-1 text-xs text-rose-200">{fieldError("activation_instructions")}</p> : null}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-200" htmlFor={`${operation}-${record?.id ?? "new"}-sort-order`}>
              Orden en el catálogo
            </label>
            <input id={`${operation}-${record?.id ?? "new"}-sort-order`} name="sort_order" type="number" min="-100000" max="100000" step="1" value={textValue(get("sort_order")) || "0"} onChange={(event) => set("sort_order", event.target.value)} className="field-control" aria-invalid={Boolean(fieldError("sort_order"))} />
            {fieldError("sort_order") ? <p className="mt-1 text-xs text-rose-200">{fieldError("sort_order")}</p> : null}
          </div>

          <div className="md:col-span-2 rounded-xl border border-white/10 bg-white/[0.025] p-4 text-sm leading-6 text-slate-400">
            <p className="font-semibold text-slate-200">Impuestos y precio</p>
            <p className="mt-1">El pedido digital registra este precio como importe total. No se aplica una tasa automática ni se calcula un IVA adicional. El pedido WhatsApp no almacena un desglose tributario; estas columnas existentes se usan solo si se configura un desglose.</p>
            {existingTaxBreakdown ? <input type="hidden" name="tax_breakdown_enabled" value="on" /> : null}
            <label className="mt-3 flex min-h-11 items-center gap-3 text-sm text-slate-200">
              <input
                type="checkbox"
                name="tax_breakdown_enabled"
                checked={taxBreakdownEnabled}
                disabled={existingTaxBreakdown}
                onChange={(event) => {
                  setHideFieldErrors(true);
                  setTaxBreakdownEnabled(event.target.checked);
                }}
                className="h-4 w-4 accent-cyan-300"
              />
              <span>{existingTaxBreakdown ? "Desglose tributario guardado" : "Configurar desglose tributario (opcional)"}</span>
            </label>
            <p className="mt-1 text-xs">Configúralo solo si el medio de pago o documento fiscal lo requiere. Son importes en USD, no porcentajes; se debe indicar la clasificación fiscal correspondiente sin asumir una tasa universal. Al activarlo, bases e IVA deben sumar exactamente el precio total.</p>
            {existingTaxBreakdown ? <p className="mt-1 text-xs text-amber-100">Este producto ya tiene importes fiscales registrados. Ajusta el desglose junto al precio; el formulario conservará estos datos y no los borra al editar.</p> : null}
            {taxBreakdownEnabled ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {([
                  ["tax_base0", "Base 0 %"],
                  ["tax_baseimp", "Base imponible"],
                  ["tax_iva", "IVA"],
                ] as const).map(([name, label]) => (
                  <div key={name}>
                    <label className="mb-1.5 block text-sm font-medium text-slate-200" htmlFor={`${operation}-${record?.id ?? "new"}-${name}`}>{label} (USD)</label>
                    <input
                      id={`${operation}-${record?.id ?? "new"}-${name}`}
                      name={name}
                      type="number"
                      min="0"
                      max="9999999999.99"
                      step="0.01"
                      required
                      value={textValue(get(name))}
                      onChange={(event) => set(name, event.target.value)}
                      className="field-control"
                      aria-invalid={Boolean(fieldError(name))}
                    />
                    {fieldError(name) ? <p className="mt-1 text-xs text-rose-200">{fieldError(name)}</p> : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </details>

      {!hideFieldErrors && state.error ? <ActionMessage state={state} /> : null}
      {!state.error && state.success ? <ActionMessage state={state} /> : null}
      <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
        <button type="submit" disabled={pending} className="button-primary min-h-11 px-5 disabled:cursor-wait disabled:opacity-60">
          {pending ? "Guardando…" : operation === "create" ? "Crear producto" : "Guardar cambios"}
        </button>
        <button type="button" onClick={cancel} disabled={pending} className="button-secondary min-h-11 px-5 disabled:opacity-50">
          Cancelar
        </button>
        <p className="text-xs text-slate-500">El pago se coordina manualmente y el pedido no se marca como pagado automáticamente.</p>
      </div>
    </form>
  );
}

function DigitalProductAction({
  record,
  operation,
}: {
  record: AdminRecord;
  operation: "duplicate" | "deactivate";
}) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    adminMutationAction,
    {},
  );
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (pending) {
          event.preventDefault();
          return;
        }
        if (
          operation === "deactivate" &&
          !window.confirm(`¿Desactivar «${record.title}»? Dejará de aparecer en el catálogo público.`)
        ) {
          event.preventDefault();
        }
      }}
      className="flex flex-col items-start gap-2"
    >
      <input type="hidden" name="section" value="servicios-digitales" />
      <input type="hidden" name="operation" value={operation} />
      <input type="hidden" name="record_id" value={record.id} />
      <button
        type="submit"
        disabled={pending}
        className={operation === "deactivate"
          ? "min-h-10 rounded-lg border border-amber-300/25 px-3 text-sm font-semibold text-amber-100 hover:bg-amber-300/[0.06] disabled:opacity-50"
          : "min-h-10 rounded-lg border border-white/15 px-3 text-sm font-semibold text-slate-200 hover:bg-white/[0.05] disabled:opacity-50"}
      >
        {pending
          ? operation === "deactivate" ? "Desactivando…" : "Duplicando…"
          : operation === "deactivate" ? "Desactivar" : "Duplicar"}
      </button>
      <ActionMessage state={state} />
    </form>
  );
}

function DigitalProductDeleteDialog({
  record,
  onClose,
}: {
  record: AdminRecord;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    adminMutationAction,
    {},
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);
  useEffect(() => {
    if (state.success) onClose();
  }, [onClose, state.success]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onCancel={(event) => {
        if (pending) event.preventDefault();
      }}
      aria-labelledby={`delete-digital-title-${record.id}`}
      aria-describedby={`delete-digital-warning-${record.id}`}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-rose-300/25 bg-slate-950 p-0 text-white shadow-2xl backdrop:bg-black/75"
    >
      <div className="space-y-5 p-5 sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-200">Acción irreversible</p>
          <h2 id={`delete-digital-title-${record.id}`} className="mt-2 text-xl font-semibold">Eliminar servicio digital</h2>
        </div>
        <p id={`delete-digital-warning-${record.id}`} className="text-sm leading-6 text-slate-300">
          Vas a eliminar definitivamente <strong className="break-words text-white">«{record.title}»</strong>.
          Esta acción puede ser irreversible. Los productos con pedidos asociados no se pueden borrar; sus pedidos y pagos históricos se conservarán.
        </p>
        <form
          action={action}
          onSubmit={(event) => {
            if (pending) event.preventDefault();
          }}
          className="space-y-4"
        >
          <input type="hidden" name="section" value="servicios-digitales" />
          <input type="hidden" name="operation" value="delete" />
          <input type="hidden" name="record_id" value={record.id} />
          <input type="hidden" name="confirm_delete" value="confirmed" />
          <ActionMessage state={state} />
          <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              disabled={pending}
              className="button-secondary min-h-11 px-4 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="min-h-11 rounded-xl border border-rose-300/35 bg-rose-500/15 px-4 font-semibold text-rose-100 hover:bg-rose-500/25 disabled:cursor-wait disabled:opacity-60"
            >
              {pending ? "Eliminando…" : "Eliminar definitivamente"}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

function DigitalProductDeleteAction({ record }: { record: AdminRecord }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-10 rounded-lg border border-rose-300/25 px-3 text-sm font-semibold text-rose-200 hover:bg-rose-300/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
      >
        Eliminar
      </button>
      {open ? <DigitalProductDeleteDialog record={record} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export default function DigitalServicesManager({
  records,
  categories,
}: {
  records: AdminRecord[];
  categories: CategoryOption[];
}) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("");
  const [availability, setAvailability] = useState("");
  const [page, setPage] = useState(0);
  const filteredRecords = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    return records.filter((record) => {
      const matchesQuery =
        !normalized ||
        `${record.title} ${record.details} ${Object.values(record.fields).join(" ")}`
          .toLocaleLowerCase("es")
          .includes(normalized);
      return (
        matchesQuery &&
        (!categoryId || record.fields.category_id === categoryId) &&
        (!status || record.fields.status === status) &&
        (!availability || record.fields.availability_status === availability)
      );
    });
  }, [availability, categoryId, query, records, status]);
  const pageSize = 12;
  const pageCount = Math.ceil(filteredRecords.length / pageSize);
  const visibleRecords = filteredRecords.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="space-y-8">
      <section className="surface-card border-cyan-300/20 p-4 sm:p-6">
        <div className="mb-5">
          <p className="section-eyebrow">Catálogo</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Nuevo servicio digital</h2>
          <p className="mt-1 text-sm leading-6 text-slate-400">Completa los datos básicos. La autorización comercial se valida únicamente al publicar productos de terceros.</p>
        </div>
        {categories.length === 0 ? (
          <p className="mb-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.04] p-3 text-sm text-amber-100">
            No hay categorías de servicios configuradas. Puedes guardar borradores y crear categorías desde{" "}
            <Link href="/admin/categorias" className="font-semibold underline underline-offset-2">Administrar categorías</Link>.
          </p>
        ) : null}
        <DigitalProductForm categories={categories} operation="create" />
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-eyebrow">Administración</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Productos</h2>
            <p className="mt-1 text-sm text-slate-400">{filteredRecords.length} resultado(s); se muestran hasta 200 productos.</p>
          </div>
          <label className="w-full sm:max-w-xs">
            <span className="sr-only">Buscar productos</span>
            <input
              type="search"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(0); }}
              placeholder="Buscar producto o plan…"
              className="field-control"
            />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-medium text-slate-400">
            Categoría
            <select value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setPage(0); }} className="field-control mt-1">
              <option value="">Todas las categorías</option>
              {categories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-400">
            Publicación
            <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); }} className="field-control mt-1">
              <option value="">Todos los estados</option>
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-400">
            Disponibilidad
            <select value={availability} onChange={(event) => { setAvailability(event.target.value); setPage(0); }} className="field-control mt-1">
              <option value="">Todas</option>
              {availabilityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <div className="flex items-end">
            <Link href="/servicios-digitales" target="_blank" rel="noreferrer" className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-white/15 px-4 text-sm font-semibold text-cyan-200 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
              Vista previa de la tienda
            </Link>
          </div>
        </div>

        {visibleRecords.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-slate-400" role="status">
            {records.length === 0 ? "Aún no hay productos. Crea el primero arriba." : "No hay productos que coincidan con estos filtros."}
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {visibleRecords.map((record) => {
              const fields = record.fields;
              const imageUrl = textValue(fields.image_url);
              const active = fields.status === "ACTIVE";
              const discounted =
                typeof fields.previous_price === "string" &&
                typeof fields.price === "string" &&
                Number(fields.previous_price) > Number(fields.price);
              const discount = discounted
                ? Math.round(((Number(fields.previous_price) - Number(fields.price)) / Number(fields.previous_price)) * 100)
                : 0;
              return (
                <article key={record.id} className="surface-card min-w-0 overflow-hidden">
                  <div className="flex min-w-0 gap-4 p-4 sm:p-5">
                    <ProductImage key={imageUrl} src={imageUrl} alt="" className="aspect-square w-24 shrink-0 overflow-hidden rounded-xl sm:w-28" sizes="7rem" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex min-h-6 items-center rounded-full border px-2 text-[11px] font-semibold ${active ? "border-emerald-300/25 bg-emerald-300/[0.06] text-emerald-100" : "border-white/10 bg-white/[0.04] text-slate-300"}`}>
                          {statusLabel(textValue(fields.status))}
                        </span>
                        <span className="text-xs text-slate-500">{availabilityLabel(textValue(fields.availability_status))}</span>
                      </div>
                      <h3 className="mt-2 line-clamp-2 break-words font-semibold text-white">{record.title}</h3>
                      <p className="mt-1 line-clamp-1 text-xs text-cyan-200">{textValue(fields.category_name) || "Sin categoría"} · {typeLabel(textValue(fields.license_type))}</p>
                      {textValue(fields.brand) || textValue(fields.plan_name) ? <p className="mt-1 line-clamp-1 text-xs text-slate-400">{[textValue(fields.brand), textValue(fields.plan_name)].filter(Boolean).join(" · ")}</p> : null}
                      <div className="mt-2 flex flex-wrap items-baseline gap-2">
                        {discounted ? <span className="text-xs text-slate-500 line-through">{formatPrice(fields.previous_price)}</span> : null}
                        <span className="font-bold text-white">{formatPrice(fields.price)}</span>
                        {discounted ? <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-[11px] font-bold text-rose-200">-{discount}%</span> : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 border-t border-white/10 px-4 py-3 sm:px-5">
                    <details id={`edit-digital-${record.id}`} className="group min-w-0 flex-1">
                      <summary className="inline-flex min-h-10 cursor-pointer list-none items-center rounded-lg bg-cyan-300 px-3 text-sm font-semibold text-slate-950 hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                        Editar
                      </summary>
                      <div className="mt-4 border-t border-white/10 pt-4">
                        <DigitalProductForm categories={categories} record={record} operation="update" />
                      </div>
                    </details>
                    <DigitalProductAction record={record} operation="duplicate" />
                    {active ? <DigitalProductAction record={record} operation="deactivate" /> : null}
                    <DigitalProductDeleteAction record={record} />
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {pageCount > 1 ? (
          <nav className="flex items-center justify-between gap-4" aria-label="Paginación de productos">
            <button type="button" disabled={page === 0} onClick={() => setPage((current) => Math.max(current - 1, 0))} className="button-secondary min-h-11 px-4 disabled:opacity-40">Anterior</button>
            <p className="text-sm text-slate-400" aria-live="polite">Página {page + 1} de {pageCount}</p>
            <button type="button" disabled={page + 1 >= pageCount} onClick={() => setPage((current) => Math.min(current + 1, pageCount - 1))} className="button-secondary min-h-11 px-4 disabled:opacity-40">Siguiente</button>
          </nav>
        ) : null}
      </section>
    </div>
  );
}
