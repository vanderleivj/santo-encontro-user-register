import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  createAsaasSubscription,
  getAsaasPaymentStatus,
  type AsaasBillingType,
} from "../../../lib/api/asaas";
import { supabase } from "../../../lib/supabase";
import type { PlanConfig } from "../../../hooks/usePlans";
import { isAsaasPaymentConfirmed } from "./asaas-payment-status";

export type PaymentMethod = "pix" | "credit_card" | "boleto";

export interface PixCheckoutData {
  paymentId: string;
  qrCode: string;
  qrCodeBase64?: string;
  copyPaste: string;
  expiresAt: number;
  invoiceUrl?: string;
}

export interface CardCheckoutInput {
  holderName: string;
  number: string;
  expiry: string;
  ccv: string;
  postalCode: string;
  addressNumber: string;
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function mapPlanIntervalToPlanType(interval: string | null | undefined): string {
  const raw = interval === "one_time" || !interval ? "monthly" : interval;
  if (raw === "month") return "monthly";
  if (raw === "year") return "yearly";
  return raw;
}

function billingTypeFromMethod(method: PaymentMethod): AsaasBillingType {
  if (method === "pix") return "PIX";
  if (method === "boleto") return "BOLETO";
  return "CREDIT_CARD";
}

export function useAsaasCheckout(plan: PlanConfig | null) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pixData, setPixData] = useState<PixCheckoutData | null>(null);
  const [boletoUrl, setBoletoUrl] = useState<string | null>(null);
  const [pollingPaymentId, setPollingPaymentId] = useState<string | null>(null);
  const [pollingMethod, setPollingMethod] = useState<PaymentMethod | null>(
    null
  );

  const goToSuccess = useCallback(
    (method: PaymentMethod) => {
      if (!plan) return;
      navigate({
        to: "/sucesso",
        search: {
          trial: undefined,
          days: undefined,
          planLabel: plan.name,
          amount: String(plan.price),
          method,
        },
      });
    },
    [navigate, plan]
  );

  const checkPaymentStatus = useCallback(
    async (paymentId: string, method: PaymentMethod) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return false;

      const status = await getAsaasPaymentStatus(
        session.access_token,
        paymentId
      );
      if (!isAsaasPaymentConfirmed(status)) return false;

      setPollingPaymentId(null);
      setPollingMethod(null);
      goToSuccess(method);
      return true;
    },
    [goToSuccess]
  );

  useEffect(() => {
    if (!pollingPaymentId || !pollingMethod) return;

    const intervalId = window.setInterval(async () => {
      try {
        await checkPaymentStatus(pollingPaymentId, pollingMethod);
      } catch {
        // keep polling
      }
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, [pollingPaymentId, pollingMethod, checkPaymentStatus]);

  const verifyPaymentNow = async () => {
    if (!pollingPaymentId || !pollingMethod) {
      setError("Gere o pagamento antes de verificar o status.");
      return;
    }

    setVerifying(true);
    setError(null);
    try {
      const confirmed = await checkPaymentStatus(
        pollingPaymentId,
        pollingMethod
      );
      if (!confirmed) {
        setError(
          pollingMethod === "boleto"
            ? "Pagamento ainda não compensou. Tente novamente em alguns minutos."
            : "Pagamento ainda não confirmado. Aguarde alguns segundos e tente de novo."
        );
      }
    } catch {
      setError("Não foi possível verificar o status. Tente novamente.");
    } finally {
      setVerifying(false);
    }
  };

  const startCheckout = async (
    method: PaymentMethod,
    card?: CardCheckoutInput
  ) => {
    if (!plan) {
      setError("Selecione um plano para continuar.");
      return;
    }

    setLoading(true);
    setError(null);
    if (method !== "boleto") {
      setBoletoUrl(null);
    }
    if (method !== "pix") {
      setPixData(null);
    }

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error("Faça login novamente para continuar o pagamento.");
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: userProfile } = await supabase
        .from("users")
        .select('email, "firstName", "lastName", cpf, phone')
        .eq("id", user?.id ?? "")
        .maybeSingle();

      const cpfDigits = onlyDigits(userProfile?.cpf ?? "");
      if (cpfDigits.length !== 11) {
        throw new Error(
          "CPF não encontrado no cadastro. Informe seu CPF para continuar o pagamento."
        );
      }

      const billingType = billingTypeFromMethod(method);
      const planType = mapPlanIntervalToPlanType(plan.interval);
      const fullName =
        `${userProfile?.firstName ?? ""} ${userProfile?.lastName ?? ""}`.trim() ||
        card?.holderName.trim() ||
        userProfile?.email ||
        "Cliente";

      let creditCardPayload:
        | {
            creditCard: {
              holderName: string;
              number: string;
              expiryMonth: string;
              expiryYear: string;
              ccv: string;
            };
            creditCardHolderInfo: {
              name: string;
              email: string;
              cpfCnpj: string;
              postalCode: string;
              addressNumber: string;
              phone: string;
              mobilePhone: string;
            };
          }
        | undefined;

      if (billingType === "CREDIT_CARD") {
        if (!card) {
          throw new Error("Preencha os dados do cartão.");
        }
        const profilePhone = onlyDigits(userProfile?.phone ?? "");
        if (profilePhone.length < 10) {
          throw new Error(
            "Telefone não encontrado no cadastro. Volte e informe seu WhatsApp."
          );
        }
        const [expiryMonth, expiryYearRaw] = card.expiry.split("/");
        const expiryYear =
          expiryYearRaw?.length === 2 ? `20${expiryYearRaw}` : expiryYearRaw;
        if (
          !card.holderName.trim() ||
          onlyDigits(card.number).length < 13 ||
          !expiryMonth ||
          !expiryYear ||
          onlyDigits(card.ccv).length < 3 ||
          onlyDigits(card.postalCode).length < 8 ||
          !card.addressNumber.trim()
        ) {
          throw new Error("Preencha todos os dados do cartão e endereço.");
        }

        creditCardPayload = {
          creditCard: {
            holderName: card.holderName.trim(),
            number: onlyDigits(card.number),
            expiryMonth: onlyDigits(expiryMonth),
            expiryYear: onlyDigits(expiryYear),
            ccv: onlyDigits(card.ccv),
          },
          creditCardHolderInfo: {
            name: card.holderName.trim() || fullName,
            email: userProfile?.email || user?.email || "",
            cpfCnpj: cpfDigits,
            postalCode: onlyDigits(card.postalCode),
            addressNumber: card.addressNumber.trim(),
            phone: profilePhone,
            mobilePhone: profilePhone,
          },
        };
      }

      const response = await createAsaasSubscription(session.access_token, {
        planType,
        billingType,
        cpf: cpfDigits,
        ...creditCardPayload,
      });

      if (billingType === "CREDIT_CARD") {
        if (response.status === "active") {
          goToSuccess("credit_card");
          return;
        }
        if (response.paymentId) {
          setPollingPaymentId(response.paymentId);
          setPollingMethod("credit_card");
          return;
        }
        throw new Error(
          "Pagamento não autorizado. Verifique os dados do cartão ou tente outro método."
        );
      }

      if (billingType === "BOLETO") {
        const url = response.bankSlipUrl || response.invoiceUrl;
        if (!url) {
          throw new Error(
            "Boleto gerado, mas o link não ficou disponível. Tente novamente."
          );
        }
        setBoletoUrl(url);
        window.open(url, "_blank", "noopener,noreferrer");
        if (response.paymentId) {
          setPollingPaymentId(response.paymentId);
          setPollingMethod("boleto");
        }
        return;
      }

      const expiresAt =
        typeof response.expiresAt === "number" && response.expiresAt > 1e12
          ? response.expiresAt
          : Date.now() + 30 * 60 * 1000;

      setPixData({
        paymentId: response.paymentId || "",
        qrCode: response.qrCodeBase64
          ? `data:image/png;base64,${response.qrCodeBase64}`
          : "",
        qrCodeBase64: response.qrCodeBase64 || undefined,
        copyPaste: response.qrCode || "",
        expiresAt,
        invoiceUrl: response.invoiceUrl || undefined,
      });

      if (response.paymentId) {
        setPollingPaymentId(response.paymentId);
        setPollingMethod("pix");
      }
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Erro ao iniciar pagamento"
      );
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    verifying,
    error,
    pixData,
    boletoUrl,
    awaitingBoletoConfirmation: Boolean(boletoUrl && pollingMethod === "boleto"),
    awaitingCardConfirmation: Boolean(pollingMethod === "credit_card"),
    startCheckout,
    verifyPaymentNow,
    clearError: () => setError(null),
  };
}
