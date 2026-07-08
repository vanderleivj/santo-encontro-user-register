import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-signature, x-request-id",
};

function planTypeToPlanInterval(planType: string): string {
  const intervalMap: Record<string, string> = {
    monthly: "month",
    yearly: "year",
    quarterly: "quarterly",
    semiannual: "semiannual",
  };

  return intervalMap[planType] ?? planType;
}

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
): Promise<boolean> {
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

type MercadoPagoPayment = {
  id?: string | number;
  status?: string;
  amount?: string | number;
  transaction_amount?: string | number;
  total_paid_amount?: string | number;
  paid_amount?: string | number;
};

type MercadoPagoOrder = {
  id?: string | number;
  status?: string;
  status_detail?: string;
  external_reference?: string;
  total_amount?: string | number;
  transaction_amount?: string | number;
  total_paid_amount?: string | number;
  paid_amount?: string | number;
  transactions?: {
    payments?: MercadoPagoPayment[];
  };
};

function toCents(value: unknown): number | null {
  let amount = Number.NaN;
  if (typeof value === "number") {
    amount = value;
  } else if (typeof value === "string") {
    amount = Number(value);
  }

  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

function getOrderAmountCents(
  order: MercadoPagoOrder,
  firstPayment?: MercadoPagoPayment
): number | null {
  const candidates = [
    firstPayment?.amount,
    firstPayment?.transaction_amount,
    firstPayment?.total_paid_amount,
    firstPayment?.paid_amount,
    order.total_amount,
    order.transaction_amount,
    order.total_paid_amount,
    order.paid_amount,
  ];

  for (const candidate of candidates) {
    const cents = toCents(candidate);
    if (cents !== null) return cents;
  }

  return null;
}

async function rejectPixPayment(
  adminClient: ReturnType<typeof createClient>,
  paymentId: string,
  reason: string
) {
  const { error } = await adminClient
    .from("pix_payments")
    .update({
      status: "rejected",
      rejected_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentId);

  if (error) {
    console.error("mercadopago-webhook: failed to reject pix_payment", {
      paymentId,
      reason,
      error,
    });
  }
}

async function activateSubscriptionFromPixPayment(
  adminClient: ReturnType<typeof createClient>,
  pixPayment: { user_id: string; plan_type: string }
) {
  const { user_id, plan_type } = pixPayment;
  const now = new Date();
  const endDate = new Date(now);

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
    const dataId = dataIdParam.trim();
    const dataIdForSignature = dataId.toLowerCase();
    const typeParam = url.searchParams.get("type");

    const xSignature = req.headers.get("x-signature");
    const xRequestId = req.headers.get("x-request-id") ?? "";

    const secret = Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET");
    if (secret) {
      const sig = parseXSignature(xSignature);
      if (!dataId || !xRequestId || !sig) {
        console.warn("mercadopago-webhook: missing required signature data");
        return ok();
      }

      const valid = await verifySignature(dataIdForSignature, xRequestId, sig, secret);
      if (!valid) {
        console.warn("mercadopago-webhook: signature verification failed");
        return ok();
      }
    }

    if (typeParam !== "order" || !dataId) {
      return ok();
    }

    const body = await req.json();
    const action = (body as { action?: string }).action ?? "";
    const orderIdFromBody =
      (body as { data?: { id?: string } }).data?.id ?? dataId;
    const orderId = String(orderIdFromBody).trim();

    const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!mpAccessToken || !supabaseUrl || !supabaseServiceKey) {
      console.error("mercadopago-webhook: missing env");
      return ok();
    }

    const orderRes = await fetch(
      `https://api.mercadopago.com/v1/orders/${orderId}`,
      {
        headers: { Authorization: `Bearer ${mpAccessToken}` },
      }
    );

    if (!orderRes.ok) {
      console.error("mercadopago-webhook: order fetch failed", orderRes.status);
      return ok();
    }

    const order = (await orderRes.json()) as MercadoPagoOrder;
    const status = order.status ?? "";
    const statusDetail = order.status_detail ?? "";
    const transactions = order.transactions;
    const payments = Array.isArray(transactions?.payments)
      ? transactions.payments
      : [];
    const firstPayment = payments[0];
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
      .select("id, user_id, plan_type, amount, status, source")
      .eq("mercadopago_order_id", orderId)
      .eq("source", "mercadopago")
      .limit(1)
      .maybeSingle();

    if (fetchErr || !record) {
      console.error("mercadopago-webhook: pix_payment not found", orderId, fetchErr);
      return ok();
    }

    if (record.status === "approved") {
      return ok();
    }

    if (record.status === "rejected") {
      return ok();
    }

    const externalReference =
      typeof order.external_reference === "string" ? order.external_reference : "";
    if (externalReference && externalReference !== record.id) {
      console.error("mercadopago-webhook: external_reference mismatch", {
        orderId,
        externalReference,
        pixPaymentId: record.id,
      });
      await rejectPixPayment(
        adminClient,
        record.id,
        "Ordem Mercado Pago não corresponde ao pagamento PIX."
      );
      return ok();
    }

    const planInterval = planTypeToPlanInterval(record.plan_type);

    const { data: planRow, error: planError } = await adminClient
      .from("plans")
      .select("id, price")
      .eq("interval", planInterval)
      .eq("is_active", true)
      .limit(1)
      .single();

    const officialAmountCents = toCents(planRow?.price);
    const recordAmountCents = toCents(record.amount);
    const paidAmountCents = getOrderAmountCents(order, firstPayment);

    if (
      planError ||
      !planRow?.id ||
      officialAmountCents === null ||
      officialAmountCents <= 0
    ) {
      console.error("mercadopago-webhook: invalid active plan price", {
        orderId,
        pixPaymentId: record.id,
        planType: record.plan_type,
        planError,
      });
      await rejectPixPayment(
        adminClient,
        record.id,
        "Plano ativo não encontrado ou valor inválido."
      );
      return ok();
    }

    if (
      recordAmountCents !== officialAmountCents ||
      paidAmountCents !== officialAmountCents
    ) {
      console.error("mercadopago-webhook: payment amount mismatch", {
        orderId,
        pixPaymentId: record.id,
        planType: record.plan_type,
        recordAmountCents,
        paidAmountCents,
        officialAmountCents,
      });
      await rejectPixPayment(
        adminClient,
        record.id,
        "Valor pago não corresponde ao preço oficial do plano."
      );
      return ok();
    }

    console.log("mercadopago-webhook: approving pix_payment", record.id, "order", orderId);
    await adminClient
      .from("pix_payments")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", record.id);

    await activateSubscriptionFromPixPayment(adminClient, record);

    await adminClient
      .from("user_profiles")
      .update({ plan_id: planRow.id, updated_at: new Date().toISOString() })
      .eq("id", record.user_id);

    // Notificar usuário por WhatsApp (assinatura ativada)
    const internalSecret = Deno.env.get("INTERNAL_SECRET");
    if (internalSecret && supabaseUrl) {
      const { data: userRow } = await adminClient
        .from("users")
        .select("phone")
        .eq("id", record.user_id)
        .single();
      const phone = (userRow?.phone as string)?.trim();
      if (phone) {
        const digits = phone.replace(/\D/g, "");
        const to = digits.length === 10 || digits.length === 11 ? "55" + digits : digits.startsWith("55") ? digits : "55" + digits;
        if (to.length >= 12) {
          const message = "Sua assinatura do Santo Encontro foi ativada! Você já pode acessar o aplicativo.";
          try {
            const sendRes = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-text`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Internal-Secret": internalSecret,
              },
              body: JSON.stringify({ to, text: message }),
            });
            if (!sendRes.ok) {
              console.warn("mercadopago-webhook: whatsapp send failed", sendRes.status);
            }
          } catch (e) {
            console.warn("mercadopago-webhook: whatsapp send error", e);
          }
        }
      }
    }

    return ok();
  } catch (e) {
    console.error("mercadopago-webhook error:", e);
    return ok();
  }
});
