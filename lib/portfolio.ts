import "server-only";

import { io } from "next/cache";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type ServiceRow = Database["public"]["Tables"]["services"]["Row"];
type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type ProjectImageRow = Database["public"]["Tables"]["project_images"]["Row"];
type TestimonialRow = Database["public"]["Tables"]["testimonials"]["Row"];
type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

export type PublicService = Pick<
  ServiceRow,
  | "id"
  | "title"
  | "slug"
  | "short_description"
  | "description"
  | "icon"
  | "image_url"
  | "price"
  | "category_id"
>;

type PublicProjectFields = Pick<
  ProjectRow,
  | "id"
  | "title"
  | "slug"
  | "short_description"
  | "description"
  | "main_image"
  | "demo_url"
  | "repository_url"
  | "technologies"
  | "category_id"
  | "featured"
  | "created_at"
>;

type PublicProjectImage = Pick<
  ProjectImageRow,
  "id" | "image_url" | "alt_text" | "sort_order"
>;

export type PublicProject = PublicProjectFields & {
  images: PublicProjectImage[];
};

export type PublicTestimonial = Pick<
  TestimonialRow,
  "id" | "name" | "position" | "company" | "comment" | "photo_url"
>;

export type PublicCategory = Pick<CategoryRow, "id" | "name" | "type">;

export type PublicListing<T> =
  | { status: "ready"; data: T[] }
  | { status: "error" | "unconfigured"; data: [] };

export type PublicRecord<T> =
  | { status: "ready"; data: T }
  | { status: "not-found" | "error" | "unconfigured"; data: null };

function emptyListing<T>(
  status: "error" | "unconfigured",
): PublicListing<T> {
  return { status, data: [] };
}

function emptyRecord<T>(
  status: "not-found" | "error" | "unconfigured",
): PublicRecord<T> {
  return { status, data: null };
}

function logReadError(
  label: string,
  error: { code?: string; status?: number; name?: string; message?: string },
) {
  const message = error.message?.toLowerCase() ?? "";
  const messageType = message.includes("fetch failed")
    ? "fetch-failed"
    : message.includes("prerender") || message.includes("dynamic")
      ? "render-control"
      : message
        ? "other"
        : "empty";
  console.error(
    `Unable to load public ${label}. Supabase code: ${error.code || "unknown"}; status: ${error.status ?? "unknown"}; fields: ${Object.keys(error).sort().join(",") || "none"}; message type: ${messageType}`,
  );
}

async function loadListing<T>(
  query: PromiseLike<{ data: T[] | null; error: { code?: string } | null }>,
  label: string,
): Promise<PublicListing<T>> {
  const { data, error } = await query;
  if (error) {
    logReadError(label, error);
    return emptyListing("error");
  }
  return { status: "ready", data: data ?? [] };
}

async function loadRecord<T>(
  query: PromiseLike<{ data: T | null; error: { code?: string } | null }>,
  label: string,
): Promise<PublicRecord<T>> {
  const { data, error } = await query;
  if (error) {
    logReadError(label, error);
    return emptyRecord("error");
  }
  return data ? { status: "ready", data } : emptyRecord("not-found");
}

async function loadCategories(
  query: PromiseLike<{
    data: PublicCategory[] | null;
    error: { code?: string } | null;
  }>,
): Promise<PublicCategory[]> {
  const { data, error } = await query;
  if (error) {
    logReadError("categories", error);
    return [];
  }
  return data ?? [];
}

export async function getPublicCategories(
  type?: PublicCategory["type"],
): Promise<PublicCategory[]> {
  if (!getSupabaseConfig()) return [];
  await io();
  const supabase = await createClient();
  const query = supabase.from("categories").select("id,name,type");
  return loadCategories(type ? query.eq("type", type) : query);
}

export async function getPublicServices(): Promise<
  PublicListing<PublicService>
