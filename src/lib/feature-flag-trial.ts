import { supabase } from "./supabase";

const FLAG_NAME = "trial_automatico_registro";

/**
 * Verifica se o trial automático no registro está habilitado pela feature flag.
 * Fail closed: em caso de erro ou flag inexistente, retorna false (não cria trial).
 */
export async function isTrialAutomaticoEnabled(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("feature_flags")
      .select("name, enabled")
      .eq("name", FLAG_NAME)
      .maybeSingle();

    if (error) {
      console.warn(
        "⚠️ Erro ao ler feature flag trial_automatico_registro:",
        error
      );
      return false;
    }

    return data?.enabled === true;
  } catch {
    return false;
  }
}
