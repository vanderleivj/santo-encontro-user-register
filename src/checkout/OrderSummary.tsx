import { useNavigate } from "@tanstack/react-router";
import {
  ChevronRight,
  MessageCircle,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useCheckoutStore } from "./checkout-store";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function renewalDateLabel(interval: string | null | undefined): string {
  const date = new Date();
  if (interval === "year" || interval === "yearly") {
    date.setFullYear(date.getFullYear() + 1);
  } else if (interval === "semiannual") {
    date.setMonth(date.getMonth() + 6);
  } else {
    date.setMonth(date.getMonth() + 1);
  }
  return date.toLocaleDateString("pt-BR");
}

function planPeriodLabel(interval: string | null | undefined): string {
  if (interval === "year" || interval === "yearly") return "12 meses";
  if (interval === "semiannual") return "6 meses";
  if (interval === "quarterly") return "3 meses";
  return "1 mês";
}

const SUPPORT_WHATSAPP_URL = "https://wa.me/5532999814832";

const SECURITY_ITEMS = [
  "Pagamento processado por instituição autorizada pelo Banco Central",
  "Conexão criptografada de ponta a ponta",
  "Cancele a renovação quando quiser, direto no app",
] as const;

interface OrderSummaryProps {
  readonly showChangePlan?: boolean;
  readonly className?: string;
}

export function OrderSummary({
  showChangePlan = true,
  className = "",
}: OrderSummaryProps) {
  const navigate = useNavigate();
  const selectedPlan = useCheckoutStore((state) => state.selectedPlan);

  if (!selectedPlan) {
    return (
      <aside className={`w-full lg:w-[380px] space-y-4 ${className}`}>
        <div className="rounded-2xl border border-[var(--checkout-line-strong,#CFC5B6)] bg-white p-5">
          <p className="text-sm text-[var(--checkout-ink-2,#55647A)]">
            Nenhum plano selecionado.
          </p>
          <button
            type="button"
            onClick={() => navigate({ to: "/planos" })}
            className="mt-3 text-sm font-medium text-[var(--brand-accent-hover,#9A3412)] hover:underline"
          >
            Escolher plano
          </button>
        </div>
      </aside>
    );
  }

  const original = selectedPlan.originalPrice ?? null;
  const hasDiscount =
    original !== null && original > selectedPlan.price && selectedPlan.price > 0;
  const discountAmount = hasDiscount ? original - selectedPlan.price : 0;
  const discountPercent = hasDiscount
    ? Math.round((discountAmount / original) * 100)
    : 0;
  const periodLabel =
    selectedPlan.intervalLabel || planPeriodLabel(selectedPlan.interval);

  return (
    <aside className={`w-full lg:w-[380px] space-y-4 ${className}`}>
      <div className="rounded-2xl border border-[var(--checkout-line-strong,#CFC5B6)] bg-white p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <ReceiptText
              className="w-[17px] h-[17px] text-[var(--checkout-ink-2,#55647A)] shrink-0"
              aria-hidden
            />
            <h2 className="text-sm font-semibold text-[var(--checkout-ink,#0F2846)] truncate">
              Resumo do pedido
            </h2>
          </div>
          {showChangePlan ? (
            <button
              type="button"
              onClick={() => navigate({ to: "/planos" })}
              className="inline-flex items-center gap-0.5 text-[13px] font-medium text-[var(--brand-accent-hover,#9A3412)] hover:underline shrink-0"
            >
              Trocar
              <ChevronRight className="w-[15px] h-[15px]" aria-hidden />
            </button>
          ) : null}
        </div>

        <div className="h-px w-full bg-[var(--checkout-line,#E6DFD4)]" />

        <div className="space-y-3 text-sm">
          <div className="flex justify-between gap-3 items-center">
            <span className="text-[var(--checkout-ink-2,#55647A)]">
              {selectedPlan.name} · {periodLabel}
            </span>
            <span className="font-medium text-[var(--checkout-ink,#0F2846)] tabular-nums shrink-0">
              {formatCurrency(hasDiscount ? original : selectedPlan.price)}
            </span>
          </div>

          {hasDiscount ? (
            <div className="flex justify-between gap-3 items-center">
              <span className="text-[var(--checkout-ink-2,#55647A)]">
                Desconto de lançamento ({discountPercent}%)
              </span>
              <span className="font-medium text-[var(--checkout-success,#15803D)] tabular-nums shrink-0">
                − {formatCurrency(discountAmount)}
              </span>
            </div>
          ) : null}
        </div>

        <div className="h-px w-full bg-[var(--checkout-line,#E6DFD4)]" />

        <div className="flex justify-between gap-3 items-center">
          <span className="text-[15px] font-semibold text-[var(--checkout-ink,#0F2846)]">
            Total hoje
          </span>
          <span className="text-lg font-bold text-[var(--checkout-ink,#0F2846)] tabular-nums">
            {formatCurrency(selectedPlan.price)}
          </span>
        </div>

        {!selectedPlan.isFree && selectedPlan.price > 0 ? (
          <div className="rounded-lg bg-[var(--checkout-sunken,#F4EFE7)] px-3 py-2.5 flex items-start gap-2">
            <RefreshCw
              className="w-3.5 h-3.5 text-[var(--checkout-ink-2,#55647A)] shrink-0 mt-0.5"
              aria-hidden
            />
            <p className="text-xs leading-[1.45] text-[var(--checkout-ink-2,#55647A)]">
              Renova automaticamente em {renewalDateLabel(selectedPlan.interval)}{" "}
              por {formatCurrency(selectedPlan.price)}. Você pode cancelar a
              qualquer momento pelo app.
            </p>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-[var(--checkout-line-strong,#CFC5B6)] bg-white p-5 space-y-3">
        <h3 className="text-sm font-semibold text-[var(--checkout-ink,#0F2846)]">
          Compra protegida
        </h3>
        <ul className="space-y-3">
          {SECURITY_ITEMS.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <ShieldCheck
                className="w-[15px] h-[15px] text-[var(--checkout-success,#15803D)] shrink-0 mt-0.5"
                aria-hidden
              />
              <span className="text-[13px] leading-normal text-[var(--checkout-ink-2,#55647A)]">
                {item}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <a
        href={SUPPORT_WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-2xl bg-[var(--checkout-sunken,#F4EFE7)] p-4 flex items-center gap-3 hover:opacity-90 transition-opacity"
      >
        <span className="w-[38px] h-[38px] rounded-full bg-white flex items-center justify-center shrink-0">
          <MessageCircle
            className="w-[18px] h-[18px] text-[var(--checkout-ink-2,#55647A)]"
            aria-hidden
          />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-[var(--checkout-ink,#0F2846)]">
            Travou em alguma etapa?
          </span>
          <span className="block text-[13px] text-[var(--brand-accent-hover,#9A3412)]">
            Falar com o suporte no WhatsApp
          </span>
        </span>
      </a>
    </aside>
  );
}
