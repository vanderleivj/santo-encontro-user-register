import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { CheckoutShell } from "../../CheckoutShell";
import { useIsAppWebView } from "../../shared/app-webview";
import { restoreSessionFromHash } from "../../shared/restore-session-from-hash";
import { usePlanCatalog, type PlanConfig } from "../plan/usePlanCatalog";
import { supabase } from "../../../lib/supabase";
import { useAsaasUpgrade } from "./useAsaasUpgrade";
import {
  type CardCheckoutInput,
  type PaymentMethod,
} from "../payment/useAsaasCheckout";
import { PixPanel } from "../payment/PixPanel";
import { CardPanel } from "../payment/CardPanel";
import { BoletoPanel } from "../payment/BoletoPanel";
import { CpfGateForm } from "../payment/CpfGateForm";
import {
  formatBrl,
  intervalToPlanType,
  isPlanUpgrade,
  planTypeLabel,
  type AsaasPlanType,
} from "./plan-type";

const METHODS: {
  id: PaymentMethod;
  title: string;
  subtitle: string;
}[] = [
  {
    id: "pix",
    title: "PIX",
    subtitle: "Aprovação rápida · plano muda após confirmação",
  },
  {
    id: "credit_card",
    title: "Cartão de crédito",
    subtitle: "Cobra só a diferença do upgrade",
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

type UpgradeStep = "select" | "pay";

interface CurrentSubscription {
  planType: AsaasPlanType;
}

export function UpgradeModule() {
  const navigate = useNavigate();
  const isAppWebView = useIsAppWebView();
  const { plans, loading: plansLoading, error: plansError } = usePlanCatalog();
  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasCpf, setHasCpf] = useState(false);
  const [cpfCheckLoading, setCpfCheckLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] =
    useState<CurrentSubscription | null>(null);
  const [step, setStep] = useState<UpgradeStep>("select");
  const [selectedPlan, setSelectedPlan] = useState<PlanConfig | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [card, setCard] = useState<CardCheckoutInput>(EMPTY_CARD);

  const {
    loading,
    verifying,
    error,
    pixData,
    boletoUrl,
    difference,
    awaitingBoletoConfirmation,
    startUpgrade,
    verifyPaymentNow,
  } = useAsaasUpgrade(selectedPlan);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        await restoreSessionFromHash();
      } catch (error) {
        console.warn("Erro ao restaurar sessão no /conta/upgrade:", error);
      }

      if (cancelled) return;

      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) {
        navigate({
          to: "/entrar",
          search: {
            next: isAppWebView ? "/conta/upgrade?app=1" : "/conta/upgrade",
            email: undefined,
          },
        });
        return;
      }

      const sessionUserId = data.session.user.id;
      setUserId(sessionUserId);

      const [{ data: userRow }, { data: subscriptionRow }] = await Promise.all([
        supabase
          .from("users")
          .select("cpf")
          .eq("id", sessionUserId)
          .maybeSingle(),
        supabase
          .from("subscriptions")
          .select(
            "plan_type, status, provider, asaas_subscription_id, asaas_customer_id"
          )
          .eq("user_id", sessionUserId)
          .eq("provider", "asaas")
          .not("asaas_subscription_id", "is", null)
          .in("status", ["active", "trialing", "past_due"])
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      const cpfDigits = (userRow?.cpf ?? "").replace(/\D/g, "");
      setHasCpf(cpfDigits.length === 11);
      setCpfCheckLoading(false);

      const planType = String(subscriptionRow?.plan_type ?? "");
      if (
        !subscriptionRow?.asaas_subscription_id ||
        !subscriptionRow.asaas_customer_id ||
        !["monthly", "quarterly", "semiannual", "yearly"].includes(planType)
      ) {
        setLoadError(
          "Nenhuma assinatura Asaas ativa encontrada para upgrade."
        );
        setAuthReady(true);
        return;
      }

      setCurrentSubscription({
        planType: planType as AsaasPlanType,
      });
      setAuthReady(true);
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [isAppWebView, navigate]);

  const upgradePlans = useMemo(() => {
    if (!currentSubscription) return [];
    return plans
      .filter((plan) => !plan.isFree)
      .map((plan) => {
        const planType = intervalToPlanType(plan.interval);
        return { plan, planType };
      })
      .filter(
        (
          item
        ): item is { plan: PlanConfig; planType: AsaasPlanType } =>
          Boolean(item.planType) &&
          isPlanUpgrade(currentSubscription.planType, item.planType as string)
      )
      .map(({ plan, planType }) => ({ plan, planType }));
  }, [plans, currentSubscription]);

  const currentPlanPrice = useMemo(() => {
    if (!currentSubscription) return 0;
    const current = plans.find((plan) => {
      const planType = intervalToPlanType(plan.interval);
      return planType === currentSubscription.planType;
    });
    return current?.price ?? 0;
  }, [plans, currentSubscription]);

  if (!authReady || cpfCheckLoading || plansLoading) {
    return (
      <CheckoutShell
        step="payment"
        title="Carregando upgrade..."
        showSummary={false}
      
        showStepper={false}
        showLoginCta={false}
      >
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full w-1/2 bg-[var(--brand-accent)]/60 animate-pulse" />
        </div>
      </CheckoutShell>
    );
  }

  if (userId && !hasCpf) {
    return (
      <CheckoutShell
        step="payment"
        title="Informe seu CPF"
        subtitle="Precisamos dele para gerar a cobrança da diferença."
        showSummary={false}
      
        showStepper={false}
        showLoginCta={false}
      >
        <CpfGateForm
          userId={userId}
          onSaved={() => {
            setHasCpf(true);
          }}
        />
      </CheckoutShell>
    );
  }

  if (loadError || plansError) {
    return (
      <CheckoutShell
        step="payment"
        title="Upgrade indisponível"
        subtitle={loadError || plansError || undefined}
        showSummary={false}
      
        showStepper={false}
        showLoginCta={false}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/planos" })}
          className="brand-primary-button w-full py-3 rounded-2xl font-bold text-sm"
        >
          Ver planos
        </button>
      </CheckoutShell>
    );
  }

  if (step === "pay" && selectedPlan) {
    const diff =
      difference ??
      Math.max(0, Number((selectedPlan.price - currentPlanPrice).toFixed(2)));

    return (
      <CheckoutShell
        step="payment"
        title="Pagar diferença do upgrade"
        subtitle={`${planTypeLabel(currentSubscription!.planType)} → ${selectedPlan.name} · ${formatBrl(diff)}`}
        showSummary={false}
      
        showStepper={false}
        showLoginCta={false}
      >
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              setStep("select");
              setSelectedPlan(null);
            }}
            className="text-sm font-medium text-[var(--checkout-ink-2,#55647A)] hover:text-[var(--brand-accent)]"
          >
            ← Trocar plano
          </button>

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
                    ? "border-[var(--brand-accent)] bg-white"
                    : "border-[var(--checkout-line-strong,#CFC5B6)] bg-white"
                }`}
              >
                <button
                  type="button"
                  className="w-full text-left px-4 py-3.5"
                  onClick={() => setMethod(item.id)}
                >
                  <p className="text-sm font-semibold text-[var(--checkout-ink,#0F2846)]">
                    {item.title}
                  </p>
                  <p className="text-xs text-[var(--checkout-ink-2,#55647A)] mt-0.5">
                    {item.subtitle}
                  </p>
                </button>

                {open && item.id === "pix" ? (
                  <div className="px-4 pb-4">
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
                      onGenerate={() => startUpgrade("pix")}
                    />
                    {pixData ? (
                      <button
                        type="button"
                        disabled={verifying}
                        onClick={verifyPaymentNow}
                        className="mt-3 w-full rounded-2xl border border-[var(--checkout-line-strong,#CFC5B6)] py-2.5 text-sm font-semibold disabled:opacity-50"
                      >
                        {verifying ? "Verificando..." : "Já paguei · verificar"}
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {open && item.id === "credit_card" ? (
                  <div className="px-4 pb-4">
                    <CardPanel
                      value={card}
                      onChange={setCard}
                      loading={loading}
                      onSubmit={() => startUpgrade("credit_card", card)}
                    />
                  </div>
                ) : null}

                {open && item.id === "boleto" ? (
                  <div className="px-4 pb-4">
                    <BoletoPanel
                      boletoUrl={boletoUrl}
                      loading={loading}
                      verifying={verifying}
                      awaitingConfirmation={awaitingBoletoConfirmation}
                      onGenerate={() => startUpgrade("boleto")}
                      onVerifyPayment={verifyPaymentNow}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </CheckoutShell>
    );
  }

  return (
    <CheckoutShell
      step="plan"
      title="Faça upgrade do seu plano"
      subtitle={`Plano atual: ${planTypeLabel(currentSubscription!.planType)}. Você paga só a diferença e a vigência renova no ciclo novo.`}
      showSummary={false}
      bareContent
      fullWidth
      contentMaxWidthClassName="max-w-[720px]"
    
        showStepper={false}
        showLoginCta={false}
      >
      <div className="space-y-4 text-left">
        {upgradePlans.length === 0 ? (
          <div className="rounded-2xl border border-[var(--checkout-line-strong,#CFC5B6)] bg-white p-5 text-sm text-[var(--checkout-ink-2,#55647A)]">
            Você já está no plano mais alto disponível.
          </div>
        ) : (
          upgradePlans.map(({ plan, planType }) => {
            const diff = Number((plan.price - currentPlanPrice).toFixed(2));
            return (
              <button
                key={plan.originalId ?? plan.id}
                type="button"
                onClick={() => {
                  setSelectedPlan(plan);
                  setStep("pay");
                }}
                className="w-full rounded-2xl border border-[var(--checkout-line-strong,#CFC5B6)] bg-white p-5 text-left hover:border-[var(--brand-accent)] transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <p className="text-base font-semibold text-[var(--checkout-ink,#0F2846)]">
                      {plan.name}
                    </p>
                    <p className="text-sm text-[var(--checkout-ink-2,#55647A)]">
                      {planTypeLabel(planType)} · preço lista{" "}
                      {formatBrl(plan.price)}
                    </p>
                    <p className="text-sm font-medium text-[var(--checkout-ink,#0F2846)]">
                      Diferença agora: {formatBrl(Math.max(0, diff))}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-[var(--checkout-ink-2,#55647A)] shrink-0 mt-1" />
                </div>
              </button>
            );
          })
        )}
      </div>
    </CheckoutShell>
  );
}
