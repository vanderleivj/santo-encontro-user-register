import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

interface Plan {
  id: string;
  stripe_price_id: string;
  stripe_product_id: string;
  name: string;
  description: string | null;
  price: number;
  original_price?: number | null; // Preço original antes do desconto
  currency: string;
  interval:
    | "day"
    | "week"
    | "month"
    | "quarterly"
    | "semiannual"
    | "year"
    | "one_time";
  features: string[];
  is_active: boolean;
  created_at: string;
  /** Texto exibido abaixo do preço (ex: "por mês", "por ano"). Vem da API. */
  interval_label?: string | null;
}

export interface PlanConfig {
  id: string;
  originalId?: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number; // Preço original antes do desconto
  currency: string;
  interval: string | null;
  interval_count: number | null;
  /** Texto exibido abaixo do preço (ex: "por mês"). Vem da API (campo interval_label). */
  intervalLabel?: string | null;
  features: string[];
  isPopular?: boolean;
  isFree?: boolean;
  stripeProductId?: string;
  stripePriceId?: string;
}

/** Plano gratuito (trial) exibido na UI; `id` alinhado a usePayment (plan_type no banco). */
const SYNTHETIC_FREE_PLAN: PlanConfig = {
  id: "trialing",
  name: "Período de teste",
  description: "Experimente o app com acesso completo, sem cartão.",
  price: 0,
  currency: "BRL",
  interval: null,
  interval_count: null,
  intervalLabel: "sem compromisso",
  features: [
    "Acesso às funcionalidades durante o teste",
    "Sem cobrança no período gratuito",
    "Cancele quando quiser antes de assinar",
  ],
  isFree: true,
};

async function fetchShowFreePlan(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", "show_free_plan")
      .single();

    if (error) {
      // PGRST116 = chave não encontrada; oculta plano gratuito por padrão
      if ((error as any).code === "PGRST116") return false;
      return false;
    }

    const value = data?.value;
    if (typeof value === "boolean") return value;
    if (value && typeof value === "object" && "enabled" in value)
      return Boolean((value as Record<string, unknown>).enabled);
    return false;
  } catch {
    return false;
  }
}

export const usePlans = () => {
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError(null);

      const [{ data, error: fetchError }, showFreePlan] = await Promise.all([
        supabase
          .from("plans")
          .select("*")
          .eq("is_active", true)
          .order("price", { ascending: true }),
        fetchShowFreePlan(),
      ]);

      if (fetchError) {
        throw new Error(fetchError.message || "Erro ao buscar planos");
      }

      const convertedPlans =
        data?.map((plan: Plan) => ({
          id: plan.interval,
          originalId: plan.id,
          name: plan.name,
          description: plan.description || "",
          price: plan.price,
          originalPrice:
            plan.original_price && plan.original_price > plan.price
              ? plan.original_price
              : undefined,
          currency: plan.currency,
          interval: plan.interval === "one_time" ? null : plan.interval,
          interval_count: plan.interval === "one_time" ? null : 1,
          intervalLabel: plan.interval_label ?? "por mês",
          features: plan.features || [],
          isPopular: plan.features?.includes("popular") || false,
          isFree: plan.price === 0,
          stripeProductId: plan.stripe_product_id,
          stripePriceId: plan.stripe_price_id,
        })) || [];

      const paidPlans = convertedPlans.filter((p) => !p.isFree);
      const freePlansFromDb = convertedPlans.filter((p) => p.isFree);

      if (!showFreePlan) {
        setPlans(paidPlans);
        return;
      }

      const hasFreeFromDb = freePlansFromDb.length > 0;
      setPlans(
        hasFreeFromDb
          ? convertedPlans
          : [SYNTHETIC_FREE_PLAN, ...paidPlans]
      );
    } catch (err) {
      console.error("Erro ao buscar planos:", err);
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const refetch = () => {
    fetchPlans();
  };

  return {
    plans,
    loading,
    error,
    refetch,
  };
};
