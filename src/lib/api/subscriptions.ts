import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../supabase";

export async function cancelAsaasSubscription(
  accessToken: string,
  subscriptionId: string,
  cancelAtPeriodEnd = true
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/cancel-subscription`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        subscriptionId,
        cancelAtPeriodEnd,
      }),
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(
      data.error ?? data.details ?? "Erro ao cancelar assinatura."
    );
  }

  return {
    success: Boolean(data.success),
    message: String(data.message ?? "Assinatura cancelada."),
  };
}
