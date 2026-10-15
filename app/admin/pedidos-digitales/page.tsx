import type { Metadata } from "next";
import DigitalOrdersManager from "@/components/admin/DigitalOrdersManager";
import { requireAdmin } from "@/lib/auth/identity";

export const metadata: Metadata = {
  title: "Pedidos digitales | Administración",
  robots: { index: false, follow: false },
};

export default async function DigitalOrdersPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("digital_orders")
    .select("id,service_id,service_title,brand,family_name,plan_name,duration_value,duration_unit,amount,customer_name,customer_email,customer_phone,payment_method,payment_status,payment_verified_at,delivery_status,delivered_at,expires_at,delivery_notes,stock_reserved,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <main className="space-y-7">
      <header>
        <p className="section-eyebrow">Administración</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Pedidos digitales</h1>
        <p className="mt-3 max-w-3xl text-slate-300">Verifica manualmente cada pago coordinado por WhatsApp y registra la entrega y la expiración. No se activa ni se renueva ningún producto automáticamente.</p>
      </header>
      {error ? (
        <p className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-5 text-sm text-rose-200" role="alert">
          No se pudieron cargar los pedidos. Aplica la migración local del catálogo y revisa los permisos administrativos de Supabase.
        </p>
      ) : (
        <>
          <p className="text-sm text-slate-400">{data?.length ?? 0} pedido(s); se muestran hasta 200 registros.</p>
          <DigitalOrdersManager orders={data ?? []} />
        </>
      )}
    </main>
  );
}
