import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CheckoutShell } from "../../CheckoutShell";
import { useCheckoutStore } from "../../checkout-store";
import { supabase } from "../../../lib/supabase";
import {
  useAsaasCheckout,
  type CardCheckoutInput,
  type PaymentMethod,
} from "./useAsaasCheckout";
import { PixPanel } from "./PixPanel";
import { CardPanel } from "./CardPanel";
import { BoletoPanel } from "./BoletoPanel";
import { CpfGateForm } from "./CpfGateForm";
import { usePayment } from "../../../hooks/usePayment";
import { getTrialDays } from "../../../lib/trial-days";
import { resolveCheckoutDestination } from "../../shared/resolve-checkout-destination";
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
  const profileCompleted = useCheckoutStore((state) => state.profileCompleted);
  const setAccountCompleted = useCheckoutStore(
    (state) => state.setAccountCompleted
  );
  const setProfileCompleted = useCheckoutStore(
    (state) => state.setProfileCompleted
  );
  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasCpf, setHasCpf] = useState(false);
  const [cpfCheckLoading, setCpfCheckLoading] = useState(true);
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [card, setCard] = useState<CardCheckoutInput>(EMPTY_CARD);
  const [trialLoading, setTrialLoading] = useState(false);

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
  } = useAsaasCheckout(selectedPlan);
  const { handlePaymentWithStripe } = usePayment();

  useEffect(() => {
    if (!selectedPlan) {
      navigate({ to: "/planos" });
      return;
    }
    if (!profileCompleted) {
      navigate({ to: "/sobre-voce" });
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

      setAccountCompleted(true);
      setUserId(data.session.user.id);

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

      const { data: userRow } = await supabase
        .from("users")
        .select("cpf")
        .eq("id", data.session.user.id)
        .maybeSingle();

      if (cancelled) return;

      const cpfDigits = (userRow?.cpf ?? "").replace(/\D/g, "");
      setHasCpf(cpfDigits.length === 11);
      setCpfCheckLoading(false);
      setAuthReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [
    selectedPlan,
    profileCompleted,
    navigate,
    setAccountCompleted,
  ]);

  if (!selectedPlan || !authReady || cpfCheckLoading) {
    return (
      <CheckoutShell step="payment" title="Carregando pagamento...">
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full w-1/2 bg-brand-accent/60 animate-pulse" />
        </div>
      </CheckoutShell>
    );
  }

  if (userId && !hasCpf) {
    return (
      <CheckoutShell
        step="payment"
        title="Informe seu CPF"
        subtitle="Precisamos dele para gerar a cobrança com segurança."
      >
        <CpfGateForm
          userId={userId}
          onSaved={() => {
            setHasCpf(true);
            setProfileCompleted(true);
          }}
        />
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
    >
      <div className="space-y-3">
        {error ? (
          <div className="rounded-2xl bg-red-50 text-red-700 text-sm p-3">
            {error}
          </div>
        ) : null}

        {METHODS.map((item) => {
          const open = method === item.id;
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
                <p className="text-xs text-slate-500 mt-0.5">{item.subtitle}</p>
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
                    <CardPanel
                      value={card}
                      onChange={setCard}
                      loading={loading}
                      awaitingConfirmation={awaitingCardConfirmation}
                      verifying={verifying}
                      onVerifyPayment={verifyPaymentNow}
                      onSubmit={() => startCheckout("credit_card", card)}
                    />
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
