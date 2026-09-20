export const REGISTRATION_BLOCK_REASONS = {
  notCatholic: "Não é católico apostólico romano",
  notChastity: "Não busca viver a castidade",
  notCatholicAndChastity:
    "Não é católico apostólico romano e não busca viver castidade",
  noNullity: "Nulidade matrimonial não possui",
} as const;

export type RegistrationBlockReason =
  (typeof REGISTRATION_BLOCK_REASONS)[keyof typeof REGISTRATION_BLOCK_REASONS];

export interface RegistrationEligibilityAnswers {
  isCatholic?: string | null;
  livesChastity?: string | null;
  wasMarried?: string | null;
  isWidowed?: string | null;
  hasMaritalNullity?: string | null;
}

export interface RegistrationEligibilityProfile {
  is_catholic?: boolean | null;
  lives_chastity?: boolean | null;
  married_in_church?: boolean | null;
  is_widowed?: boolean | null;
  marital_status?: string | null;
  has_marital_nullity?: boolean | null;
}

export interface RegistrationBlockCopy {
  title: string;
  message: string;
}

function isYes(value: string | null | undefined): boolean {
  return value?.trim() === "Sim";
}

function isNo(value: string | null | undefined): boolean {
  return value?.trim() === "Não";
}

export function getRegistrationPolicyBlockReason(
  answers: RegistrationEligibilityAnswers
): RegistrationBlockReason | null {
  const notCatholic = isNo(answers.isCatholic);
  const notChastity = isNo(answers.livesChastity);

  if (notCatholic && notChastity) {
    return REGISTRATION_BLOCK_REASONS.notCatholicAndChastity;
  }
  if (notCatholic) {
    return REGISTRATION_BLOCK_REASONS.notCatholic;
  }
  if (notChastity) {
    return REGISTRATION_BLOCK_REASONS.notChastity;
  }

  if (
    isYes(answers.wasMarried) &&
    !isYes(answers.isWidowed) &&
    isNo(answers.hasMaritalNullity)
  ) {
    return REGISTRATION_BLOCK_REASONS.noNullity;
  }

  return null;
}

function hasCompletedNullity(profile: RegistrationEligibilityProfile): boolean {
  if (profile.has_marital_nullity === true) return true;
  if (profile.has_marital_nullity === false) return false;
  return isYes(profile.marital_status);
}

function hasDeniedNullity(profile: RegistrationEligibilityProfile): boolean {
  if (profile.has_marital_nullity === true) return false;
  if (profile.has_marital_nullity === false) return true;
  return isNo(profile.marital_status);
}

export function getRegistrationPolicyBlockReasonFromProfile(
  profile: RegistrationEligibilityProfile | null | undefined
): RegistrationBlockReason | null {
  if (!profile) return null;

  return getRegistrationPolicyBlockReason({
    isCatholic:
      profile.is_catholic === true
        ? "Sim"
        : profile.is_catholic === false
          ? "Não"
          : null,
    livesChastity:
      profile.lives_chastity === true
        ? "Sim"
        : profile.lives_chastity === false
          ? "Não"
          : null,
    wasMarried:
      profile.married_in_church === true
        ? "Sim"
        : profile.married_in_church === false
          ? "Não"
          : null,
    isWidowed:
      profile.is_widowed === true
        ? "Sim"
        : profile.is_widowed === false
          ? "Não"
          : null,
    hasMaritalNullity: hasDeniedNullity(profile)
      ? "Não"
      : hasCompletedNullity(profile)
        ? "Sim"
        : null,
  });
}

export function profileSatisfiesMaritalPolicy(
  profile: RegistrationEligibilityProfile | null | undefined
): boolean {
  if (!profile) return false;
  if (profile.married_in_church !== true) return true;
  if (profile.is_widowed === true) return true;
  return hasCompletedNullity(profile);
}

export function resolveHasMaritalNullityFromAnswers(answers: {
  wasMarried?: string | null;
  isWidowed?: string | null;
  hasMaritalNullity?: string | null;
}): boolean | null {
  if (!isYes(answers.wasMarried)) return null;
  if (isYes(answers.isWidowed)) return null;
  if (isYes(answers.hasMaritalNullity)) return true;
  if (isNo(answers.hasMaritalNullity)) return false;
  return null;
}

export function maritalStatusForRegistrationWrite(
  existing: string | null | undefined
): string | null | undefined {
  const trimmed = existing?.trim() ?? "";
  if (trimmed === "Sim" || trimmed === "Não") return null;
  return undefined;
}

export function getRegistrationBlockCopy(
  reason: string
): RegistrationBlockCopy {
  switch (reason) {
    case REGISTRATION_BLOCK_REASONS.noNullity:
      return {
        title: "Nulidade matrimonial necessária",
        message:
          "Para participar do Santo Encontro é necessário ter o processo de nulidade matrimonial concluído pela Igreja Católica. Viúvos não precisam de nulidade. Se esse for o seu caso, fale com o suporte.",
      };
    case REGISTRATION_BLOCK_REASONS.notCatholic:
      return {
        title: "Participação restrita",
        message:
          "O Santo Encontro é exclusivo para católicos apostólicos romanos que buscam viver um namoro casto.",
      };
    case REGISTRATION_BLOCK_REASONS.notChastity:
      return {
        title: "Valores do Santo Encontro",
        message:
          "O Santo Encontro é para pessoas que buscam viver a castidade e formar relacionamentos segundo a fé católica.",
      };
    case REGISTRATION_BLOCK_REASONS.notCatholicAndChastity:
      return {
        title: "Critérios de participação",
        message:
          "O Santo Encontro é exclusivo para católicos apostólicos romanos que buscam viver um namoro casto.",
      };
    default:
      return {
        title: "Cadastro não aprovado",
        message:
          "Seu cadastro não pôde ser aprovado neste momento. Fale com o suporte se precisar de ajuda.",
      };
  }
}
