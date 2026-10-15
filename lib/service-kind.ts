export function isMissingServiceKindColumn(error: {
  code?: string;
  message?: string;
}): boolean {
  const message = error.message?.toLowerCase() ?? "";
  const isColumnError =
    error.code === "42703" ||
    error.code === "PGRST204" ||
    error.code === "PGRST100";
  return isColumnError && message.includes("service_kind");
}
