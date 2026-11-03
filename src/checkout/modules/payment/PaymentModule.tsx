import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CheckoutShell } from "../../CheckoutShell";
import { useCheckoutStore, useCheckoutStoreHydrated } from "../../checkout-store";
import { supabase } from "../../../lib/supabase";
import {
  useAsaasCheckout,
  type CardCheckoutInput,
  type PaymentMethod,
} from "./useAsaasCheckout";
import { PixPanel } from "./PixPanel";
import { CardPanel } from "./CardPanel";
import { BoletoPanel } from "./BoletoPanel";
import {
  InstallmentPicker,
  type InstallmentQuoteOption,
} from "./InstallmentPicker";
import { maxCardInstallments } from "./card-installments";
import { listAsaasInstallmentQuotes } from "../../../lib/api/asaas";
import { mapPlanIntervalToPlanType } from "../../../lib/coupons";
import { usePayment } from "../../../hooks/usePayment";
import { getTrialDays } from "../../../lib/trial-days";
import { resolveCheckoutDestination } from "../../shared/resolve-checkout-destination";
import { fetchInactiveRegistrationStatus } from "../../../lib/inactive-registration";
import { IneligibleScreen } from "../account/IneligibleScreen";
import { toast } from "sonner";

const METHODS: { id: PaymentMethod; title: string; subtitle: string }[] = [
  {
    id: "pix",
    title: "PIX",
    subtitle: "Aprovação imediata · acesso liberado na hora",
  },
  {
    id: "credit_card",
    title: "Cartão de crédito",
    subtitle: "Pagamento recorrente seguro",
  },
  {
    id: "boleto",
    title: "Boleto bancário",
    subtitle: "Compensa em até 3 dias úteis",
  },
];

const EMPTY_CARD: CardCheckoutInput = {
  holderName: "",
  number: "",
  expiry: "",
  ccv: "",
  postalCode: "",
  addressNumber: "",
};

