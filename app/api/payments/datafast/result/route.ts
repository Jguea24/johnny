import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getDatafastConfig, isDatafastApproved } from "@/lib/payments/datafast";
import { getSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/types/database";

export async function GET(request: NextRequest) {
  const destination = new URL("/servicios-digitales", request.url);
  const orderId = request.nextUrl.searchParams.get("orderId");
  const resourcePath = request.nextUrl.searchParams.get("resourcePath");
  if (!orderId || !/^[0-9a-f-]{36}$/i.test(orderId)) return NextResponse.redirect(destination);
  const config = getDatafastConfig();
  const supabaseConfig = getSupabaseConfig();
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!config || !supabaseConfig || !secret) return NextResponse.redirect(destination);

  const supabase = createSupabaseClient<Database>(supabaseConfig.url, secret, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const { data: order, error } = await supabase
    .from("service_orders")
    .select("id,status,amount,merchant_transaction_id,datafast_checkout_id")
    .eq("id", orderId)
    .maybeSingle();
  if (error || !order) return NextResponse.redirect(destination);
  const resultPage = new URL(`/pago/resultado/${order.id}`, request.url);
  if (order.status === "PAID") return NextResponse.redirect(resultPage);
  if (order.status !== "PENDING") return NextResponse.redirect(resultPage);

  const returnedId = resourcePath?.match(/^\/v1\/checkouts\/([A-Za-z0-9._-]+)\/payment$/)?.[1];
  if (!returnedId || !order.datafast_checkout_id || returnedId !== order.datafast_checkout_id) {
    return NextResponse.redirect(resultPage);
  }

  try {
    const statusUrl = new URL(`/v1/checkouts/${encodeURIComponent(returnedId)}/payment`, config.apiUrl);
    statusUrl.searchParams.set("entityId", config.entityId);
    const gatewayResponse = await fetch(statusUrl, {
      headers: { Authorization: `Bearer ${config.authorization}` },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!gatewayResponse.ok) return NextResponse.redirect(resultPage);
    const payment: unknown = await gatewayResponse.json();
    if (!payment || typeof payment !== "object") return NextResponse.redirect(resultPage);
    const fields = payment as Record<string, unknown>;
    const result = fields.result && typeof fields.result === "object" ? fields.result as Record<string, unknown> : {};
    const resultCode = typeof result.code === "string" ? result.code : null;
    const responseAmount = typeof fields.amount === "string" || typeof fields.amount === "number" ? Number(fields.amount) : NaN;
    const amountMatches = Number.isFinite(responseAmount) && Math.round(responseAmount * 100) === Math.round(order.amount * 100);
    const currencyMatches = fields.currency === "USD";
    const transactionMatches = fields.merchantTransactionId === order.merchant_transaction_id;
    const paid = isDatafastApproved(resultCode, config.testMode) && amountMatches && currencyMatches && transactionMatches;
    const paymentId = typeof fields.id === "string" ? fields.id : null;
    const paymentBrand = typeof fields.paymentBrand === "string" ? fields.paymentBrand : null;
    if (paid) {
      await supabase.from("service_orders").update({
        status: "PAID",
        datafast_payment_id: paymentId,
        datafast_result_code: resultCode,
        datafast_payment_brand: paymentBrand,
      }).eq("id", order.id).eq("status", "PENDING");
    } else if (resultCode && resultCode !== "000.200.100") {
      await supabase.from("service_orders").update({
        status: "FAILED",
        datafast_payment_id: paymentId,
        datafast_result_code: resultCode,
        datafast_payment_brand: paymentBrand,
      }).eq("id", order.id).eq("status", "PENDING");
    }
    return NextResponse.redirect(resultPage);
  } catch (error) {
    console.error(`Datafast status verification failed. Error type: ${error instanceof Error ? error.name : "UnknownError"}.`);
    return NextResponse.redirect(resultPage);
  }
}
