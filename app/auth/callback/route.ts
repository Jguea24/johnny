import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getSafeNextPath(value: string | null): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return "/perfil";
  }
  return value;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/login?error=callback", requestUrl));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?error=callback", requestUrl));
  }

  if (requestUrl.searchParams.get("flow") === "reset") {
    return NextResponse.redirect(
      new URL("/recuperar-contrasena?actualizar=1", requestUrl),
    );
  }

  return NextResponse.redirect(
    new URL(getSafeNextPath(requestUrl.searchParams.get("next")), requestUrl),
  );
}
