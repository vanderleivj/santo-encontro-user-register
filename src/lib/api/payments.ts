export interface PixPaymentResponse {
  message: string;
  payment: {
    id: string;
    status: string;
  };
}

const API_BASE_URL =
  import.meta.env.VITE_ADMIN_API_URL ||
  "https://admin-santo-encontro.vercel.app";

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../supabase";

const SUPABASE_FUNCTIONS_URL = SUPABASE_URL;

/**
 * Mapeia o intervalo do plano para o tipo esperado pelo banco de dados
 */
function mapPlanIntervalToPlanType(interval: string | null): string {
  if (!interval) return "monthly";

  const intervalMap: Record<string, string> = {
    month: "monthly",
    year: "yearly",
    quarterly: "quarterly",
    semiannual: "semiannual",
    monthly: "monthly",
    yearly: "yearly",
  };

  return intervalMap[interval.toLowerCase()] || "monthly";
}

/**
 * Faz upload de comprovante PIX via API do admin
 */
export async function uploadPixProof(
  userId: string | null,
  email: string | null,
  planType: string,
  amount: number,
  file: File
): Promise<PixPaymentResponse> {
  const formData = new FormData();
  formData.append("file", file);

  if (userId) {
    formData.append("userId", userId);
  }
  if (email) {
    formData.append("email", email);
  }

  const mappedPlanType = mapPlanIntervalToPlanType(planType);

  formData.append("planType", mappedPlanType);
  formData.append("amount", amount.toString());

  const response = await fetch(`${API_BASE_URL}/api/payments/pix/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: "Erro ao enviar comprovante",
      details: "",
    }));

    if (errorData.details?.includes("plan_type_check")) {
      throw new Error(
        `Tipo de plano inválido: "${mappedPlanType}". O banco de dados espera: monthly, yearly, quarterly ou semiannual. Intervalo recebido: "${planType}"`
      );
    }

    if (
      errorData.details?.includes("mime type") &&
      errorData.details?.includes("not supported")
    ) {
      throw new Error(
        `Tipo de arquivo não suportado pelo servidor: ${errorData.details}. Por favor, verifique se o backend está configurado para aceitar este tipo de arquivo.`
      );
    }

    throw new Error(errorData.error || "Erro ao enviar comprovante");
  }

  const data = await response.json();
  return data;
}

/**
 * Verifica status do pagamento PIX do usuário (lista geral)
 */
export async function checkPixPaymentStatus(userId: string): Promise<{
  payments: Array<{
    id: string;
    status: "pending" | "approved" | "rejected";
    created_at: string;
  }>;
}> {
  const response = await fetch(
    `${API_BASE_URL}/api/payments/pix/status?userId=${userId}`
  );

  if (!response.ok) {
    throw new Error("Erro ao verificar status do pagamento");
  }

  const data = await response.json();
  return data;
}

export interface MercadoPagoPixOrderResponse {
  paymentId: string;
  qrCode: string;
  qrCodeBase64: string;
  ticketUrl: string;
  expiresAt: number;
  amount: number;
  currency: string;
}

/**
 * Cria ordem PIX no Mercado Pago e retorna QR e código copia e cola
 */
export async function createMercadoPagoPixOrder(
  accessToken: string,
  planType: string,
  amount?: number
): Promise<MercadoPagoPixOrderResponse> {
  const response = await fetch(
    `${SUPABASE_FUNCTIONS_URL}/functions/v1/create-mercadopago-pix-order`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ planType, amount }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Erro ao gerar PIX. Tente novamente.");
  }

  return data;
}

/**
 * Consulta status de um pagamento PIX por ID (para polling)
 */
export async function getPixPaymentStatusByPaymentId(
  accessToken: string,
  paymentId: string
): Promise<{ paymentId: string; status: string; createdAt?: string }> {
  const response = await fetch(
    `${SUPABASE_FUNCTIONS_URL}/functions/v1/get-pix-payment-status?paymentId=${encodeURIComponent(paymentId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_ANON_KEY,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Erro ao consultar status.");
  }

  return data;
}
