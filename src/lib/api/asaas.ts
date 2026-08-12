import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../supabase";

export type AsaasBillingType = "CREDIT_CARD" | "PIX" | "BOLETO";

export interface AsaasSubscriptionResponse {
  subscriptionId: string;
  customerId: string;
  status: string;
  planType: string;
  billingType: AsaasBillingType;
  amount: number;
  currency: string;
  paymentId: string | null;
  invoiceUrl: string | null;
  bankSlipUrl: string | null;
  qrCode: string | null;
  qrCodeBase64: string | null;
  expiresAt: number;
}

export interface CreateAsaasSubscriptionInput {
  planType: string;
  billingType: AsaasBillingType;
  cpf: string;
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  creditCardHolderInfo?: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    addressComplement?: string;
    phone: string;
    mobilePhone?: string;
  };
  remoteIp?: string;
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function errorMessageFromBody(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data) {
    const error = (data as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
  }
  return fallback;
}

export async function createAsaasSubscription(
  accessToken: string,
  input: CreateAsaasSubscriptionInput
): Promise<AsaasSubscriptionResponse> {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/create-asaas-subscription`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(input),
    }
  );

  const data = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(
      errorMessageFromBody(data, "Erro ao criar assinatura Asaas.")
    );
  }
  return data as AsaasSubscriptionResponse;
}

export async function getAsaasPaymentStatus(
  accessToken: string,
  paymentId: string
): Promise<{ paymentId: string; status: string; asaasStatus?: string }> {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/get-asaas-payment-status?paymentId=${encodeURIComponent(paymentId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_ANON_KEY,
      },
    }
  );

  const data = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(
      errorMessageFromBody(data, "Erro ao consultar status Asaas.")
    );
  }
  return data as {
    paymentId: string;
    status: string;
    asaasStatus?: string;
  };
}

export interface CreateAsaasPlanUpgradeInput {
  planType: string;
  billingType: AsaasBillingType;
  creditCard?: CreateAsaasSubscriptionInput["creditCard"];
  creditCardHolderInfo?: CreateAsaasSubscriptionInput["creditCardHolderInfo"];
  remoteIp?: string;
}

export interface AsaasPlanUpgradeResponse {
  kind: "upgrade";
  paymentId: string;
  subscriptionId: string;
  currentPlanType: string;
  targetPlanType: string;
  difference: number;
  amount: number;
  currency: string;
  billingType: AsaasBillingType;
  status: string;
  invoiceUrl: string | null;
  bankSlipUrl: string | null;
  qrCode: string | null;
  qrCodeBase64: string | null;
  projectedPeriodEnd: string;
  expiresAt: number;
}

export async function createAsaasPlanUpgrade(
  accessToken: string,
  input: CreateAsaasPlanUpgradeInput
): Promise<AsaasPlanUpgradeResponse> {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/create-asaas-plan-upgrade`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(input),
    }
  );

  const data = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(errorMessageFromBody(data, "Erro ao criar upgrade Asaas."));
  }
  return data as AsaasPlanUpgradeResponse;
}
