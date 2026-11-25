import "server-only";

type ContactSubmission = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

const DEFAULT_CONTACT_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxBbdafK5SbP4CVbeNFpPoU_ZeLjrIMmy3HMdqsJ3vcHAG-UOkXImvk5TFYzkIjaQ9r/exec";

function isExplicitSuccess(result: unknown): boolean {
  if (typeof result === "string") {
    return /^(ok|success(?:ful(?:ly)?)?)(?:[\s.!:]|$)/i.test(result.trim());
  }
  if (!result || typeof result !== "object" || Array.isArray(result)) return false;

  const response = result as Record<string, unknown>;
  const status = String(response.status ?? response.result ?? "").trim();
  if (
    response.success === false ||
    response.ok === false ||
    (response.error !== undefined && response.error !== null) ||
    /^(error|failed|failure)$/i.test(status)
  ) {
    return false;
  }
  if (response.success === true || response.ok === true) return true;
  return [response.status, response.result].some(
    (status) => typeof status === "string" && /^(ok|success)$/i.test(status.trim()),
  );
}

function describeResponseWithoutContent(result: unknown): string {
  if (typeof result === "string") {
    return `plain-text(length=${result.length}, explicitSuccess=${isExplicitSuccess(result)})`;
  }
  if (result === null) return "json-null";
  if (Array.isArray(result)) return `json-array(length=${result.length})`;
  if (typeof result !== "object") return `json-${typeof result}`;

  const response = result as Record<string, unknown>;
  const keys = ["success", "ok", "status", "result", "error", "message", "code"]
    .filter((key) => key in response)
    .join(",");
  const booleanFlag = (key: "success" | "ok") =>
    typeof response[key] === "boolean" ? String(response[key]) : "absent";
  const status = String(response.status ?? response.result ?? "").toLowerCase();
  const statusClass = ["success", "ok", "error", "failed", "failure"].includes(status)
    ? status
    : status
      ? "other"
      : "absent";
  return `json-object(keys=${keys || "none"}, success=${booleanFlag("success")}, ok=${booleanFlag("ok")}, status=${statusClass})`;
}

function getScriptFailureCode(result: unknown): string {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return "unrecognized-response";
  }
  const response = result as Record<string, unknown>;
  if (response.success !== false && response.ok !== false) return "unrecognized-response";

  if (response.message === "Faltan campos obligatorios") return "missing-required-fields";
  if (response.message === "No existe la hoja Contactos") return "contact-sheet-not-found";
  return "script-rejected";
}

export function getGoogleAppsScriptContactUrl(): string | null {
  const value = process.env.GOOGLE_APPS_SCRIPT_CONTACT_URL?.trim() || DEFAULT_CONTACT_SCRIPT_URL;

  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "script.google.com" ||
      !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export async function submitContactToGoogleAppsScript(
  submission: ContactSubmission,
): Promise<boolean> {
  const endpoint = getGoogleAppsScriptContactUrl();
  if (!endpoint) return false;

  const body = new URLSearchParams({
    nombre: submission.name,
    correo: submission.email,
    telefono: submission.phone,
    asunto: submission.subject,
    mensaje: submission.message,
  });

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body,
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      console.error(`Google Apps Script contact submission failed. HTTP status: ${response.status}.`);
      return false;
    }

    const responseText = (await response.text()).slice(0, 10000).trim();
    if (!responseText) {
      console.error(
        `Google Apps Script contact submission returned an empty response. Content-Type: ${response.headers.get("content-type")?.split(";")[0] ?? "unknown"}.`,
      );
      return false;
    }

    try {
      const result: unknown = JSON.parse(responseText);
      if (isExplicitSuccess(result)) return true;
      console.error(
        `Google Apps Script did not confirm a contact submission. Reason: ${getScriptFailureCode(result)}; response: ${describeResponseWithoutContent(result)}.`,
      );
      return false;
    } catch {
      if (/<html[\s>]/i.test(responseText) && /error|exception|not found/i.test(responseText)) {
        console.error(
          `Google Apps Script returned an error page for a contact submission. Content-Type: ${response.headers.get("content-type")?.split(";")[0] ?? "unknown"}.`,
        );
        return false;
      }
      if (!isExplicitSuccess(responseText)) {
        console.error(
          `Google Apps Script returned an unrecognized contact response. Content-Type: ${response.headers.get("content-type")?.split(";")[0] ?? "unknown"}; ${describeResponseWithoutContent(responseText)}.`,
        );
        return false;
      }
      return true;
    }
  } catch (error) {
    console.error(
      `Google Apps Script contact connection failed. Error type: ${error instanceof Error ? error.name : "unknown"}.`,
    );
    return false;
  }
}