> {
  if (!getSupabaseConfig()) return emptyListing("unconfigured");
  await io();
  const supabase = await createClient();
  return loadListing(
    supabase
      .from("services")
      .select(
        "id,title,slug,short_description,description,icon,image_url,price,category_id",
      )
      .eq("status", "ACTIVE")
      .order("sort_order", { ascending: true }),
    "services",
  );
}

export async function getPublicService(
  slug: string,
): Promise<PublicRecord<PublicService>> {
  if (!getSupabaseConfig()) return emptyRecord("unconfigured");
  await io();
  const supabase = await createClient();
  return loadRecord(
    supabase
      .from("services")
      .select(
        "id,title,slug,short_description,description,icon,image_url,price,category_id",
      )
      .eq("status", "ACTIVE")
      .eq("slug", slug)
      .maybeSingle(),
    "service detail",
  );
}

export async function getPublicProjects(): Promise<
  PublicListing<PublicProject>
> {
  if (!getSupabaseConfig()) return emptyListing("unconfigured");
  await io();
  const supabase = await createClient();
  const projectsResult = await loadListing<PublicProjectFields>(
    supabase
      .from("projects")
      .select(
        "id,title,slug,short_description,description,main_image,demo_url,repository_url,technologies,category_id,featured,created_at",
      )
      .eq("status", "PUBLISHED")
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false }),
    "projects",
  );
  if (projectsResult.status !== "ready") return projectsResult;
  if (projectsResult.data.length === 0) return { status: "ready", data: [] };

  const imagesResult = await loadListing<
    PublicProjectImage & { project_id: string }
  >(
      supabase
        .from("project_images")
        .select("id,project_id,image_url,alt_text,sort_order")
        .in(
          "project_id",
          projectsResult.data.map((project) => project.id),
        )
        .order("sort_order", { ascending: true }),
      "project images",
  );
  if (imagesResult.status !== "ready") {
    return {
      status: "ready",
      data: projectsResult.data.map((project) => ({ ...project, images: [] })),
    };
  }
  const imagesByProject = new Map<string, PublicProjectImage[]>();
  for (const image of imagesResult.data) {
    const projectImages = imagesByProject.get(image.project_id) ?? [];
    projectImages.push({
      id: image.id,
      image_url: image.image_url,
      alt_text: image.alt_text,
      sort_order: image.sort_order,
    });
    imagesByProject.set(image.project_id, projectImages);
  }
  return {
    status: "ready",
    data: projectsResult.data.map((project) => ({
      ...project,
      images: imagesByProject.get(project.id) ?? [],
    })),
  };
}

export async function getPublicProject(
  slug: string,
): Promise<PublicRecord<PublicProject>> {
  if (!getSupabaseConfig()) return emptyRecord("unconfigured");
  await io();
  const supabase = await createClient();
  const projectResult = await loadRecord<PublicProjectFields>(
    supabase
      .from("projects")
      .select(
        "id,title,slug,short_description,description,main_image,demo_url,repository_url,technologies,category_id,featured,created_at",
      )
      .eq("status", "PUBLISHED")
      .eq("slug", slug)
      .maybeSingle(),
    "project detail",
  );
  if (projectResult.status !== "ready") return projectResult;

  const project = projectResult.data;
  if (!project) return emptyRecord("not-found");
  const imagesResult = await loadListing<PublicProjectImage>(
    supabase
      .from("project_images")
      .select("id,image_url,alt_text,sort_order")
      .eq("project_id", project.id)
      .order("sort_order", { ascending: true }),
    "project images",
  );
  return {
    status: "ready",
    data: {
      ...project,
      images: imagesResult.status === "ready" ? imagesResult.data : [],
    },
  };
}

export async function getPublicTestimonials(): Promise<
  PublicListing<PublicTestimonial>
> {
  if (!getSupabaseConfig()) return emptyListing("unconfigured");
  await io();
  const supabase = await createClient();
  return loadListing(
    supabase
      .from("testimonials")
      .select("id,name,position,company,comment,photo_url")
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: false }),
    "testimonials",
  );
}
