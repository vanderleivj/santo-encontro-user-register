import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { syncMercadoPagoPixPaymentIfPaid } from "../_shared/mercadopago-pix-sync.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader =
      req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Não autorizado." }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const url = new URL(req.url);
    const paymentId = url.searchParams.get("paymentId") ?? url.searchParams.get("payment_id");

    if (!paymentId) {
      return new Response(
        JSON.stringify({ error: "paymentId é obrigatório." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN") ?? "";

    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    const userClient = createClient(supabaseUrl, supabaseAnonKey);
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(jwt);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Não autorizado." }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: row, error } = await adminClient
      .from("pix_payments")
      .select("id, user_id, plan_type, amount, status, source, mercadopago_order_id, created_at")
      .eq("id", paymentId)
      .eq("user_id", user.id)
      .single();

    if (error || !row) {
      return new Response(
        JSON.stringify({ error: "Pagamento não encontrado." }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let status = row.status as string;

    if (
      status === "pending" &&
      row.source === "mercadopago" &&
      row.mercadopago_order_id &&
      mpAccessToken
    ) {
      const syncResult = await syncMercadoPagoPixPaymentIfPaid(
        adminClient,
        {
          id: row.id,
          user_id: row.user_id,
          plan_type: row.plan_type,
          amount: row.amount,
          status: row.status,
          source: row.source,
          mercadopago_order_id: row.mercadopago_order_id,
        },
        mpAccessToken
      );

      if (syncResult === "approved" || syncResult === "rejected") {
        status = syncResult;
      }
    }

    return new Response(
      JSON.stringify({
        paymentId: row.id,
        status,
        createdAt: row.created_at,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("get-pix-payment-status error:", err);
    return new Response(
      JSON.stringify({ error: "Erro ao consultar status." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
