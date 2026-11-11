import { Check } from "lucide-react";
import type { CheckoutStep } from "./checkout-store";

const STEPS: { id: CheckoutStep; label: string }[] = [
  { id: "plan", label: "Plano" },
  { id: "account", label: "Conta" },
  { id: "payment", label: "Pagamento" },
];

interface CheckoutStepperProps {
  readonly current: CheckoutStep;
  readonly align?: "start" | "center";
}

function stepIndex(step: CheckoutStep): number {
  return STEPS.findIndex((item) => item.id === step);
}

export function CheckoutStepper({
  current,
  align = "start",
}: CheckoutStepperProps) {
  const currentIndex = stepIndex(current);

  return (
    <nav
      aria-label="Progresso do checkout"
      className={`w-full flex items-center ${
        align === "center" ? "justify-center" : "justify-start"
      }`}
    >
      <ol className="flex items-center gap-3">
        {STEPS.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;

          return (
            <li key={step.id} className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    done
                      ? "bg-[var(--checkout-success,#15803D)] text-white"
                      : active
                        ? "bg-[var(--button-primary-bg,var(--brand-accent))] text-[var(--button-primary-text,#fff)]"
                        : "bg-[color-mix(in_srgb,var(--layout-text-primary,#F6F1E7)_12%,transparent)] text-[var(--layout-text-secondary,#C9C2B6)]"
                  }`}
                >
                  {done ? (
                    <Check className="w-3.5 h-3.5" aria-hidden />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={`text-sm whitespace-nowrap ${
                    active
                      ? "font-semibold text-[var(--layout-text-primary,var(--checkout-ink,#0F2846))]"
                      : done
                        ? "font-normal text-[var(--layout-text-secondary,var(--checkout-ink-2,#55647A))]"
                        : "font-normal text-[var(--layout-text-secondary,var(--checkout-ink-3,#8493A6))]"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 ? (
                <div
                  className="w-12 h-px bg-[color-mix(in_srgb,var(--layout-text-primary,#F6F1E7)_25%,transparent)] shrink-0"
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
