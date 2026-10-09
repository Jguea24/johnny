export type AuthenticatedRole = "ADMIN" | "USER";

export function getSafeNextPath(value: unknown): string | null {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return null;
  }

  try {
    const base = "https://johnny.invalid";
    const destination = new URL(value, base);
    if (destination.origin !== base) return null;

    const path = destination.pathname.toLowerCase();
    if (
      path === "/login" ||
      path.startsWith("/login/") ||
      path === "/registro" ||
      path.startsWith("/registro/") ||
      path === "/auth/callback" ||
      path.startsWith("/auth/callback/")
    ) {
      return null;
    }

    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return null;
  }
}

export function getAuthenticatedDestination(
  role: AuthenticatedRole,
  nextPath: unknown,
): string {
  const safeNextPath = getSafeNextPath(nextPath);
  if (safeNextPath) {
    const path = new URL(safeNextPath, "https://johnny.invalid").pathname.toLowerCase();
    if (role === "ADMIN" || (path !== "/admin" && !path.startsWith("/admin/"))) {
      return safeNextPath;
    }
  }
  return role === "ADMIN" ? "/admin" : "/perfil";
}
