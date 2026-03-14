import { useState } from "react";
import { supabase } from "../lib/supabase";
import { getTrialDays } from "../lib/trial-days";

export interface PlanConfig {
  id: string;
  originalId?: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: string | null;
  interval_count: number | null;
  features: string[];
  isPopular?: boolean;
  isFree?: boolean;
  stripeProductId?: string;
  stripePriceId?: string;
}

export const usePayment = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePaymentWithStripe = async (
    plan: PlanConfig,
    couponCode?: string,
    paymentMethod?: "boleto_card" | "pix"
  ) => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Você precisa estar logado para assinar um plano.");
      }

      const { data: userProfile, error: userProfileError } = await supabase
        .from("users")
        .select("firstName, lastName, email")
        .eq("id", user.id)
        .single();

      if (userProfileError) {
        throw new Error(
          "Não foi possível carregar suas informações. Por favor, tente novamente."
        );
      }

      if (!userProfile?.email) {
        throw new Error(
          "Email não encontrado. Por favor, atualize seu cadastro."
        );
      }

      const fullName =
        userProfile?.firstName && userProfile?.lastName
          ? `${userProfile.firstName} ${userProfile.lastName}`
          : undefined;

      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;

      if (!accessToken) {
        throw new Error(
          "Não foi possível obter o token de autenticação. Por favor, faça login novamente."
        );
      }

      if (plan.isFree) {
        const trialDays = await getTrialDays();
        const now = new Date();
        const end = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

        const subscriptionData = {
          user_id: user.id,
          stripe_customer_id: `trial-customer-${user.id}`,
          stripe_subscription_id: null,
          plan_type: plan.id,
          status: "trialing",
          start_date: now.toISOString(),
          end_date: end.toISOString(),
          payment_intent_id: null,
          trial_days: trialDays,
        };

        const { error: insertError } = await supabase
          .from("subscriptions")
          .insert([subscriptionData]);

        if (insertError) {
          throw new Error(
            "Não foi possível ativar o plano gratuito. Tente novamente."
          );
        }

        return {
          success: true,
          message: "Plano gratuito ativado com sucesso!",
        };
      }

      const requestData = {
        planType: plan.id,
        priceId: plan.stripePriceId,
        email: userProfile.email,
        fullName: fullName,
        couponCode: couponCode || null,
        paymentMethod: paymentMethod || null,
        metadata: {
          user_id: user.id,
          full_name: fullName,
          plan_type: plan.id,
          stripe_product_id: plan.stripeProductId,
          stripe_price_id: plan.stripePriceId,
          coupon_code: couponCode || null,
          payment_method: paymentMethod || null,
        },
        successUrl: `${window.location.origin}/success`,
        cancelUrl: `${window.location.origin}/plans`,
      };

      const response = await fetch(
        "https://eiqohrnjpytwrhsokpqc.supabase.co/functions/v1/create-checkout-session",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(requestData),
        }
      );

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          responseData.error ||
            "Erro ao criar sessão de checkout. Por favor, tente novamente."
        );
      }

      if (responseData.message?.includes("Trial ativado")) {
        return {
          success: true,
          message: `Trial ativado com sucesso! ${responseData.trialDays} dias de teste.`,
        };
      }

      if (responseData.checkoutUrl) {
        return {
          success: true,
          message: "Redirecionando para checkout...",
          checkoutUrl: responseData.checkoutUrl,
        };
      }

      console.error(
        "Edge Function não retornou checkoutUrl ou dados PIX:",
        responseData
      );
      throw new Error(
        "Não foi possível obter URL de checkout ou dados do PIX. Tente novamente."
      );
    } catch (error: any) {
      console.error("Erro no pagamento:", error);
      setError(
        error.message ||
          "Houve um problema ao processar seu pagamento. Por favor, tente novamente."
      );
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    handlePaymentWithStripe,
    loading,
    error,
    setError,
  };
};
