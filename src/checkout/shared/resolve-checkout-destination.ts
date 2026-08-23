import { supabase } from "../../lib/supabase";

export type CheckoutDestination =
  | "/conta/plano"
  | "/conta/upgrade"
  | "/sobre-voce"
  | "/pagamento"
  | "/planos";

export type ExistingProfileRow = {
  gender: string | null;
  age: number | null;
  has_children: boolean | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  married_in_church: boolean | null;
  lives_chastity: boolean | null;
  is_catholic: boolean | null;
};

export function isCheckoutProfileComplete(
  profile: ExistingProfileRow | null | undefined
): boolean {
  if (!profile) return false;
  return Boolean(
    profile.gender &&
      profile.address &&
      profile.city &&
      profile.state &&
      profile.zip_code &&
      String(profile.zip_code).replace(/\D/g, "").length === 8 &&
      typeof profile.age === "number" &&
      profile.age >= 18 &&
      profile.has_children !== null &&
      profile.married_in_church !== null &&
      profile.lives_chastity === true &&
      profile.is_catholic === true
  );
}

export function subscriptionGrantsCheckoutAccess(subscription: {
  status: string;
  end_date?: string | null;
  current_period_end?: string | null;
}): boolean {
  const status = subscription.status.toLowerCase();
  if (status !== "active" && status !== "trialing") return false;
  const accessUntil =
    subscription.current_period_end || subscription.end_date || null;
  if (!accessUntil) return true;
  return new Date(accessUntil).getTime() > Date.now();
}

export function decideCheckoutDestination(options: {
  hasActiveAsaasPlan: boolean;
  profileComplete: boolean;
  hasSelectedPlan: boolean;
  preferredNext?: string;
}): {
  destination: CheckoutDestination;
  profileComplete: boolean;
  hasActiveAsaasPlan: boolean;
  message?: string;
} {
  const preferred = options.preferredNext;
  const wantsUpgrade = Boolean(preferred?.startsWith("/conta/upgrade"));
  const wantsPlano = Boolean(preferred?.startsWith("/conta/plano"));

  if (options.hasActiveAsaasPlan) {
    if (wantsUpgrade) {
      return {
        destination: "/conta/upgrade",
        profileComplete: true,
        hasActiveAsaasPlan: true,
      };
    }

    return {
      destination: "/conta/plano",
      profileComplete: true,
      hasActiveAsaasPlan: true,
      message:
        wantsPlano || !preferred
          ? "Você já tem uma assinatura ativa. Veja os detalhes do seu plano."
          : undefined,
    };
  }

  if (!options.profileComplete) {
    return {
      destination: options.hasSelectedPlan ? "/sobre-voce" : "/planos",
      profileComplete: false,
      hasActiveAsaasPlan: false,
    };
  }

  if (options.hasSelectedPlan) {
    return {
      destination: "/pagamento",
      profileComplete: true,
      hasActiveAsaasPlan: false,
    };
  }

  return {
    destination: "/planos",
    profileComplete: true,
    hasActiveAsaasPlan: false,
  };
}

async function hasActiveAsaasSubscription(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("subscriptions")
    .select("id, status, end_date, current_period_end, asaas_subscription_id")
    .eq("user_id", userId)
    .eq("provider", "asaas")
    .not("asaas_subscription_id", "is", null)
    .in("status", ["active", "trialing"])
    .order("updated_at", { ascending: false })
    .limit(5);

  return (data ?? []).some((subscription) =>
    subscriptionGrantsCheckoutAccess(subscription)
  );
}

export async function resolveCheckoutDestination(options: {
  userId: string;
  hasSelectedPlan: boolean;
  preferredNext?: string;
}): Promise<{
  destination: CheckoutDestination;
  profileComplete: boolean;
  hasActiveAsaasPlan: boolean;
  message?: string;
}> {
  const hasActiveAsaasPlan = await hasActiveAsaasSubscription(options.userId);

  if (hasActiveAsaasPlan) {
    return decideCheckoutDestination({
      hasActiveAsaasPlan: true,
      profileComplete: true,
      hasSelectedPlan: options.hasSelectedPlan,
      preferredNext: options.preferredNext,
    });
  }

  const { data: existingProfile } = await supabase
    .from("user_profiles")
    .select(
      "gender, age, has_children, address, city, state, zip_code, married_in_church, lives_chastity, is_catholic"
    )
    .eq("id", options.userId)
    .maybeSingle();

  const profileComplete = isCheckoutProfileComplete(existingProfile);

  return decideCheckoutDestination({
    hasActiveAsaasPlan: false,
    profileComplete,
    hasSelectedPlan: options.hasSelectedPlan,
    preferredNext: options.preferredNext,
  });
}
