import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedProfileRole } from "@/lib/auth/identity";
import {
  getAuthenticatedDestination,
  getSafeNextPath,
} from "@/lib/auth/redirects";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const rawType = requestUrl.searchParams.get("type");
  const type = rawType === "signup" || rawType === "email" ? rawType : null;

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL("/login?error=confirmation", requestUrl));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });
  if (error) {
    console.error(
      `Supabase email confirmation failed. Code: ${error.code ?? "UNKNOWN"}; status: ${error.status}.`,
    );
    return NextResponse.redirect(
      new URL(
        isAuthRetryableFetchError(error)
          ? "/login?error=connection"
          : "/login?error=confirmation",
        requestUrl,
      ),
    );
  }
  if (!data.session) {
    return NextResponse.redirect(new URL("/login?error=session", requestUrl));
  }

  const identity = await getAuthenticatedProfileRole(supabase);
  if (identity.status === "connection-error") {
    return NextResponse.redirect(new URL("/login?error=connection", requestUrl));
  }
  if (identity.status !== "authenticated") {
    return NextResponse.redirect(new URL("/login?error=profile", requestUrl));
  }

  const destination = getAuthenticatedDestination(
    identity.role,
    getSafeNextPath(requestUrl.searchParams.get("next")),
  );
  return NextResponse.redirect(new URL(destination, requestUrl));
}
