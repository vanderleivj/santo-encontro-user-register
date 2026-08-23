import { Check, PiggyBank } from "lucide-react";
import type { PlanConfig } from "../../../hooks/usePlans";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

interface PlanCardProps {
  readonly plan: PlanConfig;
  readonly selected: boolean;
  readonly onSelect: () => void;
  readonly savingsHint?: string | null;
  readonly popularLabel?: string;
}

export function PlanCard({
  plan,
  selected,
  onSelect,
  savingsHint,
  popularLabel = "Mais escolhido",
}: PlanCardProps) {
  const monthlyHint =
    plan.interval === "year" || plan.interval === "yearly"
      ? `${formatCurrency(plan.price / 12)} por mês`
      : plan.interval === "semiannual"
        ? `${formatCurrency(plan.price / 6)} por mês`
        : null;

  const intervalSuffix =
    plan.intervalLabel ||
    (plan.interval === "year" || plan.interval === "yearly"
      ? "ano"
      : plan.interval === "semiannual"
        ? "semestre"
        : "mês");

  const [reais, cents] = plan.price.toFixed(2).split(".");

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative w-full text-left rounded-2xl border bg-white p-6 transition-all ${
        selected
          ? "border-2 border-[var(--brand-accent)] shadow-[0_8px_24px_-6px_var(--layout-shadow)]"
          : "border border-[var(--checkout-line-strong,#CFC5B6)] hover:border-[var(--checkout-ink-3)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={`w-[22px] h-[22px] rounded-full border flex items-center justify-center shrink-0 ${
              selected
                ? "border-[var(--brand-accent)] bg-[var(--brand-accent)]"
                : "border-[1.5px] border-[var(--checkout-line-strong,#CFC5B6)] bg-white"
            }`}
          >
            {selected ? (
              <span className="w-2 h-2 rounded-full bg-white" />
            ) : null}
          </span>
          <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--checkout-ink,#0F2846)] truncate">
            {plan.name}
          </h3>
        </div>
        {plan.isPopular ? (
          <span className="shrink-0 px-2 py-0.5 rounded-full bg-[var(--checkout-primary-soft,#FFF1E7)] text-[var(--brand-accent-hover,#9A3412)] text-xs font-bold">
            {popularLabel}
          </span>
        ) : null}
      </div>

      <div className="flex items-end gap-1 mb-3 flex-wrap">
        <span className="text-[19px] font-semibold text-[var(--checkout-ink,#0F2846)] leading-[1.35] mb-1">
          R$
        </span>
        <span className="font-[family-name:var(--font-display)] text-[42px] font-semibold text-[var(--checkout-ink,#0F2846)] tabular-nums leading-none">
          {reais},{cents}
        </span>
        <span className="text-[15px] text-[var(--checkout-ink-2,#55647A)] leading-[2] mb-0.5">
          /{intervalSuffix}
        </span>
      </div>

      {monthlyHint ? (
        <p className="text-sm text-[var(--checkout-ink-2,#55647A)] mb-4">
          {monthlyHint}
        </p>
      ) : null}

      {savingsHint ? (
        <div className="mb-4 rounded-lg bg-[var(--checkout-success-soft,#ECFDF3)] text-[var(--checkout-success,#15803D)] text-[13px] font-medium px-3 py-2.5 flex items-start gap-2">
          <PiggyBank className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
          <span className="leading-[1.4]">{savingsHint}</span>
        </div>
      ) : null}

      {plan.features.length > 0 ? (
        <>
          <div className="h-px w-full bg-[var(--checkout-line,#E6DFD4)] mb-4" />
          <ul className="space-y-2.5">
            {plan.features
              .filter(
                (feature) =>
                  feature !== "popular" && feature !== "black_friday"
              )
              .slice(0, 6)
              .map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2 text-sm text-[var(--checkout-ink,#0F2846)]"
                >
                  <Check className="w-4 h-4 text-[var(--brand-accent)] shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
          </ul>
        </>
      ) : null}
    </button>
  );
}