export function PaymentModule() {
  const navigate = useNavigate();
  const selectedPlan = useCheckoutStore((state) => state.selectedPlan);
  const checkoutHydrated = useCheckoutStoreHydrated();
  const setAccountCompleted = useCheckoutStore(
    (state) => state.setAccountCompleted
  );
  const setProfileCompleted = useCheckoutStore(
    (state) => state.setProfileCompleted
  );
  const bindCheckoutOwner = useCheckoutStore((state) => state.bindCheckoutOwner);
  const [authReady, setAuthReady] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [installmentCount, setInstallmentCount] = useState(1);
  const [card, setCard] = useState<CardCheckoutInput>(EMPTY_CARD);
  const appliedCoupon = useCheckoutStore((state) => state.appliedCoupon);
  const setCardFeeQuote = useCheckoutStore((state) => state.setCardFeeQuote);
  const [installmentQuotes, setInstallmentQuotes] = useState<
    InstallmentQuoteOption[]
  >([]);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [quotesFailed, setQuotesFailed] = useState(false);
  const [quotesRequestId, setQuotesRequestId] = useState(0);
  const [trialLoading, setTrialLoading] = useState(false);
  const [ineligibleReason, setIneligibleReason] = useState<string | null>(null);

  const {
    loading,
    verifying,
    error,
    pixData,
    boletoUrl,
    awaitingBoletoConfirmation,
    awaitingCardConfirmation,
    startCheckout,
    verifyPaymentNow,
    clearError,
  } = useAsaasCheckout(selectedPlan, installmentCount);
  const { handlePaymentWithStripe } = usePayment();
  const payableAmount = appliedCoupon?.finalAmount ?? selectedPlan?.price ?? 0;

  useEffect(() => {
    if (!selectedPlan || maxCardInstallments(selectedPlan.interval) <= 1) {
      setInstallmentQuotes([
        {
          count: 1,
          installmentValue: payableAmount,
          totalValue: payableAmount,
        },
      ]);
      setQuotesLoading(false);
      setQuotesFailed(false);
      return;
    }

    let cancelled = false;
    setQuotesLoading(true);
    setQuotesFailed(false);

    const loadQuotes = async (attempt: number) => {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) {
        if (!cancelled) setQuotesLoading(false);
        return;
      }
      try {
        const result = await listAsaasInstallmentQuotes(accessToken, {
          planType: mapPlanIntervalToPlanType(selectedPlan.interval),
          couponCode: appliedCoupon?.code,
        });
        if (!cancelled) {
          setInstallmentQuotes(result.options);
          setQuotesFailed(false);
        }
      } catch (quoteError) {
        if (cancelled) return;
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 800));
          if (!cancelled) await loadQuotes(attempt + 1);
          return;
        }
        setInstallmentQuotes([
          {
            count: 1,
            installmentValue: payableAmount,
            totalValue: payableAmount,
          },
        ]);
        setQuotesFailed(true);
        toast.error(
          quoteError instanceof Error
            ? quoteError.message
            : "Não foi possível calcular as parcelas."
        );
      }
    };

    void loadQuotes(0).finally(() => {
      if (!cancelled) setQuotesLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [appliedCoupon?.code, payableAmount, quotesRequestId, selectedPlan]);

  useEffect(() => {
    if (quotesLoading || installmentQuotes.length === 0) return;
    if (!installmentQuotes.some((option) => option.count === installmentCount)) {
      setInstallmentCount(1);
    }
  }, [installmentCount, installmentQuotes, quotesLoading]);

  useEffect(() => {
    if (method !== "credit_card") {
      setCardFeeQuote(null);
      return;
    }
    const selected = installmentQuotes.find(
      (option) => option.count === installmentCount
    );
    if (!selected || selected.count <= 1) {
      setCardFeeQuote(null);
      return;
    }
    setCardFeeQuote({
      count: selected.count,
      totalValue: selected.totalValue,
    });
  }, [installmentCount, installmentQuotes, method, setCardFeeQuote]);

  useEffect(() => {
    if (!checkoutHydrated) return;

    if (!selectedPlan) {
      navigate({ to: "/planos" });
      return;
    }

    let cancelled = false;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session?.user) {
        navigate({
          to: "/entrar",
          search: { next: "/pagamento", email: undefined },
        });
        return;
      }

      bindCheckoutOwner(data.session.user.id);
      setAccountCompleted(true);

      const inactive = await fetchInactiveRegistrationStatus({
        email: data.session.user.email,
      });
      if (cancelled) return;
      if (inactive.exists) {
        await supabase.auth.signOut();
        setIneligibleReason(inactive.reason ?? "Cadastro não aprovado");
        setAuthReady(true);
        return;
      }

      const resolved = await resolveCheckoutDestination({
        userId: data.session.user.id,
        hasSelectedPlan: Boolean(selectedPlan),
      });

      if (cancelled) return;

      if (resolved.hasActiveAsaasPlan) {
        toast.message(
          resolved.message ??
            "Você já tem uma assinatura ativa. Veja os detalhes do seu plano."
        );
        navigate({
          to: "/conta/plano",
          search: { app: undefined, embed: undefined },
        });
        return;
      }

      if (!resolved.profileComplete) {
        setProfileCompleted(false);
        navigate({ to: "/sobre-voce" });
        return;
      }

      setProfileCompleted(true);
      setAuthReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [
    checkoutHydrated,
    selectedPlan,
    navigate,
    setAccountCompleted,
    setProfileCompleted,
    bindCheckoutOwner,
  ]);

  if (ineligibleReason) {
    return (
      <IneligibleScreen
        reason={ineligibleReason}
        onBack={() => navigate({ to: "/planos" })}
      />
    );
  }

  if (!checkoutHydrated || !selectedPlan || !authReady) {
    return (
      <CheckoutShell step="payment" title="Carregando pagamento...">
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full w-1/2 bg-brand-accent/60 animate-pulse" />
        </div>
      </CheckoutShell>
    );
  }

  const handleFreePlan = async () => {
    setTrialLoading(true);
    try {
      const result = await handlePaymentWithStripe(selectedPlan);
      if (!result.success) {
        throw new Error(result.error ?? "Não foi possível ativar o teste");
      }
      const days = await getTrialDays();
      navigate({
        to: "/sucesso",
        search: {
          trial: "1",
          days: String(days),
          planLabel: selectedPlan.name,
          amount: undefined,
          method: undefined,
        },
      });
    } catch (trialError) {
      clearError();
      alert(
        trialError instanceof Error
          ? trialError.message
          : "Erro ao ativar período de teste"
      );
    } finally {
      setTrialLoading(false);
    }
  };

  if (selectedPlan.isFree || selectedPlan.price <= 0) {
    return (
      <CheckoutShell
        step="payment"
        title="Ativar período de teste"
        subtitle="Sem cobrança agora. Você pode assinar depois."
      >
        <button
          type="button"
          disabled={trialLoading}
          onClick={handleFreePlan}
          className="brand-primary-button w-full py-3.5 rounded-2xl font-bold text-sm disabled:opacity-50"
        >
          {trialLoading ? "Ativando..." : "Ativar teste gratuito"}
        </button>
      </CheckoutShell>
    );
  }

  return (
    <CheckoutShell
      step="payment"
      title="Como você quer pagar?"
      subtitle="Escolha o método. O acesso é liberado após a confirmação."
      showCoupon
    >
      <div className="space-y-3">
        {error ? (
          <div className="rounded-2xl bg-red-50 text-red-700 text-sm p-3">
            {error}
          </div>
        ) : null}

        {METHODS.map((item) => {
          const open = method === item.id;
          const cardInstallmentMax = maxCardInstallments(selectedPlan.interval);
          const subtitle =
            item.id === "credit_card" && cardInstallmentMax > 1
              ? "À vista no preço do plano, ou parcelado com a taxa do cartão"
              : item.subtitle;
          return (
            <div
              key={item.id}
              className={`rounded-2xl border-2 transition-colors ${
                open
                  ? "border-brand-accent bg-orange-50/30"
                  : "border-slate-200 bg-white"
              }`}
            >
              <button
                type="button"
                className="w-full text-left px-4 py-3.5"
                onClick={() => {
                  clearError();
                  setMethod(item.id);
                }}
              >
                <p className="font-bold text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
              </button>

              {open ? (
                <div className="px-4 pb-4 border-t border-slate-100/80 pt-3">
                  {item.id === "pix" ? (
                    <PixPanel
                      data={
                        pixData ?? {
                          paymentId: "",
                          qrCode: "",
                          copyPaste: "",
                          expiresAt: Date.now() + 30 * 60 * 1000,
                        }
                      }
                      generating={loading}
                      onGenerate={() => startCheckout("pix")}
                    />
                  ) : null}
                  {item.id === "credit_card" ? (
                    <div className="space-y-3">
                      {cardInstallmentMax > 1 ? (
                        <>
                          <InstallmentPicker
                            options={installmentQuotes}
                            loading={quotesLoading}
                            value={installmentCount}
                            onChange={setInstallmentCount}
                          />
                          {quotesFailed && !quotesLoading ? (
                            <button
                              type="button"
                              className="text-xs font-semibold text-brand-accent"
                              onClick={() =>
                                setQuotesRequestId((current) => current + 1)
                              }
                            >
                              Calcular parcelas de novo
                            </button>
                          ) : null}
                        </>
                      ) : null}
                      <CardPanel
                        value={card}
                        onChange={setCard}
                        loading={loading}
                        awaitingConfirmation={awaitingCardConfirmation}
                        verifying={verifying}
                        onVerifyPayment={verifyPaymentNow}
                        submitLabel={
                          installmentCount > 1 && cardInstallmentMax > 1
                            ? `Pagar em ${installmentCount}x`
                            : "Pagar com cartão"
                        }
                        onSubmit={() => startCheckout("credit_card", card)}
                      />
                    </div>
                  ) : null}
                  {item.id === "boleto" ? (
                    <BoletoPanel
                      loading={loading}
                      verifying={verifying}
                      awaitingConfirmation={awaitingBoletoConfirmation}
                      boletoUrl={boletoUrl}
                      onGenerate={() => startCheckout("boleto")}
                      onVerifyPayment={verifyPaymentNow}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </CheckoutShell>
  );
}
