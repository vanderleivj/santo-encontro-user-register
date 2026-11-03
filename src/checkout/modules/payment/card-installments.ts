export const MIN_CARD_INSTALLMENT_VALUE = 5;

export function maxCardInstallments(interval: string | null | undefined): number {
  if (interval === "semiannual") return 6;
  if (interval === "year" || interval === "yearly") return 12;
  return 1;
}

export function installmentValue(total: number, installmentCount: number): number {
  const totalCents = Math.round(total * 100);
  const installmentCents = Math.floor(totalCents / installmentCount);
  return installmentCents / 100;
}

export function installmentOptions(total: number, maxInstallments: number): number[] {
  const options = [1];
  for (let count = 2; count <= maxInstallments; count += 1) {
    if (installmentValue(total, count) >= MIN_CARD_INSTALLMENT_VALUE) {
      options.push(count);
    }
  }
  return options;
}
