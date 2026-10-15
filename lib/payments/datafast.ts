import "server-only";

export type DatafastConfig = {
  apiUrl: string;
  entityId: string;
  authorization: string;
  merchantId: string;
  terminalId: string;
  merchantName: string;
  testMode: boolean;
};

const allowedHosts = new Set(["eu-test.oppwa.com", "eu-prod.oppwa.com"]);

export function getDatafastConfig(): DatafastConfig | null {
  const rawUrl = process.env.DATAFAST_API_URL?.trim();
  const entityId = process.env.DATAFAST_ENTITY_ID?.trim();
  const authorization = process.env.DATAFAST_AUTHORIZATION?.trim().replace(/^Bearer\s+/i, "");
  const merchantId = process.env.DATAFAST_MID?.trim();
  const terminalId = process.env.DATAFAST_TID?.trim();
  const merchantName = process.env.DATAFAST_MERCHANT_NAME?.trim();
  if (!rawUrl || !entityId || !authorization || !merchantId || !terminalId || !merchantName) return null;

  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:" || !allowedHosts.has(parsed.hostname) || parsed.pathname !== "" || parsed.search || parsed.hash) return null;
    const testMode = parsed.hostname === "eu-test.oppwa.com";
    return { apiUrl: parsed.origin, entityId, authorization, merchantId, terminalId, merchantName, testMode };
  } catch {
    return null;
  }
}

export function datafastWidgetUrl(config: DatafastConfig, checkoutId: string) {
  return `${config.apiUrl}/v1/paymentWidgets.js?checkoutId=${encodeURIComponent(checkoutId)}`;
}

export function isDatafastApproved(code: unknown, testMode: boolean) {
  if (typeof code !== "string") return false;
  return testMode ? code === "000.100.112" : code === "000.000.000";
}

export function formatUsd(amount: number) {
  return amount.toFixed(2);
}
