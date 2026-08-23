import { supabase } from "./supabase";

export interface InactiveRegistrationStatus {
  exists: boolean;
  reason: string | null;
}

export async function fetchInactiveRegistrationStatus(params: {
  email?: string | null;
  cpf?: string | null;
}): Promise<InactiveRegistrationStatus> {
  const email = params.email?.trim() || null;
  const cpf = params.cpf?.trim() || null;

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
    reason: null,
  };
}

export const INACTIVE_REGISTRATION_MESSAGE =
  "Este cadastro não está disponível. Se precisar de ajuda, fale com o suporte.";

