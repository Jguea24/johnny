import "server-only";

import { io } from "next/cache";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type TeamMemberRow = Database["public"]["Tables"]["team_members"]["Row"];

export type PublicTeamMember = Pick<
  TeamMemberRow,
  | "id"
  | "member_type"
  | "full_name"
  | "slug"
  | "position"
  | "specialty"
  | "bio"
  | "avatar_url"
  | "linkedin_url"
  | "website_url"
  | "display_order"
  | "is_featured"
>;

export type PublicTeamResult =
  | { status: "ready"; founder: PublicTeamMember | null; collaborators: PublicTeamMember[] }
  | {
      status: "error";
      errorKind: TeamLoadErrorKind;
      founder: null;
      collaborators: [];
    }
  | { status: "unconfigured"; founder: null; collaborators: [] };

export type TeamLoadErrorKind =
  | "table-not-found"
  | "schema-mismatch"
  | "permissions"
  | "connection"
  | "unknown";

type SupabaseQueryError = {
  code?: string;
  status?: number;
};

function classifyQueryError(error: SupabaseQueryError): TeamLoadErrorKind {
  switch (error.code) {
    case "42P01":
    case "PGRST205":
      return "table-not-found";
    case "42703":
    case "PGRST204":
    case "PGRST106":
      return "schema-mismatch";
    case "42501":
    case "PGRST301":
    case "PGRST302":
    case "PGRST303":
      return "permissions";
    default:
      if (
        error.code?.startsWith("08") ||
        error.code?.startsWith("53") ||
        (error.code !== undefined &&
          ["PGRST000", "PGRST001", "PGRST002", "PGRST003"].includes(error.code)) ||
        (error.status !== undefined && error.status >= 500)
      ) {
        return "connection";
      }
      if (error.status === 401 || error.status === 403) {
        return "permissions";
      }
      return "unknown";
  }
}

function classifyThrownError(error: unknown): TeamLoadErrorKind {
  if (!(error instanceof Error)) return "unknown";
  if (
    error.name === "TypeError" ||
    error.name === "AbortError" ||
    error.name === "TimeoutError"
  ) {
    return "connection";
  }
  return "unknown";
}

function logTeamLoadFailure(
  errorKind: TeamLoadErrorKind,
  code?: string,
): void {
  const safeCode = code && /^[A-Z0-9]{4,10}$/i.test(code) ? code : "NO_CODE";
  console.error(
    `[team] Public team query failed: ${errorKind} (Supabase code: ${safeCode}).`,
  );
}

export async function getPublicTeam(): Promise<PublicTeamResult> {
  if (!getSupabaseConfig()) {
    return { status: "unconfigured", founder: null, collaborators: [] };
  }

  await io();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("team_members")
      .select(
        "id,member_type,full_name,slug,position,specialty,bio,avatar_url,linkedin_url,website_url,display_order,is_featured",
      )
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      const errorKind = classifyQueryError(error);
      logTeamLoadFailure(errorKind, error.code);
      return { status: "error", errorKind, founder: null, collaborators: [] };
    }

    const completeProfiles = (data ?? []).filter(
      (member) =>
        member.avatar_url &&
        member.full_name.trim().length >= 2 &&
        member.position.trim().length >= 2 &&
        member.bio.trim().length >= 10 &&
        (member.member_type === "FOUNDER" ||
          member.specialty.trim().length >= 2),
    );
    const founder =
      completeProfiles.find((member) => member.member_type === "FOUNDER") ?? null;
    const collaborators = completeProfiles
      .filter((member) => member.member_type === "COLLABORATOR")
      .sort(
        (a, b) =>
          Number(b.is_featured) - Number(a.is_featured) ||
          a.display_order - b.display_order,
      );

    return { status: "ready", founder, collaborators };
  } catch (error) {
    const errorKind = classifyThrownError(error);
    logTeamLoadFailure(errorKind);
    return { status: "error", errorKind, founder: null, collaborators: [] };
  }
}
