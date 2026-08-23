import { z } from "zod";

function ageFromBirthDate(birthDate: string): number | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(birthDate.trim());
  if (!match) return null;
  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const year = Number.parseInt(match[3], 10);
  const born = new Date(year, month - 1, day);
  if (
    born.getFullYear() !== year ||
    born.getMonth() !== month - 1 ||
    born.getDate() !== day
  ) {
    return null;
  }
  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() - (month - 1);
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
    age -= 1;
  }
  return age;
}

export const profileSchema = z
  .object({
    birthDate: z
      .string()
      .min(1, "Data de nascimento é obrigatória")
      .refine((val) => {
        const age = ageFromBirthDate(val);
        return age !== null && age >= 18 && age <= 120;
      }, "É necessário ter 18 anos ou mais"),
    gender: z.string().min(1, "Gênero é obrigatório"),
    temFilhos: z.string().min(1, "Esta informação é obrigatória"),
    city: z.string().min(1, "Informe um CEP válido para preencher a cidade"),
    state: z.string().min(1, "Informe um CEP válido para preencher o estado"),
    address: z.string().min(1, "Endereço é obrigatório"),
    complement: z.string().optional(),
    zip_code: z
      .string()
      .min(1, "CEP é obrigatório")
      .refine(
        (value) => value.replace(/\D/g, "").length === 8,
        "CEP inválido"
      ),
    jaCasado: z.string().min(1, "Esta informação é obrigatória"),
    nulidadeMatrimonial: z.string().optional(),
    isViuvo: z.string().optional(),
    viveCastidade: z.string().min(1, "Esta informação é obrigatória"),
    is_catholic: z.string().min(1, "Esta informação é obrigatória"),
    concordaRegras: z.boolean().refine((val) => val === true, {
      message: "Você deve concordar com a declaração para continuar",
    }),
  })
  .refine(
    (data) => {
      if (data.jaCasado !== "Sim") return true;
      if (data.isViuvo === "Sim") return true;
      return Boolean(data.nulidadeMatrimonial);
    },
    {
      message: "Esta informação é obrigatória para quem já foi casado",
      path: ["nulidadeMatrimonial"],
    }
  );

export type ProfileFormData = z.infer<typeof profileSchema>;

export function getAgeFromBirthDate(birthDate: string): number {
  return ageFromBirthDate(birthDate) ?? 0;
}

export function formatBirthDateInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}
