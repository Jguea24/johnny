import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import AdminDataManager, {
  type AdminRecord,
} from "@/components/admin/AdminDataManager";
import { requireAdmin } from "@/lib/auth/identity";
import { isMissingServiceKindColumn } from "@/lib/service-kind";
import { publicSiteSettingKeys } from "@/lib/site-settings";
import type { Database } from "@/types/database";

const sectionMeta = {
  usuarios: {
    title: "Usuarios",
    description: "Consulta cuentas y actualiza solo los campos de perfil autorizados.",
  },
  servicios: {
    title: "Servicios",
    description: "Crea, edita, publica o elimina servicios del catálogo.",
  },
  "servicios-digitales": {
    title: "Servicios digitales",
    description: "Crea, edita, publica o elimina las ofertas de servicios digitales.",
  },
  proyectos: {
    title: "Proyectos",
    description: "Gestiona la información y publicación de proyectos.",
  },
  categorias: {
    title: "Categorías",
    description: "Organiza los catálogos de servicios y proyectos.",
  },
  solicitudes: {
    title: "Solicitudes",
    description: "Revisa, actualiza el estado o elimina solicitudes no deseadas.",
  },
  mensajes: {
    title: "Mensajes de contacto",
    description: "Lee mensajes privados y actualiza su estado.",
  },
  testimonios: {
    title: "Testimonios",
    description: "Gestiona testimonios y su estado de publicación.",
  },
  configuracion: {
    title: "Configuración pública",
    description: "Edita únicamente valores públicos permitidos; no almacenes secretos.",
  },
} as const;

type Section = keyof typeof sectionMeta;
type PageProps = { params: Promise<{ section: string }> };
type ServiceAdminRow = Pick<
  Database["public"]["Tables"]["services"]["Row"],
  | "id"
  | "title"
  | "slug"
  | "short_description"
  | "description"
  | "category_id"
  | "icon"
  | "image_url"
  | "price"
  | "status"
  | "sort_order"
> & Partial<Pick<Database["public"]["Tables"]["services"]["Row"], "service_kind" | "tax_base0" | "tax_baseimp" | "tax_iva">>;

