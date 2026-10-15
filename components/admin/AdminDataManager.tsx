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

type Section =
  | "usuarios"
  | "servicios"
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
        field("price", "Precio (opcional)", "number", { min: "0", step: "0.01" }),
        field("status", "Estado", "select", { required: true, options: commonStatusOptions.service }),
        field("sort_order", "Orden", "number", { required: true, step: "1" }),
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
  const [formValues, setFormValues] = useState(values ?? {});
  const [imagePreviewFailed, setImagePreviewFailed] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const storedImageUrl = safeHttpUrl(
    typeof formValues.main_image === "string" ? formValues.main_image : "",
  );
  const previewImageUrl = filePreviewUrl || storedImageUrl;
  const previewDemoUrl = typeof formValues.demo_url === "string" ? formValues.demo_url : "";
  const youtubePreview = parseYouTubeLink(previewDemoUrl);
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
  if (operation === "delete") {
    return (
      <form
        action={action}
        onSubmit={(event) => {
          if (!window.confirm(`¿Seguro que deseas eliminar ${title ?? "este registro"}? Esta acción no se puede deshacer.`)) {
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
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <input type="hidden" name="section" value={section} />
      <input type="hidden" name="operation" value={operation} />
      {recordId ? <input type="hidden" name="record_id" value={recordId} /> : null}
      {fields.map((item, index) => {
        const value = formValues[item.name];
        const id = `${operation}-${recordId ?? "new"}-${item.name}`;
        const common = {
          id,
          name: item.name,
          required: item.required,
          maxLength: item.maxLength,
          className: "field-control",
        };
        const projectGroup = section === "proyectos"
          ? index < 4 ? "Información general" : index < 8 ? "Clasificación" : "Multimedia y enlaces"
          : null;
        return (
          <Fragment key={item.name}>
          {projectGroup && (index === 0 || index === 4 || index === 8) ? (
            <h3 className="border-b border-white/10 pb-2 pt-2 text-sm font-semibold uppercase tracking-wide text-cyan-200 md:col-span-2">
              {projectGroup}
            </h3>
          ) : null}
          <div
            className={item.kind === "textarea" ? "md:col-span-2" : ""}
          >
            <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-slate-300">
              {item.label}
            </label>
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
                onChange={(event) => setFormValues((current) => ({ ...current, [item.name]: event.target.value }))}
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
              <label className="flex min-h-11 items-center gap-3 text-sm text-slate-200">
                <input
                  id={id}
                  name={item.name}
                  type="checkbox"
                  checked={value === true}
                  onChange={(event) => setFormValues((current) => ({ ...current, [item.name]: event.target.checked }))}
                  className="h-4 w-4 accent-cyan-400"
                />
                {item.label}
              </label>
            ) : (
              <input
                {...common}
                type={item.kind}
                min={item.min}
                step={item.step}
                value={typeof value === "string" ? value : ""}
                onChange={(event) => {
                  setFormValues((current) => ({ ...current, [item.name]: event.target.value }));
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
      <div className="md:col-span-2">
        {section === "proyectos" ? (
          <div className="flex flex-wrap gap-3">
            <button type="submit" name="project_intent" value="DRAFT" disabled={pending} className="button-secondary min-h-11 px-4 disabled:opacity-60">
              {pending ? "Guardando…" : "Guardar como borrador"}
            </button>
            <button type="submit" name="project_intent" value="PUBLISHED" disabled={pending} className="button-primary min-h-11 rounded-lg px-4 disabled:opacity-60">
              {pending ? "Guardando…" : operation === "create" ? "Publicar proyecto" : "Publicar / actualizar"}
            </button>
            <button type="submit" disabled={pending} className="min-h-11 rounded-lg border border-white/15 px-4 text-sm text-slate-200 disabled:opacity-60">
              {pending ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        ) : (
          <button type="submit" disabled={pending} className="button-primary min-h-11 rounded-lg px-4">
            {pending ? "Guardando…" : operation === "create" ? "Crear registro" : "Guardar cambios"}
          </button>
        )}
      </div>
    </form>
  );
}

export default function AdminDataManager({
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
  if (section === "proyectos") {
    const projectFieldOrder = [
      "title", "slug", "short_description", "description", "category_id",
      "technologies", "status", "featured", "main_image", "demo_url", "repository_url",
    ];
    fields.sort((a, b) => projectFieldOrder.indexOf(a.name) - projectFieldOrder.indexOf(b.name));
  }
  const canCreate = ["servicios", "proyectos", "categorias", "testimonios", "configuracion"].includes(section);
  const canDelete = ["servicios", "proyectos", "categorias", "mensajes", "testimonios", "configuracion"].includes(section);
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
          <h2 className="text-lg font-semibold text-white">Crear registro</h2>
          <p className="mt-1 text-sm text-slate-400">
            Completa los campos según el esquema disponible.
          </p>
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
