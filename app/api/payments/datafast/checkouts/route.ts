import { createHash, randomUUID } from "node:crypto";
import { isIP } from "node:net";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { formatUsd, getDatafastConfig } from "@/lib/payments/datafast";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { getConfiguredSiteUrl } from "@/lib/site-url";
import type { Database } from "@/types/database";

function isValidEcuadorianId(value: string) {
  if (!/^\d{10}$/.test(value)) return false;
  const province = Number(value.slice(0, 2));
  if (province < 1 || province > 24 || Number(value[2]) > 5) return false;
  const sum = [...value.slice(0, 9)].reduce((total, digit, index) => {
    if (index % 2 !== 0) return total + Number(digit);
    const product = Number(digit) * 2;
    return total + (product > 9 ? product - 9 : product);
  }, 0);
  return (10 - (sum % 10)) % 10 === Number(value[9]);
}

const checkoutInput = z.object({
  serviceId: z.string().uuid(),
  givenName: z.string().trim().min(3).max(48),
  middleName: z.string().trim().min(2).max(50),
  surname: z.string().trim().min(3).max(48),
  email: z.string().trim().email().max(128),
  phone: z.string().trim().min(7).max(25),
  identification: z.string().trim().regex(/^\d{10}$/, "Escribe una cédula ecuatoriana de 10 dígitos.").refine(isValidEcuadorianId, "La cédula ingresada no es válida."),
  address: z.string().trim().min(3).max(100),
  postcode: z.string().trim().min(3).max(20),
});

function serverSupabase() {
  const config = getSupabaseConfig();
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!config || !secret) return null;
  return createSupabaseClient<Database>(config.url, secret, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

function firstClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const candidates = forwarded ? forwarded.split(",").reverse() : [];
  const ip = candidates.map((candidate) => candidate.trim()).find((candidate) => isIP(candidate));
  return ip && ip.length <= 255 ? ip : null;
}

async function checkCheckoutRateLimit(ip: string): Promise<"allowed" | "limited" | "not-configured" | "unavailable"> {
  const endpoint = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!endpoint || !token) return "not-configured";
  const key = `datafast:checkout:${createHash("sha256").update(ip).digest("hex")}`;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(["EVAL", "local count=redis.call('INCR',KEYS[1]); if count==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return count", 1, key, 600]),
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return "unavailable";
    const result = await response.json() as { result?: unknown; error?: unknown };
    if (result.error || typeof result.result !== "number") return "unavailable";
    return result.result <= 5 ? "allowed" : "limited";
  } catch {
    return "unavailable";
  }
}

function cents(value: number) {
  return Math.round(value * 100);
}

