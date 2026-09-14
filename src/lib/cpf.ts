export function onlyCpfDigits(cpf: string | null | undefined): string {
  return (cpf ?? "").replace(/\D/g, "");
}

export function formatCpfInput(value: string): string {
  return onlyCpfDigits(value)
    .replace(/^(\d{3})(\d)/g, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/g, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/g, "$1.$2.$3-$4")
    .substring(0, 14);
}

export function isValidCpf(cpf: string | null | undefined): boolean {
  const digits = onlyCpfDigits(cpf);
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let index = 0; index < 9; index += 1) {
    sum += Number.parseInt(digits.charAt(index), 10) * (10 - index);
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (Number.parseInt(digits.charAt(9), 10) !== digit1) return false;

  sum = 0;
  for (let index = 0; index < 10; index += 1) {
    sum += Number.parseInt(digits.charAt(index), 10) * (11 - index);
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  return Number.parseInt(digits.charAt(10), 10) === digit2;
}
