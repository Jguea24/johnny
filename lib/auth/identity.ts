import "server-only";

import {
  isAuthRetryableFetchError,
  isAuthSessionMissingError,
} from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ProfileRoleResult =
  | { status: "authenticated"; userId: string; role: "ADMIN" | "USER" }
  | { status: "unauthenticated" }
  | { status: "claims-error" }
  | { status: "connection-error" }
  | { status: "profile-missing" }
  | { status: "profile-error" };

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

function hasNoSession(error: unknown): boolean {
  return error === null || isAuthSessionMissingError(error);
}

function isProfileConnectionError(error: {
  code: string;
  message: string;
}): boolean {
  return (
    error.code === "" &&
    /^(?:FetchError|TypeError|AbortError):/.test(error.message)
  );
}

export async function getAuthenticatedProfileRole(
  client?: ServerSupabaseClient,
): Promise<ProfileRoleResult> {
  const supabase = client ?? (await createClient());
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (typeof userId !== "string") {
    if (hasNoSession(claimsError)) {
      return { status: "unauthenticated" };
    }
    if (isAuthRetryableFetchError(claimsError)) {
      return { status: "connection-error" };
    }
    return { status: "claims-error" };
  }
  if (claimsError) {
    if (isAuthRetryableFetchError(claimsError)) {
      return { status: "connection-error" };
    }
    return { status: "claims-error" };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    if (isProfileConnectionError(error)) {
      return { status: "connection-error" };
    }
    return { status: "profile-error" };
  }
  if (!profile) {
    return { status: "profile-missing" };
  }
  if (profile.role !== "ADMIN" && profile.role !== "USER") {
    return { status: "profile-error" };
  }

  return { status: "authenticated", userId, role: profile.role };
}

export async function getAuthenticatedUserId(): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (error || typeof id !== "string") {
    redirect("/login");
  }
  return id;
}

export async function requireAdmin() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (typeof userId !== "string") {
    if (hasNoSession(claimsError)) {
      redirect("/login?next=%2Fadmin&error=auth-required");
    }
    if (isAuthRetryableFetchError(claimsError)) {
      console.error("Supabase Auth connection failed while verifying claims.");
      throw new Error("Unable to connect to Supabase Auth.");
    }
    console.error(
      `Unable to verify authentication claims. Supabase code: ${claimsError?.code ?? claimsError?.name ?? "UNKNOWN"}`,
    );
    throw new Error("Unable to verify authentication claims.");
  }
  if (claimsError) {
    if (isAuthRetryableFetchError(claimsError)) {
      console.error("Supabase Auth connection failed while verifying claims.");
      throw new Error("Unable to connect to Supabase Auth.");
    }
    console.error(
      `Unable to verify authentication claims. Supabase code: ${claimsError.code ?? claimsError.name}`,
    );
    throw new Error("Unable to verify authentication claims.");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id,full_name,email,role")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    if (isProfileConnectionError(error)) {
      console.error("Supabase connection failed while loading administrator profile.");
      throw new Error("Unable to connect to Supabase.");
    }
    console.error(
      `Unable to load administrator profile. Supabase code: ${error.code}`,
    );
    throw new Error("Unable to load administrator profile.");
  }
  if (!profile) {
    redirect("/login?error=profile");
  }
  if (profile.role === "USER") {
    redirect("/perfil?error=forbidden");
  }
  if (profile.role !== "ADMIN") {
    throw new Error("Unable to verify administrator profile role.");
  }
  return { supabase, profile };
}
