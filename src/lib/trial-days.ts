import { supabase } from "../lib/supabase";

const DEFAULT_TRIAL_DAYS = 7;
const MIN_TRIAL_DAYS = 1;
const MAX_TRIAL_DAYS = 365;

function coerceTrialDays(value: unknown): number | null {
  // Aceita number (ex.: 7) ou objeto { days: 7 }
  let raw: unknown = null;
  if (typeof value === "number") {
    raw = value;
  } else if (value && typeof value === "object" && "days" in (value as any)) {
    raw = (value as any).days;
  }

  const n = typeof raw === "string" ? Number(raw) : raw;
  if (!Number.isFinite(n)) return null;

  const days = Math.floor(n as number);
  if (days < MIN_TRIAL_DAYS || days > MAX_TRIAL_DAYS) return null;
  return days;
}

export async function getTrialDays(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", "trial_days")
      .single();

    if (error) {
      // PGRST116 = "Results contain 0 rows" (não existe config)
      if ((error as any).code === "PGRST116") return DEFAULT_TRIAL_DAYS;
      return DEFAULT_TRIAL_DAYS;
    }

    const coerced = coerceTrialDays(data?.value);
    return coerced ?? DEFAULT_TRIAL_DAYS;
  } catch {
    return DEFAULT_TRIAL_DAYS;
  }
}

