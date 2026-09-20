import { describe, expect, it } from "vitest";
import {
  REGISTRATION_BLOCK_REASONS,
  getRegistrationPolicyBlockReason,
  getRegistrationPolicyBlockReasonFromProfile,
  profileSatisfiesMaritalPolicy,
} from "./registration-eligibility";

describe("getRegistrationPolicyBlockReason", () => {
  it("bloqueia quem não é católica", () => {
    expect(
      getRegistrationPolicyBlockReason({
        isCatholic: "Não",
        livesChastity: "Sim",
        wasMarried: "Não",
      })
    ).toBe(REGISTRATION_BLOCK_REASONS.notCatholic);
  });

  it("bloqueia quem não busca castidade", () => {
    expect(
      getRegistrationPolicyBlockReason({
        isCatholic: "Sim",
        livesChastity: "Não",
        wasMarried: "Não",
      })
    ).toBe(REGISTRATION_BLOCK_REASONS.notChastity);
  });

  it("bloqueia casada sem nulidade, mas libera viúva", () => {
    expect(
      getRegistrationPolicyBlockReason({
        isCatholic: "Sim",
        livesChastity: "Sim",
        wasMarried: "Sim",
        isWidowed: "Não",
        hasMaritalNullity: "Não",
      })
    ).toBe(REGISTRATION_BLOCK_REASONS.noNullity);

    expect(
      getRegistrationPolicyBlockReason({
        isCatholic: "Sim",
        livesChastity: "Sim",
        wasMarried: "Sim",
        isWidowed: "Sim",
        hasMaritalNullity: "Não",
      })
    ).toBeNull();
  });

  it("libera quem tem nulidade", () => {
    expect(
      getRegistrationPolicyBlockReason({
        isCatholic: "Sim",
        livesChastity: "Sim",
        wasMarried: "Sim",
        isWidowed: "Não",
        hasMaritalNullity: "Sim",
      })
    ).toBeNull();
  });
});

describe("perfil já gravado", () => {
  it("não considera completo casamento na Igreja sem nulidade", () => {
    const profile = {
      is_catholic: true,
      lives_chastity: true,
      married_in_church: true,
      is_widowed: false,
      marital_status: "Não",
    };

    expect(getRegistrationPolicyBlockReasonFromProfile(profile)).toBe(
      REGISTRATION_BLOCK_REASONS.noNullity
    );
    expect(profileSatisfiesMaritalPolicy(profile)).toBe(false);
  });

  it("libera viúva mesmo sem nulidade", () => {
    expect(
      profileSatisfiesMaritalPolicy({
        married_in_church: true,
        is_widowed: true,
        marital_status: "Não",
      })
    ).toBe(true);
  });

  it("libera divorciado quando o admin marcou nulidade", () => {
    expect(
      profileSatisfiesMaritalPolicy({
        married_in_church: true,
        is_widowed: false,
        marital_status: "Divorciado(a)",
        has_marital_nullity: true,
      })
    ).toBe(true);
  });
});
