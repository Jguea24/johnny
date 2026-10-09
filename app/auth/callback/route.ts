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
  const code = requestUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/login?error=callback", requestUrl));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    if (isAuthRetryableFetchError(error)) {
      return NextResponse.redirect(new URL("/login?error=connection", requestUrl));
    }
    return NextResponse.redirect(new URL("/login?error=callback", requestUrl));
  }

  if (requestUrl.searchParams.get("flow") === "reset") {
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims();
    if (
      isAuthRetryableFetchError(claimsError)
    ) {
      return NextResponse.redirect(new URL("/login?error=connection", requestUrl));
    }
    if (claimsError || typeof claimsData?.claims?.sub !== "string") {
      return NextResponse.redirect(new URL("/login?error=callback", requestUrl));
    }
    return NextResponse.redirect(
      new URL("/recuperar-contrasena?actualizar=1", requestUrl),
    );
  }

  const identity = await getAuthenticatedProfileRole(supabase);
  if (
    identity.status === "unauthenticated" ||
    identity.status === "claims-error"
  ) {
    return NextResponse.redirect(new URL("/login?error=session", requestUrl));
  }
  if (identity.status === "connection-error") {
    return NextResponse.redirect(new URL("/login?error=connection", requestUrl));
  }
  if (identity.status !== "authenticated") {
    return NextResponse.redirect(new URL("/login?error=role", requestUrl));
  }

  return NextResponse.redirect(
    new URL(
      getAuthenticatedDestination(
        identity.role,
        getSafeNextPath(requestUrl.searchParams.get("next")),
      ),
      requestUrl,
    ),
  );
}
