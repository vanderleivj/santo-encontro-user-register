import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

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

type PixPaymentRecord = {
  id: string;
  user_id: string;
  plan_type: string;
  amount: unknown;
  status: string;
  source: string;
  mercadopago_order_id: string | null;
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

function isMercadoPagoOrderPaid(
  order: MercadoPagoOrder,
  action = ""
): boolean {
  const status = order.status ?? "";
  const statusDetail = order.status_detail ?? "";
  const payments = Array.isArray(order.transactions?.payments)
    ? order.transactions.payments
    : [];
  const firstPayment = payments[0];
  const paymentStatus = firstPayment?.status ?? "";

  return (
    status === "processed" ||
    statusDetail === "accredited" ||
    status === "paid" ||
    paymentStatus === "approved" ||
    paymentStatus === "paid" ||
    paymentStatus === "accredited" ||
    action === "order.paid" ||
    action === "payment.approved"
  );
}

async function activateSubscriptionFromPixPayment(
  adminClient: SupabaseClient,
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

export async function syncMercadoPagoPixPaymentIfPaid(
  adminClient: SupabaseClient,
  record: PixPaymentRecord,
  mpAccessToken: string
): Promise<"approved" | "pending" | "rejected" | "unchanged"> {
  if (record.status === "approved" || record.status === "rejected") {
    return "unchanged";
  }

  if (record.source !== "mercadopago" || !record.mercadopago_order_id) {
    return "unchanged";
  }

  const orderRes = await fetch(
    `https://api.mercadopago.com/v1/orders/${record.mercadopago_order_id}`,
    {
      headers: { Authorization: `Bearer ${mpAccessToken}` },
    }
  );

  if (!orderRes.ok) {
    console.error("mercadopago-pix-sync: order fetch failed", orderRes.status);
    return "pending";
  }

  const order = (await orderRes.json()) as MercadoPagoOrder;

  if (!isMercadoPagoOrderPaid(order)) {
    return "pending";
  }

  const externalReference =
    typeof order.external_reference === "string" ? order.external_reference : "";
  if (externalReference && externalReference !== record.id) {
    await adminClient
      .from("pix_payments")
      .update({
        status: "rejected",
        rejected_reason: "Ordem Mercado Pago não corresponde ao pagamento PIX.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", record.id);
    return "rejected";
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
  const payments = Array.isArray(order.transactions?.payments)
    ? order.transactions.payments
    : [];
  const paidAmountCents = getOrderAmountCents(order, payments[0]);

  if (
    planError ||
    !planRow?.id ||
    officialAmountCents === null ||
    officialAmountCents <= 0
  ) {
    await adminClient
      .from("pix_payments")
      .update({
        status: "rejected",
        rejected_reason: "Plano ativo não encontrado ou valor inválido.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", record.id);
    return "rejected";
  }

  if (
    recordAmountCents !== officialAmountCents ||
    paidAmountCents !== officialAmountCents
  ) {
    await adminClient
      .from("pix_payments")
      .update({
        status: "rejected",
        rejected_reason: "Valor pago não corresponde ao preço oficial do plano.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", record.id);
    return "rejected";
  }

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

  return "approved";
}
