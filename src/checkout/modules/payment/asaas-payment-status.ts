export interface AsaasPaymentStatusResult {
  paymentId: string;
  status: string;
  asaasStatus?: string;
}

export function isAsaasPaymentConfirmed(
  result: AsaasPaymentStatusResult
): boolean {
  const asaasStatus = (result.asaasStatus || "").toUpperCase();
  return (
    result.status === "approved" ||
    result.status === "succeeded" ||
    asaasStatus === "RECEIVED" ||
    asaasStatus === "CONFIRMED" ||
    asaasStatus === "RECEIVED_IN_CASH"
  );
}
