"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useState } from "react";
import {
  deleteTeamMemberAction,
  saveTeamMemberAction,
  type TeamActionState,
} from "@/lib/admin/team-actions";
import type { Database } from "@/types/database";

type TeamMember = Database["public"]["Tables"]["team_members"]["Row"];

const inputClass =
  "min-h-11 w-full min-w-0 rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-cyan-400";
const labelClass = "mb-1.5 block text-xs font-medium text-slate-300";

function ResultMessage({ state }: { state: TeamActionState }) {
  if (!state.error && !state.success && !state.warning) return null;
  return (
    <div
      className={`space-y-1 rounded-lg border px-3 py-2 text-sm ${
        state.error
          ? "border-rose-400/30 bg-rose-400/10 text-rose-200"
          : state.warning
            ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
            : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
      }`}
      role={state.error ? "alert" : "status"}
      aria-live="polite"
    >
      {state.error ?? state.warning ?? state.success}
    </div>
  );
}

function TeamMemberForm({
  member,
  founder = false,
  onSaved,
}: {
  member?: TeamMember;
  founder?: boolean;
  onSaved: (created: boolean) => void;
}) {
  const [state, action, pending] = useActionState<TeamActionState, FormData>(
    saveTeamMemberAction,
    {},
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [draftPreview, setDraftPreview] = useState({
    fullName: member?.full_name ?? "",
    position: member?.position ?? "",
    specialty: member?.specialty ?? "",
    bio: member?.bio ?? "",
    linkedinUrl: member?.linkedin_url ?? "",
    websiteUrl: member?.website_url ?? "",
    isActive: member?.is_active ?? false,
    isFeatured: member?.is_featured ?? false,
    removeAvatar: false,
  });

  useEffect(() => {
    if (state.success) {
      onSaved(!member);
    }
  }, [member, onSaved, state]);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  function handleImageChange(file: File | null) {
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  function handleFormChange(form: HTMLFormElement) {
    const values = new FormData(form);
    setDraftPreview({
      fullName: founder ? "Johnny Grefa" : String(values.get("full_name") ?? ""),
      position: founder
        ? "Fundador y responsable de la marca"
        : String(values.get("position") ?? ""),
      specialty: String(values.get("specialty") ?? ""),
      bio: String(values.get("bio") ?? ""),
      linkedinUrl: String(values.get("linkedin_url") ?? ""),
      websiteUrl: String(values.get("website_url") ?? ""),
      isActive: values.get("is_active") === "on",
      isFeatured: values.get("is_featured") === "on",
      removeAvatar: values.get("remove_avatar") === "on",
    });
  }

  const imageUrl =
    previewUrl ?? (draftPreview.removeAvatar ? null : member?.avatar_url ?? null);
  const linkedinPreview = safePreviewUrl(draftPreview.linkedinUrl || null);
  const websitePreview = safePreviewUrl(draftPreview.websiteUrl || null);

  return (
    <form
      action={action}
      onChange={(event) => handleFormChange(event.currentTarget)}
      className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]"
    >
      {member ? (
        <input type="hidden" name="member_id" value={member.id} />
      ) : null}
      <div className="grid min-w-0 content-start gap-4 sm:grid-cols-2">
        {founder ? (
          <>
            <div>
              <label className={labelClass} htmlFor="founder-name">
                Nombre
              </label>
              <input
                id="founder-name"
                value="Johnny Grefa"
                readOnly
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="founder-position">
                Cargo
              </label>
              <input
                id="founder-position"
                value="Fundador y responsable de la marca"
                readOnly
                className={inputClass}
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className={labelClass} htmlFor={`member-name-${member?.id ?? "new"}`}>
                Nombre completo
              </label>
              <input
                id={`member-name-${member?.id ?? "new"}`}
                name="full_name"
                maxLength={120}
                defaultValue={member?.full_name ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor={`member-position-${member?.id ?? "new"}`}>
                Cargo
              </label>
              <input
                id={`member-position-${member?.id ?? "new"}`}
                name="position"
                maxLength={160}
                defaultValue={member?.position ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor={`member-specialty-${member?.id ?? "new"}`}>
                Especialidad
              </label>
              <input
                id={`member-specialty-${member?.id ?? "new"}`}
                name="specialty"
                maxLength={160}
                defaultValue={member?.specialty ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor={`member-slug-${member?.id ?? "new"}`}>
                Identificador de URL
              </label>
              <input
                id={`member-slug-${member?.id ?? "new"}`}
                name="slug"
                maxLength={140}
                placeholder="Se genera a partir del nombre"
                defaultValue={member?.slug ?? ""}
                className={inputClass}
              />
            </div>
          </>
        )}
        {founder ? (
          <input type="hidden" name="slug" value="johnny-grefa" />
        ) : null}
        <div className="sm:col-span-2">
          <label
            className={labelClass}
            htmlFor={`${founder ? "founder" : "member"}-bio-${member?.id ?? "new"}`}
          >
            {founder ? "Presentación editable" : "Biografía"}
          </label>
          <textarea
            id={`${founder ? "founder" : "member"}-bio-${member?.id ?? "new"}`}
            name="bio"
            rows={5}
            maxLength={2000}
            defaultValue={member?.bio ?? ""}
            className={`${inputClass} resize-y py-2`}
          />
          <p className="mt-1 text-xs text-slate-500">
            Máximo 2.000 caracteres. Se requiere una presentación real para publicar.
          </p>
        </div>
        <div>
          <label
            className={labelClass}
            htmlFor={`${founder ? "founder" : "member"}-linkedin-${member?.id ?? "new"}`}
          >
            LinkedIn (opcional)
          </label>
          <input
            id={`${founder ? "founder" : "member"}-linkedin-${member?.id ?? "new"}`}
            name="linkedin_url"
            type="url"
            maxLength={2048}
            defaultValue={member?.linkedin_url ?? ""}
            placeholder="https://www.linkedin.com/in/…"
            className={inputClass}
          />
        </div>
        <div>
          <label
            className={labelClass}
            htmlFor={`${founder ? "founder" : "member"}-website-${member?.id ?? "new"}`}
          >
            Sitio web (opcional)
          </label>
          <input
            id={`${founder ? "founder" : "member"}-website-${member?.id ?? "new"}`}
            name="website_url"
            type="url"
            maxLength={2048}
            defaultValue={member?.website_url ?? ""}
            placeholder="https://…"
            className={inputClass}
          />
        </div>
        <div>
          <label
            className={labelClass}
            htmlFor={`${founder ? "founder" : "member"}-photo-${member?.id ?? "new"}`}
          >
            Fotografía real (JPEG, PNG, WebP o AVIF; máximo 8 MB)
          </label>
          <input
            id={`${founder ? "founder" : "member"}-photo-${member?.id ?? "new"}`}
            name="avatar_file"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={(event) =>
              handleImageChange(event.currentTarget.files?.[0] ?? null)
            }
            className="block min-h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-2 text-xs text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-cyan-400 file:px-3 file:py-2 file:font-semibold file:text-slate-950"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor={`member-order-${member?.id ?? "new"}`}>
            Orden de presentación
          </label>
          <input
            id={`member-order-${member?.id ?? "new"}`}
            name="display_order"
            type="number"
            min={0}
            max={100000}
            step={1}
            defaultValue={member?.display_order ?? 0}
            className={inputClass}
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 sm:col-span-2">
          {!founder ? (
            <label className="flex min-h-11 items-center gap-3 text-sm text-slate-200">
              <input
                type="checkbox"
                name="is_featured"
                defaultChecked={member?.is_featured ?? false}
                className="h-4 w-4 accent-cyan-400"
              />
              Destacar colaborador
            </label>
          ) : null}
          <label className="flex min-h-11 items-center gap-3 text-sm text-slate-200">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={member?.is_active ?? false}
              className="h-4 w-4 accent-cyan-400"
            />
            Publicar perfil
          </label>
          {member?.avatar_path ? (
            <label className="flex min-h-11 items-center gap-3 text-sm text-rose-200">
              <input
                type="checkbox"
                name="remove_avatar"
                className="h-4 w-4 accent-rose-400"
              />
              Quitar fotografía actual
            </label>
          ) : null}
        </div>
      </div>
      <aside className="min-w-0 space-y-3" aria-label="Vista previa del perfil">
        <p className={labelClass}>Vista previa de tarjeta</p>
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-white/10 bg-slate-950">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={member?.full_name || "Vista previa de fotografía"}
              fill
              unoptimized
              sizes="(max-width: 1280px) 100vw, 18rem"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center p-5 text-center text-sm text-slate-500">
              Aún no hay fotografía. No se publicará hasta cargar una imagen real.
            </div>
          )}
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
            {draftPreview.isActive ? "Publicado" : "Borrador"}
          </p>
          <h3 className="mt-2 break-words text-lg font-semibold text-white">
            {draftPreview.fullName || "Nombre del colaborador"}
          </h3>
          <p className="mt-1 break-words text-sm text-cyan-200">
            {draftPreview.position || "Cargo"}
          </p>
          {!founder ? (
            <p className="mt-2 break-words text-sm text-slate-300">
              {draftPreview.specialty || "Especialidad"}
            </p>
          ) : null}
          <p className="mt-3 whitespace-pre-line break-words text-sm leading-6 text-slate-400">
            {draftPreview.bio || "La presentación aparecerá aquí."}
          </p>
          {draftPreview.isFeatured ? (
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-cyan-300">
              Colaborador destacado
            </p>
          ) : null}
          {linkedinPreview || websitePreview ? (
            <nav
              aria-label="Vista previa de enlaces profesionales"
              className="mt-3 flex flex-wrap gap-3 text-xs"
            >
              {linkedinPreview ? (
                <a
                  href={linkedinPreview}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-300 underline underline-offset-2"
                >
                  LinkedIn
                </a>
              ) : null}
              {websitePreview ? (
                <a
                  href={websitePreview}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-300 underline underline-offset-2"
                >
                  Sitio web
                </a>
              ) : null}
            </nav>
          ) : null}
        </div>
        <p className="text-xs leading-5 text-slate-500">
          Para publicar se requiere nombre, cargo, biografía, fotografía real y
          {founder ? " una presentación completa." : " especialidad."}
        </p>
      </aside>
      <div className="space-y-3 xl:col-span-2">
        <ResultMessage state={state} />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-cyan-400 px-5 text-sm font-semibold text-slate-950 hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Guardando…" : founder ? "Guardar perfil del fundador" : "Guardar colaborador"}
        </button>
      </div>
    </form>
  );
}

function safePreviewUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function DeleteMemberButton({ member }: { member: TeamMember }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<TeamActionState, FormData>(
    deleteTeamMemberAction,
    {},
  );

  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state]);

  return (
    <div className="space-y-2">
      <form
        action={action}
        onSubmit={(event) => {
          if (
            !window.confirm(
              `¿Eliminar el perfil de ${member.full_name || "este colaborador"} y su fotografía? Esta acción no se puede deshacer.`,
            )
          ) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="member_id" value={member.id} />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-rose-400/30 px-3 text-sm font-medium text-rose-200 hover:bg-rose-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:opacity-50"
        >
          {pending ? "Eliminando…" : "Eliminar colaborador"}
        </button>
      </form>
      <ResultMessage state={state} />
    </div>
  );
}

export default function TeamManager({ members }: { members: TeamMember[] }) {
  const router = useRouter();
  const [createVersion, setCreateVersion] = useState(0);
  const founder = members.find((member) => member.member_type === "FOUNDER");
  const collaborators = members.filter(
    (member) => member.member_type === "COLLABORATOR",
  );

  const onSaved = useCallback(
    (created: boolean) => {
      if (created) setCreateVersion((version) => version + 1);
      router.refresh();
    },
    [router],
  );

  return (
    <div className="space-y-9">
      <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.04] p-5 sm:p-6">
        <h2 className="text-xl font-semibold text-white">Perfil del fundador</h2>
        <p className="mb-5 mt-1 text-sm leading-6 text-slate-400">
          El nombre y cargo identifican la marca y no se pueden cambiar aquí.
          Actualiza la presentación y carga una fotografía real antes de
          publicarlo.
        </p>
        {founder ? (
          <TeamMemberForm
            key={`${founder.id}-${founder.updated_at}`}
            member={founder}
            founder
            onSaved={onSaved}
          />
        ) : (
          <p className="text-sm text-amber-100" role="alert">
            No existe el registro inicial del fundador. Comprueba que la
            migración de equipo esté aplicada.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        <h2 className="text-xl font-semibold text-white">Añadir colaborador</h2>
        <p className="mb-5 mt-1 text-sm leading-6 text-slate-400">
          Guarda un borrador mientras recopilas los datos reales. El perfil solo
          se publicará cuando esté completo y tenga una fotografía.
        </p>
        <TeamMemberForm
          key={`new-collaborator-${createVersion}`}
          onSaved={onSaved}
        />
      </section>

      <section aria-labelledby="team-existing">
        <header className="mb-5">
          <h2 id="team-existing" className="text-xl font-semibold text-white">
            Colaboradores registrados
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {collaborators.length} colaborador(es). El orden y el estado se
            guardan en cada perfil.
          </p>
        </header>
        {collaborators.length === 0 ? (
          <p
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-slate-400"
            role="status"
          >
            No hay colaboradores registrados. Añade perfiles cuando tengas sus
            datos reales; no se mostrarán colaboradores de ejemplo.
          </p>
        ) : (
          <div className="space-y-5">
            {collaborators.map((member) => (
              <article
                key={`${member.id}-${member.updated_at}`}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
              >
                <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-slate-950">
                      {member.avatar_url ? (
                        <Image
                          src={member.avatar_url}
                          alt=""
                          fill
                          unoptimized
                          sizes="80px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-slate-500">
                          Sin foto
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words font-semibold text-white">
                          {member.full_name || "Borrador sin nombre"}
                        </h3>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            member.is_active
                              ? "bg-emerald-400/10 text-emerald-200"
                              : "bg-slate-400/10 text-slate-300"
                          }`}
                        >
                          {member.is_active ? "Publicado" : "Borrador"}
                        </span>
                        {member.is_featured ? (
                          <span className="rounded-full bg-cyan-400/10 px-2.5 py-1 text-xs font-medium text-cyan-100">
                            Destacado
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 break-words text-sm text-slate-400">
                        {member.position || "Cargo pendiente"} · Orden{" "}
                        {member.display_order}
                      </p>
                    </div>
                  </div>
                  <DeleteMemberButton member={member} />
                </header>
                <details>
                  <summary className="cursor-pointer border-t border-white/10 pt-4 text-sm font-medium text-cyan-300 outline-none hover:text-cyan-200 focus-visible:ring-2 focus-visible:ring-cyan-300">
                    Editar perfil y vista previa
                  </summary>
                  <div className="mt-5">
                    <TeamMemberForm
                      key={`${member.id}-${member.updated_at}`}
                      member={member}
                      onSaved={onSaved}
                    />
                  </div>
                </details>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
