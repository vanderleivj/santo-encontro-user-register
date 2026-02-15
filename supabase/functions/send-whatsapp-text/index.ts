import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-internal-secret",
};

/**
 * Normaliza número para formato API: só dígitos, DDI 55 para Brasil se necessário.
 */
function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) {
    return "55" + digits;
  }
  if (digits.startsWith("55") && digits.length >= 12) {
    return digits;
  }
  return digits;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const internalSecret = Deno.env.get("INTERNAL_SECRET");
  if (internalSecret) {
    const headerSecret = req.headers.get("x-internal-secret");
    if (headerSecret !== internalSecret) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const apiBase = Deno.env.get("WASSUP_API_BASE_URL");
  const apiKey = Deno.env.get("WASSUP_API_KEY");
  const instanceId = Deno.env.get("WASSUP_INSTANCE_ID") ?? "default";

  if (!apiBase || !apiKey) {
    console.error("send-whatsapp-text: missing WASSUP_API_BASE_URL or WASSUP_API_KEY");
    return new Response(
      JSON.stringify({ error: "WhatsApp API not configured" }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let body: { to?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const rawTo = body.to?.trim();
  const text = body.text?.trim();

  if (!rawTo || !text) {
    return new Response(
      JSON.stringify({ error: "to and text are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const to = normalizePhone(rawTo);
  if (to.length < 12) {
    return new Response(
      JSON.stringify({ error: "Invalid phone number" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const authHeader = `Bearer ${apiKey}`;
  const baseUrl = apiBase.replace(/\/$/, "");

  try {
    const checkRes = await fetch(
      `${baseUrl}/instances/${instanceId}/check-phone`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({ phones: [to] }),
      }
    );

    if (!checkRes.ok) {
      const errBody = await checkRes.text();
      console.error("send-whatsapp-text: check-phone failed", checkRes.status, errBody);
      if (checkRes.status === 401) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 501,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (checkRes.status === 503) {
        return new Response(
          JSON.stringify({ error: "WhatsApp not connected" }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "check-phone failed" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const checkData = (await checkRes.json()) as { results?: { jid?: string; on_whatsapp?: boolean }[] };
    const results = checkData.results ?? [];
    const item = results.find((r) => (r.jid ?? "").startsWith(to) || (r.jid ?? "").includes(to));
    if (!item?.on_whatsapp) {
      return new Response(
        JSON.stringify({ error: "number_not_on_whatsapp" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sendRes = await fetch(
      `${baseUrl}/instances/${instanceId}/send-text`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({ to, text }),
      }
    );

    if (!sendRes.ok) {
      const errBody = await sendRes.text();
      console.error("send-whatsapp-text: send-text failed", sendRes.status, errBody);
      if (sendRes.status === 503) {
        return new Response(
          JSON.stringify({ error: "WhatsApp not connected or queue full" }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "send failed" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sendData = (await sendRes.json()) as { status?: string };
    return new Response(
      JSON.stringify({ status: sendData.status ?? "enqueued" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("send-whatsapp-text error:", e);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
