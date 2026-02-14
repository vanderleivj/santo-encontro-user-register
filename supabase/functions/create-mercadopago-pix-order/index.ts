import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VALID_PLAN_TYPES = ["monthly", "yearly", "quarterly", "semiannual"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader =
      req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("create-mercadopago-pix-order: missing or invalid Authorization header");
      return new Response(
        JSON.stringify({
          error: "Token não enviado. Faça login novamente e tente outra vez.",
          code: "NO_TOKEN",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");

    if (!mpAccessToken) {
      console.error("MERCADOPAGO_ACCESS_TOKEN not set");
      return new Response(
        JSON.stringify({
          error: "Configuração de pagamento indisponível. Tente mais tarde.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    const userClient = createClient(supabaseUrl, supabaseAnonKey);

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(jwt);

    if (userError || !user) {
      console.error("create-mercadopago-pix-order: getUser failed", userError?.message ?? "no user");
      return new Response(
        JSON.stringify({
          error: "Sessão inválida ou expirada. Faça login novamente.",
          code: "INVALID_SESSION",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body = await req.json();
    const { planType, amount } = body as { planType: string; amount?: number };

    if (!planType || !VALID_PLAN_TYPES.includes(planType)) {
      return new Response(
        JSON.stringify({
          error: `planType inválido. Use: ${VALID_PLAN_TYPES.join(", ")}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    let finalAmount = amount;
    if (typeof finalAmount !== "number" || finalAmount <= 0) {
      const { data: planRow } = await adminClient
        .from("plans")
        .select("price")
        .eq("interval", planType)
        .eq("is_active", true)
        .limit(1)
        .single();

      if (!planRow?.price) {
        return new Response(
          JSON.stringify({
            error: "Plano não encontrado ou valor inválido. Recarregue a página.",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      finalAmount = Number(planRow.price);
    }

    const { data: userRow } = await adminClient
      .from("users")
      .select("email")
      .eq("id", user.id)
      .single();

    const email = userRow?.email ?? user.email ?? "";
    if (!email) {
      return new Response(
        JSON.stringify({
          error: "Email não encontrado. Atualize seu cadastro.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: pixPayment, error: insertError } = await adminClient
      .from("pix_payments")
      .insert({
        user_id: user.id,
        plan_type: planType,
        amount: finalAmount,
        proof_url: "",
        status: "pending",
        source: "mercadopago",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError || !pixPayment) {
      console.error("pix_payments insert error:", insertError);
      return new Response(
        JSON.stringify({
          error: "Erro ao criar pagamento. Tente novamente.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const externalRef = pixPayment.id;
    const idempotencyKey = externalRef;

    const amountStr = finalAmount.toFixed(2);
    const orderBody = {
      type: "online",
      total_amount: amountStr,
      external_reference: externalRef,
      processing_mode: "automatic",
      transactions: {
        payments: [
          {
            amount: amountStr,
            payment_method: {
              id: "pix",
              type: "bank_transfer",
            },
            expiration_time: "PT30M",
          },
        ],
      },
      payer: {
        email,
      },
    };

    const mpRes = await fetch("https://api.mercadopago.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mpAccessToken}`,
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(orderBody),
    });

    const mpData = await mpRes.json();

    if (!mpRes.ok) {
      console.error("Mercado Pago API error:", mpRes.status, mpData);
      await adminClient
        .from("pix_payments")
        .update({
          status: "rejected",
          rejected_reason: mpData?.message ?? "Falha ao criar ordem no Mercado Pago",
          updated_at: new Date().toISOString(),
        })
        .eq("id", externalRef);
      return new Response(
        JSON.stringify({
          error:
            mpData?.message ?? "Não foi possível gerar o PIX. Tente novamente.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const orderId = mpData.id;
    const payments = mpData.transactions?.payments ?? [];
    const firstPayment = payments[0];
    const paymentId = firstPayment?.id ?? null;
    const paymentMethod = firstPayment?.payment_method ?? {};
    const qrCode = paymentMethod.qr_code ?? "";
    const qrCodeBase64 = paymentMethod.qr_code_base64 ?? "";
    const ticketUrl = paymentMethod.ticket_url ?? "";

    await adminClient
      .from("pix_payments")
      .update({
        mercadopago_order_id: orderId,
        mercadopago_payment_id: paymentId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", externalRef);

    const expiresAt = firstPayment?.expiration_date
      ? new Date(firstPayment.expiration_date).getTime() / 1000
      : Math.floor(Date.now() / 1000) + 30 * 60;

    return new Response(
      JSON.stringify({
        paymentId: externalRef,
        qrCode,
        qrCodeBase64,
        ticketUrl,
        expiresAt,
        amount: finalAmount,
        currency: "BRL",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("create-mercadopago-pix-order error:", err);
    return new Response(
      JSON.stringify({
        error:
          err instanceof Error ? err.message : "Erro ao criar pagamento PIX.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
