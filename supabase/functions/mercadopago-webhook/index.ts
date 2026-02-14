import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-signature, x-request-id",
};

function parseXSignature(header: string | null): { ts: string; v1: string } | null {
  if (!header) return null;
  const parts = header.split(",");
  let ts = "";
  let v1 = "";
  for (const part of parts) {
    const [key, val] = part.split("=").map((s) => s.trim());
    if (key === "ts") ts = val ?? "";
    else if (key === "v1") v1 = val ?? "";
  }
  return ts && v1 ? { ts, v1 } : null;
}

function verifySignature(
  dataId: string,
  xRequestId: string,
  sig: { ts: string; v1: string },
  secret: string
): boolean {
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${sig.ts};`;
  const key = new TextEncoder().encode(secret);
  const msg = new TextEncoder().encode(manifest);
  return crypto.subtle
    .importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
    .then((k) => crypto.subtle.sign("HMAC", k, msg))
    .then((buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join(""))
    .then((hex) => hex === sig.v1)
    .catch(() => false);
}

async function activateSubscriptionFromPixPayment(
  adminClient: ReturnType<typeof createClient>,
  pixPayment: { user_id: string; plan_type: string },
  userId: string
) {
  const { user_id, plan_type } = pixPayment;
  const now = new Date();
  let endDate = new Date(now);

  switch (plan_type) {
    case "monthly":
      endDate.setMonth(endDate.getMonth() + 1);
      break;
    case "quarterly":
      endDate.setMonth(endDate.getMonth() + 3);
      break;
    case "semiannual":
      endDate.setMonth(endDate.getMonth() + 6);
      break;
    case "yearly":
      endDate.setFullYear(endDate.getFullYear() + 1);
      break;
    default:
      endDate.setMonth(endDate.getMonth() + 1);
  }

  const { data: targetUser } = await adminClient
    .from("users")
    .select("id, stripe_customer_id")
    .eq("id", user_id)
    .single();

  const stripeCustomerId =
    (targetUser?.stripe_customer_id as string) || `pix_${user_id}`;

  const { data: existingSubscriptions } = await adminClient
    .from("subscriptions")
    .select("*")
    .eq("user_id", user_id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (existingSubscriptions && existingSubscriptions.length > 0) {
    await adminClient
      .from("subscriptions")
      .update({
        status: "active",
        plan_type: plan_type,
        start_date: now.toISOString(),
        end_date: endDate.toISOString(),
        current_period_end: endDate.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingSubscriptions[0].id);
  } else {
    await adminClient.from("subscriptions").insert({
      user_id: user_id,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: null,
      status: "active",
      plan_type: plan_type,
      price_id: null,
      current_period_end: endDate.toISOString(),
      start_date: now.toISOString(),
      end_date: endDate.toISOString(),
      payment_intent_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      migration_code: null,
      trial_days: null,
    });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const ok = () =>
    new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") {
    return ok();
  }

  try {
    const url = new URL(req.url);
    const dataIdParam = url.searchParams.get("data.id") ?? "";
    const dataId = dataIdParam.toLowerCase();
    const typeParam = url.searchParams.get("type");

    const xSignature = req.headers.get("x-signature");
    const xRequestId = req.headers.get("x-request-id") ?? "";

    const secret = Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET");
    if (secret && dataId && xRequestId && xSignature) {
      const sig = parseXSignature(xSignature);
      if (sig) {
        const valid = await verifySignature(dataId, xRequestId, sig, secret);
        if (!valid) {
          console.warn("mercadopago-webhook: signature verification failed");
          return ok();
        }
      }
    }

    if (typeParam !== "order" || !dataId) {
      return ok();
    }

    const body = await req.json();
    const action = (body as { action?: string }).action ?? "";
    const orderIdFromBody = (body as { data?: { id?: string } }).data?.id ?? dataIdParam;

    const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!mpAccessToken || !supabaseUrl || !supabaseServiceKey) {
      console.error("mercadopago-webhook: missing env");
      return ok();
    }

    const orderRes = await fetch(
      `https://api.mercadopago.com/v1/orders/${orderIdFromBody}`,
      {
        headers: { Authorization: `Bearer ${mpAccessToken}` },
      }
    );

    if (!orderRes.ok) {
      console.error("mercadopago-webhook: order fetch failed", orderRes.status);
      return ok();
    }

    const order = await orderRes.json();
    const status = (order as { status?: string }).status ?? "";
    const statusDetail = (order as { status_detail?: string }).status_detail ?? "";
    const transactions = (order as { transactions?: { payments?: unknown[] } }).transactions;
    const payments = transactions?.payments ?? [];
    const firstPayment = payments[0] as { status?: string } | undefined;
    const paymentStatus = firstPayment?.status ?? "";

    // Ordem paga: status "processed" + "accredited" (doc MP) ou "paid"/"approved" em nível de pagamento
    const isPaid =
      status === "processed" ||
      statusDetail === "accredited" ||
      status === "paid" ||
      paymentStatus === "approved" ||
      paymentStatus === "paid" ||
      paymentStatus === "accredited" ||
      action === "order.paid" ||
      action === "payment.approved";

    if (!isPaid) {
      console.log("mercadopago-webhook: order not paid yet", { status, statusDetail, paymentStatus, action });
      return ok();
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: record, error: fetchErr } = await adminClient
      .from("pix_payments")
      .select("id, user_id, plan_type, status, source")
      .eq("mercadopago_order_id", orderIdFromBody)
      .eq("source", "mercadopago")
      .limit(1)
      .maybeSingle();

    if (fetchErr || !record) {
      console.error("mercadopago-webhook: pix_payment not found", orderIdFromBody, fetchErr);
      return ok();
    }

    if (record.status === "approved") {
      return ok();
    }

    console.log("mercadopago-webhook: approving pix_payment", record.id, "order", orderIdFromBody);
    await adminClient
      .from("pix_payments")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", record.id);

    await activateSubscriptionFromPixPayment(adminClient, record, record.user_id);

    const { data: planRow } = await adminClient
      .from("plans")
      .select("id")
      .eq("interval", record.plan_type)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (planRow?.id) {
      await adminClient
        .from("user_profiles")
        .update({ plan_id: planRow.id, updated_at: new Date().toISOString() })
        .eq("id", record.user_id);
    }

    return ok();
  } catch (e) {
    console.error("mercadopago-webhook error:", e);
    return ok();
  }
});
