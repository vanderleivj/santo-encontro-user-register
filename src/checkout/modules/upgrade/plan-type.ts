export type AsaasPlanType =
  | "monthly"
  | "quarterly"
  | "semiannual"
  | "yearly";

export function intervalToPlanType(
  interval: string | null | undefined
): AsaasPlanType | null {
  if (!interval) return null;
  if (interval === "month" || interval === "monthly") return "monthly";
  if (interval === "year" || interval === "yearly") return "yearly";
  if (interval === "quarterly") return "quarterly";
  if (interval === "semiannual") return "semiannual";
  return null;
}

export function planTypeRank(planType: string): number {
  const rankMap: Record<string, number> = {
    monthly: 1,
    quarterly: 3,
    semiannual: 6,
    yearly: 12,
  };
  return rankMap[planType] ?? 0;
}

export function isPlanUpgrade(
  fromPlanType: string,
  toPlanType: string
): boolean {
  return planTypeRank(toPlanType) > planTypeRank(fromPlanType);
}

export function planTypeLabel(planType: string): string {
  const labels: Record<string, string> = {
    monthly: "Mensal",
    quarterly: "Trimestral",
    semiannual: "Semestral",
    yearly: "Anual",
  };
  return labels[planType] ?? planType;
}

export function formatBrl(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