function text(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function createRecord(
  id: string,
  title: string,
  details: string,
  fields: Record<string, string | boolean | null>,
): AdminRecord {
  return { id, title, details, fields };
}

async function loadSection(section: Section): Promise<{
  records: AdminRecord[];
  categories: { value: string; label: string }[];
}> {
  const { supabase } = await requireAdmin();
  let records: AdminRecord[] = [];
  let categories: { value: string; label: string }[] = [];

  if (section === "usuarios") {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,full_name,email,phone,avatar_url,role,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(`ADMIN_QUERY:profiles:${error.code}`);
    records = (data ?? []).map((row) =>
      createRecord(
        row.id,
        row.full_name || row.email,
        `Correo: ${row.email} · Rol: ${row.role} · Alta: ${new Date(row.created_at).toLocaleDateString("es")}`,
        {
          full_name: row.full_name,
          phone: row.phone,
          avatar_url: row.avatar_url,
        },
      ),
    );
  } else if (section === "servicios" || section === "servicios-digitales") {
    const serviceKind = section === "servicios-digitales" ? "DIGITAL" : "TECHNOLOGICAL";
    const servicesQuery = serviceKind === "DIGITAL"
      ? supabase
          .from("services")
          .select("id,title,slug,short_description,description,category_id,icon,image_url,price,status,sort_order,service_kind,tax_base0,tax_baseimp,tax_iva")
          .eq("service_kind", serviceKind)
          .order("sort_order", { ascending: true })
          .limit(200)
      : supabase
          .from("services")
          .select("id,title,slug,short_description,description,category_id,icon,image_url,price,status,sort_order,service_kind")
          .eq("service_kind", serviceKind)
          .order("sort_order", { ascending: true })
          .limit(200);
    const [servicesResult, categoriesResult] = await Promise.all([
      servicesQuery,
      supabase.from("categories").select("id,name,type").eq("type", "SERVICE"),
    ]);
    let serviceRows: ServiceAdminRow[] = servicesResult.data ?? [];
    if (servicesResult.error) {
      const errorText = `${servicesResult.error.message ?? ""} ${servicesResult.error.details ?? ""}`.toLowerCase();
      if (serviceKind === "DIGITAL" && (errorText.includes("tax_base0") || errorText.includes("tax_baseimp") || errorText.includes("tax_iva"))) {
        throw new Error("ADMIN_SCHEMA:datafast_tax_fields_missing");
      }
      if (!isMissingServiceKindColumn(servicesResult.error)) {
        throw new Error(`ADMIN_QUERY:services:${servicesResult.error.code}`);
      }
      if (serviceKind === "DIGITAL") {
        throw new Error("ADMIN_SCHEMA:service_kind_missing");
      }
      const legacyServicesResult = await supabase
        .from("services")
        .select("id,title,slug,short_description,description,category_id,icon,image_url,price,status,sort_order")
        .order("sort_order", { ascending: true })
        .limit(200);
      if (legacyServicesResult.error) {
        throw new Error(`ADMIN_QUERY:services:${legacyServicesResult.error.code}`);
      }
      serviceRows = legacyServicesResult.data ?? [];
    }
    if (categoriesResult.error) throw new Error(`ADMIN_QUERY:service_categories:${categoriesResult.error.code}`);
    categories = (categoriesResult.data ?? []).map((item) => ({
      value: item.id,
      label: item.name,
    }));
    records = serviceRows.map((row) =>
      createRecord(
        row.id,
        row.title,
        `${row.status} · ${row.slug} · ${row.short_description}`,
        {
          title: row.title,
          slug: row.slug,
          short_description: row.short_description,
          description: row.description,
          category_id: row.category_id,
          icon: row.icon,
          image_url: row.image_url,
          price: row.price === null ? "" : text(row.price),
          tax_base0: text(row.tax_base0 ?? 0),
          tax_baseimp: text(row.tax_baseimp ?? 0),
          tax_iva: text(row.tax_iva ?? 0),
          status: row.status,
          sort_order: text(row.sort_order),
        },
      ),
    );
  } else if (section === "proyectos") {
    const [projectsResult, categoriesResult] = await Promise.all([
      supabase
        .from("projects")
        .select("id,title,slug,short_description,description,category_id,main_image,demo_url,repository_url,technologies,status,featured,created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("categories")
        .select("id,name,type")
        .order("name", { ascending: true }),
    ]);
    if (projectsResult.error) throw new Error(`ADMIN_QUERY:projects:${projectsResult.error.code}`);
    if (categoriesResult.error) throw new Error(`ADMIN_QUERY:project_categories:${categoriesResult.error.code}`);
    categories = (categoriesResult.data ?? []).map((item) => ({
      value: item.id,
      label: item.name,
    }));
    records = (projectsResult.data ?? []).map((row) =>
      createRecord(
        row.id,
        row.title,
        `${row.status}${row.featured ? " · Destacado" : ""} · ${row.slug} · ${row.short_description}`,
        {
          title: row.title,
          slug: row.slug,
          short_description: row.short_description,
          description: row.description,
          category_id: row.category_id,
          main_image: row.main_image,
          demo_url: row.demo_url,
          repository_url: row.repository_url,
          technologies: row.technologies.join("\n"),
          status: row.status,
          featured: row.featured,
        },
      ),
    );
  } else if (section === "categorias") {
    const { data, error } = await supabase
      .from("categories")
      .select("id,name,slug,description,type,created_at")
      .order("type", { ascending: true })
      .order("name", { ascending: true })
      .limit(200);
    if (error) throw new Error(`ADMIN_QUERY:categories:${error.code}`);
    records = (data ?? []).map((row) =>
      createRecord(row.id, row.name, `${row.type} · ${row.slug}`, {
        name: row.name,
        slug: row.slug,
        description: row.description,
        type: row.type,
      }),
    );
  } else if (section === "solicitudes") {
    const { data, error } = await supabase
      .from("service_requests")
      .select("id,name,email,phone,company,description,budget,status,priority,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(`ADMIN_QUERY:service_requests:${error.code}`);
    records = (data ?? []).map((row) =>
      createRecord(
        row.id,
        row.name,
        `${row.email}${row.phone ? ` · ${row.phone}` : ""}${row.company ? ` · ${row.company}` : ""} · ${new Date(row.created_at).toLocaleDateString("es")}\n${row.description}`,
        { status: row.status },
      ),
    );
  } else if (section === "mensajes") {
    const { data, error } = await supabase
      .from("contact_messages")
      .select("id,name,email,phone,subject,message,status,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(`ADMIN_QUERY:contact_messages:${error.code}`);
    records = (data ?? []).map((row) =>
      createRecord(
        row.id,
        row.subject,
        `${row.name} · ${row.email}${row.phone ? ` · ${row.phone}` : ""} · ${new Date(row.created_at).toLocaleDateString("es")}\n${row.message}`,
        { status: row.status },
      ),
    );
  } else if (section === "testimonios") {
    const { data, error } = await supabase
      .from("testimonials")
      .select("id,name,position,company,comment,photo_url,rating,status,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(`ADMIN_QUERY:testimonials:${error.code}`);
    records = (data ?? []).map((row) =>
      createRecord(
        row.id,
        `${row.name} · ${row.status}`,
        `${[row.position, row.company].filter(Boolean).join(" · ")} · ${row.rating}/5\n${row.comment}`,
        {
          name: row.name,
          position: row.position,
          company: row.company,
          comment: row.comment,
          photo_url: row.photo_url,
          rating: text(row.rating),
          status: row.status,
        },
      ),
    );
  } else {
    const { data, error } = await supabase
      .from("site_settings")
      .select("key,value")
      .in("key", [...publicSiteSettingKeys])
      .order("key", { ascending: true })
      .limit(200);
    if (error) throw new Error(`ADMIN_QUERY:site_settings:${error.code}`);
    records = (data ?? []).map((row) => {
      const settingValue =
        typeof row.value === "string" ? row.value : JSON.stringify(row.value);
      return createRecord(row.key, row.key, settingValue, {
        key: row.key,
        value: settingValue,
      });
    });
  }

  return { records, categories };
}

async function AdminSectionContent({ params }: PageProps) {
  const { section: sectionParam } = await params;
  if (!Object.prototype.hasOwnProperty.call(sectionMeta, sectionParam)) {
    notFound();
  }
  const section = sectionParam as Section;
  let loaded: Awaited<ReturnType<typeof loadSection>>;
  try {
    loaded = await loadSection(section);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "UnknownError";
    const categoryQueryError = errorMessage.match(/^ADMIN_QUERY:project_categories:([A-Z0-9]+)$/);
    const digitalSchemaPending = errorMessage === "ADMIN_SCHEMA:service_kind_missing";
    const datafastSchemaPending = errorMessage === "ADMIN_SCHEMA:datafast_tax_fields_missing";
    console.error(
      categoryQueryError
        ? `Unable to load project categories. Supabase code: ${categoryQueryError[1]}`
        : `Unable to load admin section ${section}. Error type: ${error instanceof Error ? error.name : "UnknownError"}`,
    );
    return (
      <main>
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">
            Administración
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{sectionMeta[section].title}</h1>
        </header>
        <p
          className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-5 text-sm leading-6 text-rose-200"
          role="alert"
        >
          {digitalSchemaPending
            ? "La sección digital estará disponible cuando se aplique la migración de servicios digitales en Supabase."
            : datafastSchemaPending
              ? "Aplica la migración de Datafast en Supabase para gestionar servicios digitales con cobro."
            : "No fue posible cargar esta sección. Comprueba la política RLS administrativa de su tabla y vuelve a intentarlo."}
        </p>
      </main>
    );
  }
  const { records, categories } = loaded;

  return (
    <main>
      <header className="mb-8">
        <p className="section-eyebrow">
          Administración
        </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {sectionMeta[section].title}
        </h1>
        <p className="mt-3 text-slate-400">
          {sectionMeta[section].description}
        </p>
      </header>
      <AdminDataManager
        section={section}
        records={records}
        categories={categories}
      />
    </main>
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { section } = await params;
  if (!Object.prototype.hasOwnProperty.call(sectionMeta, section)) {
    return { title: "Administración" };
  }
  return {
    title: sectionMeta[section as Section].title,
  };
}

export default function AdminSectionPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="space-y-5 py-4" aria-busy="true" aria-label="Cargando registros administrativos">
          <div className="h-24 max-w-xl animate-pulse rounded-2xl bg-white/[0.04] motion-reduce:animate-none" />
          <div className="h-16 animate-pulse rounded-xl bg-white/[0.03] motion-reduce:animate-none" />
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="surface-card h-40 animate-pulse bg-white/[0.025] motion-reduce:animate-none" />
          ))}
        </div>
      }
    >
      <AdminSectionContent params={params} />
    </Suspense>
  );
}
