import { z } from "zod";

const VALID_DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35,
  37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64,
  65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88,
  89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

function isValidBrazilianCellPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  const ddd = Number.parseInt(digits.slice(0, 2), 10);
  if (!VALID_DDDS.has(ddd)) return false;
  if (digits[2] !== "9") return false;
  return true;
}

function isInternationalPhone(val: string): boolean {
  const trimmed = val?.trim() ?? "";
  if (trimmed.startsWith("+")) return true;
  const digits = trimmed.replace(/\D/g, "");
  return digits.length > 11;
}

function isValidInternationalPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

/** Schema da etapa Conta (Pencil dtw1H / PsOaI) — sem CPF/confirmações. */
export const accountSchema = z.object({
  firstName: z.string().min(1, "Nome é obrigatório"),
  lastName: z.string().min(1, "Sobrenome é obrigatório"),
  email: z.string().min(1, "E-mail é obrigatório").email("E-mail inválido"),
  phone: z
    .string()
    .min(1, "WhatsApp é obrigatório")
    .refine((val) => {
      const digits = val?.replace(/\D/g, "") ?? "";
      if (digits.length < 10) return false;
      if (isInternationalPhone(val)) return isValidInternationalPhone(val);
      if (digits.length !== 11) return false;
      return isValidBrazilianCellPhone(val);
    }, "Brasil: use (DDD) 9XXXX-XXXX. Exterior: use +código do país"),
  senha: z
    .string()
    .min(1, "Senha é obrigatória")
    .min(8, "Senha deve ter pelo menos 8 caracteres"),
});

export type AccountFormData = z.infer<typeof accountSchema>;

export function getPasswordStrength(password: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
} {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) {
    return { score: score as 0 | 1, label: "Senha fraca · mínimo de 8 caracteres", color: "#B42318" };
  }
  if (score === 2) {
    return { score: 2, label: "Senha ok · mínimo de 8 caracteres", color: "#C2410C" };
  }
  if (score === 3) {
    return { score: 3, label: "Senha boa · mínimo de 8 caracteres", color: "#15803D" };
  }
  return { score: 4, label: "Senha forte · mínimo de 8 caracteres", color: "#15803D" };
}
