import { statesList } from "../utils/states-list";

const UF_TO_STATE: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
};

export type ViaCepAddress = {
  zipCode: string;
  street: string;
  city: string;
  state: string;
  neighborhood: string;
};

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatCepInput(value: string): string {
  return onlyDigits(value)
    .replace(/(\d{5})(\d)/, "$1-$2")
    .substring(0, 9);
}

export function isCompleteCep(value: string): boolean {
  return onlyDigits(value).length === 8;
}

function resolveStateName(estado: unknown, uf: unknown): string {
  const fullName = typeof estado === "string" ? estado.trim() : "";
  if (fullName && statesList.includes(fullName)) {
    return fullName;
  }

  const ufCode = String(uf ?? "")
    .trim()
    .toUpperCase();
  return UF_TO_STATE[ufCode] ?? fullName;
}

export async function fetchAddressFromCep(
  cep: string
): Promise<ViaCepAddress> {
  const digits = onlyDigits(cep);
  if (digits.length !== 8) {
    throw new Error("CEP inválido.");
  }

  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  if (!response.ok) {
    throw new Error("Não foi possível consultar o CEP.");
  }

  const data = (await response.json()) as Record<string, unknown>;
  if (data.erro) {
    throw new Error("CEP não encontrado.");
  }

  const city = String(data.localidade ?? "").trim();
  const state = resolveStateName(data.estado, data.uf);
  if (!city || !state) {
    throw new Error("CEP sem cidade/estado válidos.");
  }

  return {
    zipCode: formatCepInput(digits),
    street: String(data.logradouro ?? "").trim(),
    city,
    state,
    neighborhood: String(data.bairro ?? "").trim(),
  };
}