export async function POST(request: NextRequest) {
  const inputResult = checkoutInput.safeParse(await request.json().catch(() => null));
  if (!inputResult.success) {
    return NextResponse.json({ error: inputResult.error.issues[0]?.message ?? "Revisa los datos del comprador." }, { status: 400 });
  }
  const customerIp = firstClientIp(request);
  if (!customerIp) return NextResponse.json({ error: "No se pudo validar la conexión del comprador." }, { status: 400 });
  const rateLimit = await checkCheckoutRateLimit(customerIp);
  if (rateLimit === "limited") return NextResponse.json({ error: "Se alcanzó el límite temporal de intentos. Espera unos minutos." }, { status: 429 });
  if (rateLimit === "not-configured") {
    return NextResponse.json(
      { error: "El pago está pausado por seguridad: el administrador debe configurar UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN en el servidor." },
      { status: 503 },
    );
  }
  if (rateLimit === "unavailable") {
    return NextResponse.json({ error: "El servicio de seguridad no responde. El pago se mantiene pausado; inténtalo más tarde." }, { status: 503 });
  }

  const config = getDatafastConfig();
  const supabase = serverSupabase();
  const siteUrl = getConfiguredSiteUrl();
  if (!config || !supabase || !siteUrl) {
    return NextResponse.json({ error: "El pago en línea todavía no está configurado. Contacta al administrador." }, { status: 503 });
  }

  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("id,title,price,status,service_kind,tax_base0,tax_baseimp,tax_iva")
    .eq("id", inputResult.data.serviceId)
    .eq("status", "ACTIVE")
    .eq("service_kind", "DIGITAL")
    .maybeSingle();
  if (serviceError) {
    console.error(`Datafast service lookup failed. Supabase code: ${serviceError.code}.`);
    return NextResponse.json({ error: "No fue posible validar el servicio. Inténtalo más tarde." }, { status: 503 });
  }
  if (!service || service.price === null || service.price <= 0) {
    return NextResponse.json({ error: "Este servicio digital no está disponible para pago en línea." }, { status: 404 });
  }
  const taxTotalCents = cents(service.tax_base0) + cents(service.tax_baseimp) + cents(service.tax_iva);
  if (taxTotalCents !== cents(service.price)) {
    return NextResponse.json({ error: "El administrador debe configurar el desglose de impuestos para este servicio antes de cobrarlo." }, { status: 409 });
  }

  const buyer = inputResult.data;
  const orderId = randomUUID();
  const merchantTransactionId = `johnny_${orderId.replaceAll("-", "")}`;
  const merchantCustomerId = createHash("sha256").update(buyer.email.toLowerCase()).digest("hex").slice(0, 16);
  const { error: insertError } = await supabase.from("service_orders").insert({
    id: orderId,
    service_id: service.id,
    service_title: service.title,
    amount: service.price,
    tax_base0: service.tax_base0,
    tax_baseimp: service.tax_baseimp,
    tax_iva: service.tax_iva,
    customer_given_name: buyer.givenName,
    customer_middle_name: buyer.middleName,
    customer_surname: buyer.surname,
    customer_email: buyer.email,
    customer_phone: buyer.phone,
    customer_identification: buyer.identification,
    customer_address: buyer.address,
    customer_postcode: buyer.postcode,
    merchant_transaction_id: merchantTransactionId,
  });
  if (insertError) {
    console.error(`Datafast order insert failed. Supabase code: ${insertError.code}.`);
    return NextResponse.json({ error: "No se pudo iniciar la orden. Inténtalo de nuevo." }, { status: 503 });
  }

  const form = new URLSearchParams({
    entityId: config.entityId,
    amount: formatUsd(service.price),
    currency: "USD",
    paymentType: "DB",
    "customer.givenName": buyer.givenName,
    "customer.middleName": buyer.middleName,
    "customer.surname": buyer.surname,
    "customer.ip": customerIp,
    "customer.merchantCustomerId": merchantCustomerId,
    merchantTransactionId,
    "customer.email": buyer.email,
    "customer.identificationDocType": "IDCARD",
    "customer.identificationDocId": buyer.identification,
    "customer.phone": buyer.phone,
    "billing.street1": buyer.address,
    "billing.country": "EC",
    "billing.postcode": buyer.postcode,
    "shipping.street1": buyer.address,
    "shipping.country": "EC",
    "shipping.postcode": buyer.postcode,
    "cart.items[0].name": service.title.slice(0, 255),
    "cart.items[0].description": service.title.slice(0, 255),
    "cart.items[0].price": formatUsd(service.price),
    "cart.items[0].quantity": "1",
    "customParameters[SHOPPER_VAL_BASE0]": formatUsd(service.tax_base0),
    "customParameters[SHOPPER_VAL_BASEIMP]": formatUsd(service.tax_baseimp),
    "customParameters[SHOPPER_VAL_IVA]": formatUsd(service.tax_iva),
    "customParameters[SHOPPER_MID]": config.merchantId,
    "customParameters[SHOPPER_TID]": config.terminalId,
    "customParameters[SHOPPER_ECI]": process.env.DATAFAST_ECI?.trim() || "0103910",
    "customParameters[SHOPPER_PSERV]": process.env.DATAFAST_PSERV?.trim() || "17913101",
    "customParameters[SHOPPER_VERSIONDF]": "2",
    "risk.parameters[USER_DATA2]": config.merchantName.slice(0, 30),
  });
  if (config.testMode) form.set("testMode", "EXTERNAL");

  try {
    const gatewayResponse = await fetch(`${config.apiUrl}/v1/checkouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.authorization}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const gatewayData: unknown = await gatewayResponse.json();
    const checkoutId =
      gatewayData && typeof gatewayData === "object" && "id" in gatewayData && typeof gatewayData.id === "string"
        ? gatewayData.id
        : null;
    const gatewayCode = gatewayData && typeof gatewayData === "object" && "result" in gatewayData && gatewayData.result && typeof gatewayData.result === "object" && "code" in gatewayData.result
      ? gatewayData.result.code
      : null;
    if (!gatewayResponse.ok || gatewayCode !== "000.200.100" || !checkoutId || !/^[A-Za-z0-9._-]{8,200}$/.test(checkoutId)) {
      await supabase.from("service_orders").update({ status: "FAILED" }).eq("id", orderId).eq("status", "PENDING");
      console.error(`Datafast checkout creation failed. HTTP status: ${gatewayResponse.status}.`);
      return NextResponse.json({ error: "Datafast no pudo iniciar el pago. Revisa los datos e inténtalo de nuevo." }, { status: 502 });
    }
    const { error: updateError } = await supabase
      .from("service_orders")
      .update({ datafast_checkout_id: checkoutId })
      .eq("id", orderId)
      .eq("status", "PENDING");
    if (updateError) {
      console.error(`Datafast checkout persistence failed. Supabase code: ${updateError.code}.`);
      return NextResponse.json({ error: "No se pudo preparar el formulario seguro de pago." }, { status: 503 });
    }
    const resultUrl = new URL("/api/payments/datafast/result", siteUrl);
    resultUrl.searchParams.set("orderId", orderId);
    return NextResponse.json({
      orderId,
      checkoutId,
      widgetUrl: `${config.apiUrl}/v1/paymentWidgets.js?checkoutId=${encodeURIComponent(checkoutId)}`,
      resultUrl: resultUrl.toString(),
    });
  } catch (error) {
    await supabase.from("service_orders").update({ status: "FAILED" }).eq("id", orderId).eq("status", "PENDING");
    console.error(`Datafast checkout connection failed. Error type: ${error instanceof Error ? error.name : "UnknownError"}.`);
    return NextResponse.json({ error: "No fue posible conectar con Datafast. Inténtalo más tarde." }, { status: 502 });
  }
}
