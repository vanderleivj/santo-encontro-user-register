import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ChevronRight,
  MessageCircle,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Tag,
  X,
} from "lucide-react";
import { useCheckoutStore } from "./checkout-store";
import { mapPlanIntervalToPlanType, previewCoupon } from "../lib/coupons";

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
  readonly showCoupon?: boolean;
  readonly className?: string;
}

function CouponField() {
  const selectedPlan = useCheckoutStore((state) => state.selectedPlan);
  const couponInput = useCheckoutStore((state) => state.couponInput);
  const appliedCoupon = useCheckoutStore((state) => state.appliedCoupon);
  const setCouponInput = useCheckoutStore((state) => state.setCouponInput);
  const setAppliedCoupon = useCheckoutStore((state) => state.setAppliedCoupon);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!selectedPlan || selectedPlan.isFree || selectedPlan.price <= 0) {
    return null;
  }

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setError("Informe um código de cupom.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const preview = await previewCoupon(
        code,
        mapPlanIntervalToPlanType(selectedPlan.interval),
        selectedPlan.price
      );
      if (
        !preview.ok ||
        !preview.code ||
        preview.discountAmount === undefined ||
        preview.finalAmount === undefined ||
        preview.originalAmount === undefined
      ) {
        setAppliedCoupon(null);
        setError(preview.error || "Cupom inválido.");
        return;
      }

      setAppliedCoupon({
        code: preview.code,
        discountType: preview.discountType || "",
        discountValue: preview.discountValue ?? 0,
        discountAmount: preview.discountAmount,
        originalAmount: preview.originalAmount,
        finalAmount: preview.finalAmount,
      });
      setCouponInput(preview.code);
    } catch {
      setAppliedCoupon(null);
      setError("Não foi possível validar o cupom.");
    } finally {
      setLoading(false);
    }
  };

  if (appliedCoupon) {
    return (
      <div className="rounded-lg border border-[var(--checkout-line,#E6DFD4)] px-3 py-2.5 flex items-center justify-between gap-2">
        <div className="min-w-0 flex items-center gap-2">
          <Tag
            className="w-3.5 h-3.5 text-[var(--checkout-success,#15803D)] shrink-0"
            aria-hidden
          />
          <span className="text-sm font-medium text-[var(--checkout-ink,#0F2846)] truncate">
            {appliedCoupon.code}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setAppliedCoupon(null);
            setError(null);
          }}
          className="text-[var(--checkout-ink-2,#55647A)] hover:text-[var(--checkout-ink,#0F2846)]"
          aria-label="Remover cupom"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <input
          value={couponInput}
          onChange={(event) => {
            setCouponInput(event.target.value.toUpperCase());
            setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void applyCoupon();
            }
          }}
          placeholder="Cupom de desconto"
          className="min-w-0 flex-1 rounded-lg border border-[var(--checkout-line-strong,#CFC5B6)] bg-white px-3 py-2 text-sm text-[var(--checkout-ink,#0F2846)] placeholder:text-[var(--checkout-ink-2,#55647A)]"
        />
        <button
          type="button"
          onClick={() => void applyCoupon()}
          disabled={loading}
          className="shrink-0 rounded-lg border border-[var(--checkout-line-strong,#CFC5B6)] px-3 py-2 text-sm font-medium text-[var(--checkout-ink,#0F2846)] hover:border-[var(--brand-accent)] disabled:opacity-50"
        >
          {loading ? "..." : "Aplicar"}
        </button>
      </div>
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : null}
    </div>
  );
}

export function OrderSummary({
  showChangePlan = true,
  showCoupon = false,
  className = "",
}: OrderSummaryProps) {
  const navigate = useNavigate();
  const selectedPlan = useCheckoutStore((state) => state.selectedPlan);
  const appliedCoupon = useCheckoutStore((state) => state.appliedCoupon);

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
  const couponDiscount = appliedCoupon?.discountAmount ?? 0;
  const totalToday = appliedCoupon
    ? appliedCoupon.finalAmount
    : selectedPlan.price;
  const renewalAmount = selectedPlan.price;

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

          {appliedCoupon ? (
            <div className="flex justify-between gap-3 items-center">
              <span className="text-[var(--checkout-ink-2,#55647A)]">
                Cupom {appliedCoupon.code}
              </span>
              <span className="font-medium text-[var(--checkout-success,#15803D)] tabular-nums shrink-0">
                − {formatCurrency(couponDiscount)}
              </span>
            </div>
          ) : null}
        </div>

        {showCoupon ? <CouponField /> : null}

        {appliedCoupon ? (
          <p className="text-xs leading-[1.45] text-[var(--checkout-ink-2,#55647A)]">
            Cupom válido somente na primeira cobrança.
          </p>
        ) : null}

        <div className="h-px w-full bg-[var(--checkout-line,#E6DFD4)]" />

        <div className="flex justify-between gap-3 items-center">
          <span className="text-[15px] font-semibold text-[var(--checkout-ink,#0F2846)]">
            Total hoje
          </span>
          <span className="text-lg font-bold text-[var(--checkout-ink,#0F2846)] tabular-nums">
            {formatCurrency(totalToday)}
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
              por {formatCurrency(renewalAmount)}. Você pode cancelar a
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
