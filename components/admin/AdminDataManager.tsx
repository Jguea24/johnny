"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import {
  adminMutationAction,
  type AdminActionState,
} from "@/lib/admin/actions";

type Section =
  | "usuarios"
  | "servicios"
  | "proyectos"
  | "categorias"
  | "solicitudes"
  | "mensajes"
  | "testimonios"
  | "configuracion";
type FieldKind = "text" | "textarea" | "url" | "number" | "select" | "checkbox";
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
        field("main_image", "URL de imagen principal", "url", { maxLength: 2048 }),
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
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    adminMutationAction,
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
      {fields.map((item) => {
        const value = values?.[item.name];
        const id = `${operation}-${recordId ?? "new"}-${item.name}`;
        const common = {
          id,
          name: item.name,
          required: item.required,
          maxLength: item.maxLength,
          className:
            "min-h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-cyan-400",
        };
        return (
          <div
            key={item.name}
            className={item.kind === "textarea" ? "md:col-span-2" : ""}
          >
            <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-slate-300">
              {item.label}
            </label>
            {item.kind === "textarea" ? (
              <textarea
                {...common}
                rows={item.name === "description" || item.name === "comment" ? 5 : 3}
                defaultValue={typeof value === "string" ? value : ""}
                className={`${common.className} resize-y py-2`}
              />
            ) : item.kind === "select" ? (
              <select
                {...common}
                defaultValue={typeof value === "string" ? value : ""}
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
            ) : item.kind === "checkbox" ? (
              <label className="flex min-h-11 items-center gap-3 text-sm text-slate-200">
                <input
                  id={id}
                  name={item.name}
                  type="checkbox"
                  defaultChecked={value === true}
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
                defaultValue={typeof value === "string" ? value : ""}
              />
            )}
          </div>
        );
      })}
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
        <button
          type="submit"
          disabled={pending}
          className="min-h-10 rounded-lg bg-cyan-400 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
        >
          {pending
            ? "Guardando…"
            : operation === "create"
              ? "Crear registro"
              : "Guardar cambios"}
        </button>
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
        <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.04] p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-white">Crear registro</h2>
          <p className="mt-1 text-sm text-slate-400">
            Completa los campos según el esquema disponible.
          </p>
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
              className="min-h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
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
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
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
              className="min-h-10 rounded-lg border border-white/10 px-4 text-sm text-slate-200 disabled:opacity-40"
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
              className="min-h-10 rounded-lg border border-white/10 px-4 text-sm text-slate-200 disabled:opacity-40"
            >
              Siguiente
            </button>
          </nav>
        ) : null}
      </section>
    </div>
  );
}
