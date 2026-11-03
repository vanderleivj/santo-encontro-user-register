import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { CheckoutShell } from "../../CheckoutShell";
import { TrustBadges } from "../../shared/TrustBadges";
import { CampaignBanner } from "../../shared/CampaignBanner";
import { useCheckoutStore } from "../../checkout-store";
import { PlanCard } from "./PlanCard";
import { usePlanCatalog, type PlanConfig } from "./usePlanCatalog";
import { toast } from "sonner";
import { supabase } from "../../../lib/supabase";
import { useBlackFriday } from "../../../hooks/useBlackFriday";
import { restoreSessionFromHash } from "../../shared/restore-session-from-hash";
import { resolveCheckoutDestination } from "../../shared/resolve-checkout-destination";
import { detectAppWebView } from "../../shared/app-webview";

function planSortWeight(plan: PlanConfig): number {
  if (plan.interval === "year" || plan.interval === "yearly") return 0;
  if (plan.interval === "semiannual") return 1;
  return 2;
}

function yearlySavingsHint(
  plans: PlanConfig[],
  plan: PlanConfig
): string | null {
  if (!(plan.interval === "year" || plan.interval === "yearly")) return null;
  const semiannual = plans.find((item) => item.interval === "semiannual");
  if (!semiannual) return null;
  const yearlyEquivalent = semiannual.price * 2;
  const saved = yearlyEquivalent - plan.price;
  if (saved <= 0) return null;
  const formatted = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(saved);
  return `Economize ${formatted} por ano em relação ao semestral`;
}

export function PlanModule() {
  const navigate = useNavigate();
  const { plans, loading, error, refetch } = usePlanCatalog();
  const { config, campaignActive } = useBlackFriday();
  const selectedPlan = useCheckoutStore((state) => state.selectedPlan);
  const setSelectedPlan = useCheckoutStore((state) => state.setSelectedPlan);
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(
    selectedPlan?.originalId ?? selectedPlan?.id ?? null
  );
  const [continuing, setContinuing] = useState(false);

  const paidPlans = useMemo(() => {
    const sorted = plans.slice().sort((a, b) => {
      if (Boolean(a.isFree) !== Boolean(b.isFree)) {
        return a.isFree ? 1 : -1;
      }
      return planSortWeight(a) - planSortWeight(b);
    });

    const hasPopular = sorted.some((plan) => plan.isPopular);
    if (hasPopular) return sorted;

    return sorted.map((plan) =>
      plan.interval === "year" || plan.interval === "yearly"
        ? { ...plan, isPopular: true }
        : plan
    );
  }, [plans]);

  useEffect(() => {
    restoreSessionFromHash().catch((err) =>
      console.warn("Erro ao restaurar sessão no /planos:", err)
    );
  }, []);

  useEffect(() => {
    if (!paidPlans.length) return;
    if (localSelectedId) return;
    const popular =
      paidPlans.find((plan) => plan.isPopular) ||
      paidPlans.find(
        (plan) => plan.interval === "year" || plan.interval === "yearly"
      ) ||
      paidPlans[0];
    setLocalSelectedId(popular.originalId ?? popular.id);
  }, [paidPlans, localSelectedId]);

  const current =
    paidPlans.find(
      (plan) => (plan.originalId ?? plan.id) === localSelectedId
    ) ?? null;

  const handleContinue = async () => {
    if (!current || continuing) return;
    setContinuing(true);
    setSelectedPlan(current);

    try {
      await restoreSessionFromHash();
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      if (!userId) {
        navigate({ to: "/conta" });
        return;
      }

      const store = useCheckoutStore.getState();
      store.bindCheckoutOwner(userId);
      store.setSelectedPlan(current);
      store.setAccountCompleted(true);

      const resolved = await resolveCheckoutDestination({
        userId,
        hasSelectedPlan: true,
      });

      if (resolved.profileComplete) {
        store.setProfileCompleted(true);
      }

      if (resolved.hasActiveAsaasPlan) {
        toast.message(
          resolved.message ??
            "Você já tem uma assinatura ativa. Veja os detalhes do seu plano."
        );
        navigate({
          to: "/conta/plano",
          search: detectAppWebView()
            ? { app: "1", embed: undefined }
            : { app: undefined, embed: undefined },
        });
        return;
      }

      if (
        resolved.destination === "/pagamento" ||
        resolved.destination === "/sobre-voce" ||
        resolved.destination === "/planos"
      ) {
        navigate({ to: resolved.destination });
        return;
      }

      navigate({ to: "/conta" });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível continuar"
      );
    } finally {
      setContinuing(false);
    }
  };

  return (
    <CheckoutShell
      step="plan"
      title="Escolha seu plano"
      subtitle={
        config.brand_subtitle ||
        "Comunidade, formação e encontros para católicos que buscam viver um namoro casto. Cancele quando quiser."
      }
      showSummary={false}
      fullWidth
      bareContent
      showSupport={false}
      contentMaxWidthClassName="max-w-[920px]"
    >
      <div className="space-y-10">
        <CampaignBanner />

        {loading ? (
          <div className="h-2 rounded-full bg-[var(--checkout-sunken,#F4EFE7)] overflow-hidden max-w-md mx-auto">
            <div className="h-full w-1/2 bg-[var(--brand-accent)]/60 animate-pulse" />
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl bg-red-50 text-red-700 text-sm p-4 space-y-2 max-w-lg mx-auto">
            <p>{error}</p>
            <button
              type="button"
              onClick={refetch}
              className="font-semibold underline"
            >
              Tentar novamente
            </button>
          </div>
        ) : null}

        <div className="grid sm:grid-cols-2 gap-6 items-start max-w-[880px] mx-auto">
          {paidPlans.map((plan) => {
            const key = plan.originalId ?? plan.id;
            return (
              <PlanCard
                key={key}
                plan={plan}
                selected={localSelectedId === key}
                onSelect={() => setLocalSelectedId(key)}
                savingsHint={yearlySavingsHint(paidPlans, plan)}
                popularLabel={
                  campaignActive
                    ? config.banner_text || "Destaque"
                    : "Mais escolhido"
                }
              />
            );
          })}
        </div>

        <div className="max-w-[400px] mx-auto space-y-3 text-center">
          <button
            type="button"
            disabled={!current || continuing}
            onClick={() => {
              void handleContinue();
            }}
            className="brand-primary-button w-full py-3.5 rounded-xl font-bold text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            Continuar
            {current ? ` · ${current.name}` : ""}
            <ArrowRight className="w-4 h-4" aria-hidden />
          </button>
          <p className="text-[13px] text-[var(--checkout-ink-3,#8493A6)]">
            Você só informa o pagamento na última etapa
          </p>
        </div>

        <TrustBadges />
      </div>
    </CheckoutShell>
  );
}
