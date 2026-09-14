export function normalizeInactiveLookupEmail(
  email: string | null | undefined
): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized ? normalized : null;
}

export function normalizeInactiveLookupCpf(
  cpf: string | null | undefined
): string | null {
  const digits = (cpf ?? "").replace(/\D/g, "");
  return digits.length === 11 ? digits : null;
}
