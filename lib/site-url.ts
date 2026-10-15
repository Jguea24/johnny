import "server-only";

export function getConfiguredSiteUrl(): URL | null {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const value =
    configuredUrl ||
    (process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "");
  if (!value) return null;

  try {
    const url = new URL(value);
    const isLocalDevelopment =
      process.env.NODE_ENV === "development" &&
      url.protocol === "http:" &&
      url.hostname === "localhost";
    const isSecureProductionUrl = url.protocol === "https:";

    if (
      (!isLocalDevelopment && !isSecureProductionUrl) ||
      !url.hostname ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}
