import { supabase } from "./supabase";
import {
  normalizeInactiveLookupCpf,
  normalizeInactiveLookupEmail,
} from "./inactive-registration-normalize";

export {
  normalizeInactiveLookupCpf,
  normalizeInactiveLookupEmail,
} from "./inactive-registration-normalize";

export const INACTIVE_REGISTRATION_PERSIST_ERROR =
  "Não foi possível concluir o bloqueio do cadastro. Tente novamente.";

export async function persistInactiveRegistration(input: {
  email: string;
  cpf?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  reason: string;
}): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const sessionEmail = normalizeInactiveLookupEmail(user?.email);
  if (!user?.id || !sessionEmail) {
    console.error("Erro ao registrar usuário inativo: sessão inválida");
    throw new Error(INACTIVE_REGISTRATION_PERSIST_ERROR);
  }

  let cpf = normalizeInactiveLookupCpf(input.cpf);
  const { data: userRow } = await supabase
    .from("users")
    .select('cpf, "firstName", "lastName", phone')
    .eq("id", user.id)
    .maybeSingle();

  if (!cpf) {
    cpf = normalizeInactiveLookupCpf(userRow?.cpf);
  }

  if (!cpf) {
    console.error("Erro ao registrar usuário inativo: CPF ausente");
    throw new Error(INACTIVE_REGISTRATION_PERSIST_ERROR);
  }

  const firstName = input.firstName || userRow?.firstName || null;
  const lastName = input.lastName || userRow?.lastName || null;
  const phone = input.phone || userRow?.phone || null;

  if (!firstName || !lastName) {
    console.error("Erro ao registrar usuário inativo: nome ausente");
    throw new Error(INACTIVE_REGISTRATION_PERSIST_ERROR);
  }

  const { error } = await supabase.from("inactive_users").insert({
    email: sessionEmail,
    cpf,
    first_name: firstName,
    last_name: lastName,
    phone,
    reason: input.reason,
  });

  if (error) {
    console.error("Erro ao registrar usuário inativo:", error);
    throw new Error(INACTIVE_REGISTRATION_PERSIST_ERROR);
  }
}

export interface InactiveRegistrationStatus {
  exists: boolean;
  reason: string | null;
}

export async function fetchInactiveRegistrationStatus(params: {
  email?: string | null;
  cpf?: string | null;
}): Promise<InactiveRegistrationStatus> {
  const email = normalizeInactiveLookupEmail(params.email);
  const cpf = normalizeInactiveLookupCpf(params.cpf);

  if (!email && !cpf) {
    return { exists: false, reason: null };
  }

  const { data, error } = await supabase.rpc("inactive_registration_status", {
    p_email: email,
    p_cpf: cpf,
  });

  if (error) {
    console.error("Erro ao consultar inactive_registration_status:", error);
    throw new Error("Não foi possível verificar o status do cadastro.");
  }

  const payload = data as { exists?: boolean; reason?: string | null } | null;
  return {
    exists: Boolean(payload?.exists),
    reason: payload?.reason ?? null,
  };
}

export const INACTIVE_REGISTRATION_MESSAGE =
  "Este cadastro não está disponível. Se precisar de ajuda, fale com o suporte.";
