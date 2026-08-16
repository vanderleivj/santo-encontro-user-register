import { supabase } from "./supabase";

export interface CouponPreview {
  ok: boolean;
  error?: string;
  code?: string;
  couponId?: string;
  discountType?: string;
  discountValue?: number;
  discountAmount?: number;
  originalAmount?: number;
  finalAmount?: number;
}

export function mapPlanIntervalToPlanType(
  interval: string | null | undefined
): string {
  const raw = interval === "one_time" || !interval ? "monthly" : interval;
  if (raw === "month") return "monthly";
  if (raw === "year") return "yearly";
  return raw;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function previewCoupon(
  code: string,
  planType: string,
  originalAmount: number
): Promise<CouponPreview> {
  const { data, error } = await supabase.rpc("preview_coupon", {
    p_code: code,
    p_plan_type: planType,
    p_original_amount: originalAmount,
  });

  if (error) {
    return {
      ok: false,
      error: error.message || "Não foi possível validar o cupom.",
    };
  }

  const record = asRecord(data);
  if (!record) {
    return { ok: false, error: "Não foi possível validar o cupom." };
  }

  if (record.ok !== true) {
    return {
      ok: false,
      error: asString(record.error) || "Cupom inválido.",
    };
  }

  return {
    ok: true,
    code: asString(record.code),
    couponId: asString(record.coupon_id),
    discountType: asString(record.discount_type),
    discountValue: asNumber(record.discount_value),
    discountAmount: asNumber(record.discount_amount),
    originalAmount: asNumber(record.original_amount),
    finalAmount: asNumber(record.final_amount),
  };
}
