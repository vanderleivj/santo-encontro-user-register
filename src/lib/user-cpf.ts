import { supabase } from "./supabase";
import { isValidCpf, onlyCpfDigits } from "./cpf";
import {
  fetchInactiveRegistrationStatus,
  INACTIVE_REGISTRATION_MESSAGE,
} from "./inactive-registration";

export class InactiveCpfError extends Error {
  readonly reason: string | null;

  constructor(reason: string | null) {
    super(INACTIVE_REGISTRATION_MESSAGE);
    this.name = "InactiveCpfError";
    this.reason = reason;
  }
}

export async function saveAuthenticatedUserCpf(params: {
  userId: string;
  cpf: string;
}): Promise<void> {
  const cpfDigits = onlyCpfDigits(params.cpf);
  if (!isValidCpf(cpfDigits)) {
    throw new Error("Informe um CPF válido.");
  }

  const inactive = await fetchInactiveRegistrationStatus({ cpf: cpfDigits });
  if (inactive.exists) {
    throw new InactiveCpfError(inactive.reason);
  }

  const { error } = await supabase
    .from("users")
    .update({ cpf: cpfDigits })
    .eq("id", params.userId);

  if (error) {
    throw new Error(
      error.message.includes("duplicate") || error.code === "23505"
        ? "Este CPF já está em uso em outra conta."
        : "Não foi possível salvar o CPF. Tente novamente."
    );
  }
}
