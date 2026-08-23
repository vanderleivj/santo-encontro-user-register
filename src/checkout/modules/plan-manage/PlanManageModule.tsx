import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { CheckoutShell } from "../../CheckoutShell";
import {
  APP_WEBVIEW_SEARCH,
  useIsAppWebView,
} from "../../shared/app-webview";
import { restoreSessionFromHash } from "../../shared/restore-session-from-hash";
import { cancelAsaasSubscription } from "../../../lib/api/subscriptions";
import { supabase } from "../../../lib/supabase";
import {
  isPlanUpgrade,
  planTypeLabel,
  type AsaasPlanType,
} from "../upgrade/plan-type";

interface ManagedSubscription {
  asaasSubscriptionId: string;
  planType: AsaasPlanType;
  status: string;
  startDate: string | null;
  endDate: string | null;
  cancelAtPeriodEnd: boolean;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: "Ativo",
    trialing: "Em teste",
    past_due: "Pagamento pendente",
    canceled: "Cancelado",
    incomplete: "Incompleto",
    unpaid: "Não pago",
    paused: "Pausado",
  };
  return labels[status] ?? status;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function PlanManageModule() {
  const navigate = useNavigate();
  const isAppWebView = useIsAppWebView();
  const [authReady, setAuthReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<ManagedSubscription | null>(
    null
  );
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [cancelScheduled, setCancelScheduled] = useState(false);
  const [canceledMessage, setCanceledMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        await restoreSessionFromHash();
      } catch (error) {
        console.warn("Erro ao restaurar sessão no /conta/plano:", error);
      }

      if (cancelled) return;

      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) {
        navigate({
          to: "/entrar",
          search: {
            next: isAppWebView ? "/conta/plano?app=1" : "/conta/plano",
            email: undefined,
          },
        });
        return;
      }

      const { data: subscriptionRow } = await supabase
        .from("subscriptions")
        .select(
          "plan_type, status, start_date, end_date, provider, asaas_subscription_id, asaas_customer_id, cancel_at_period_end"
        )
        .eq("user_id", data.session.user.id)
        .eq("provider", "asaas")
        .not("asaas_subscription_id", "is", null)
        .in("status", ["active", "trialing", "past_due", "paused"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      const planType = String(subscriptionRow?.plan_type ?? "");
      if (
        !subscriptionRow?.asaas_subscription_id ||
        !["monthly", "quarterly", "semiannual", "yearly"].includes(planType)
      ) {
        setLoadError("Nenhuma assinatura Asaas ativa encontrada.");
        setAuthReady(true);
        return;
      }

      const cancelAtPeriodEnd = Boolean(subscriptionRow.cancel_at_period_end);
      setSubscription({
        asaasSubscriptionId: subscriptionRow.asaas_subscription_id,
        planType: planType as AsaasPlanType,
        status: String(subscriptionRow.status ?? ""),
        startDate: subscriptionRow.start_date ?? null,
        endDate: subscriptionRow.end_date ?? null,
        cancelAtPeriodEnd,
      });
      setCancelScheduled(cancelAtPeriodEnd);
      if (cancelAtPeriodEnd) {
        setCanceledMessage(
          "Assinatura Asaas cancelada; acesso permanece até o fim do período"
        );
      }
      setAuthReady(true);
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [isAppWebView, navigate]);

  const canUpgrade = useMemo(() => {
    if (!subscription) return false;
    return (["monthly", "quarterly", "semiannual", "yearly"] as const).some(
      (planType) => isPlanUpgrade(subscription.planType, planType)
    );
  }, [subscription]);

  const handleCancel = async () => {
    if (!subscription) return;

    setCanceling(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Faça login novamente para cancelar a assinatura.");
      }

      const result = await cancelAsaasSubscription(
        session.access_token,
        subscription.asaasSubscriptionId,
        true
      );

      setCanceledMessage(result.message);
      setConfirmCancel(false);
      setCancelScheduled(true);
      toast.success(result.message);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao cancelar assinatura"
      );
    } finally {
      setCanceling(false);
    }
  };

  if (!authReady) {
    return (
      <CheckoutShell
        step="payment"
        title="Carregando sua assinatura..."
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

  if (loadError || !subscription) {
    return (
      <CheckoutShell
        step="payment"
        title="Assinatura indisponível"
        subtitle={loadError || "Não encontramos uma assinatura Asaas ativa."}
        showSummary={false}
        showStepper={false}
        showLoginCta={false}
      >
        <Link
          to="/planos"
          className="brand-primary-button inline-flex w-full items-center justify-center py-3 rounded-2xl font-bold text-sm"
        >
          Ver planos
        </Link>
      </CheckoutShell>
    );
  }

  return (
    <CheckoutShell
      step="payment"
      title="Sua assinatura"
      subtitle="Veja os dados do plano e gerencie upgrade ou cancelamento."
      showSummary={false}
      showStepper={false}
      showLoginCta={false}
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-[var(--checkout-line-strong,#CFC5B6)] bg-white p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-lg font-semibold text-[var(--checkout-ink,#0F2846)]">
              Plano {planTypeLabel(subscription.planType)}
            </p>
            <span className="rounded-full bg-[var(--checkout-sunken,#F4EFE7)] px-3 py-1 text-xs font-semibold text-[var(--checkout-ink,#0F2846)]">
              {cancelScheduled
                ? "Cancelamento agendado"
                : statusLabel(subscription.status)}
            </span>
          </div>
          <div className="space-y-1 text-sm text-[var(--checkout-ink-2,#55647A)]">
            <p>Início: {formatDate(subscription.startDate)}</p>
            <p>Próxima cobrança / vigência: {formatDate(subscription.endDate)}</p>
            <p>Pagamento: Asaas</p>
          </div>
        </div>

        {canceledMessage ? (
          <div className="rounded-2xl bg-amber-50 text-amber-900 text-sm p-4">
            {canceledMessage}. Seu acesso permanece até{" "}
            {formatDate(subscription.endDate)}.
          </div>
        ) : null}

        {!cancelScheduled && canUpgrade ? (
          <Link
            to="/conta/upgrade"
            search={
              isAppWebView
                ? APP_WEBVIEW_SEARCH
                : { app: undefined, embed: undefined }
            }
            className="brand-primary-button inline-flex w-full items-center justify-center py-3 rounded-2xl font-bold text-sm"
          >
            Fazer upgrade do plano
          </Link>
        ) : null}

        {!cancelScheduled ? (
          <div className="space-y-3">
            {!confirmCancel ? (
              <button
                type="button"
                onClick={() => setConfirmCancel(true)}
                className="w-full rounded-2xl border border-red-200 bg-white py-3 text-sm font-semibold text-red-700 hover:bg-red-50"
              >
                Cancelar assinatura
              </button>
            ) : (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 space-y-3">
                <p className="text-sm text-red-800">
                  Confirma o cancelamento? A recorrência no Asaas para de cobrar
                  e você mantém o acesso até o fim do período atual (
                  {formatDate(subscription.endDate)}).
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={canceling}
                    onClick={() => setConfirmCancel(false)}
                    className="rounded-2xl border border-[var(--checkout-line-strong,#CFC5B6)] bg-white py-2.5 text-sm font-semibold disabled:opacity-50"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    disabled={canceling}
                    onClick={() => void handleCancel()}
                    className="rounded-2xl bg-red-700 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {canceling ? "Cancelando..." : "Confirmar cancelamento"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </CheckoutShell>
  );
}
