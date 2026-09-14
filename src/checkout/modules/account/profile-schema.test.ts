import { describe, expect, it } from "vitest";
import { profileSchema } from "./profile-schema";

const validBase = {
  birthDate: "14/03/1994",
  cpf: "529.982.247-25",
  gender: "female",
  temFilhos: "Não",
  city: "Santo André",
  state: "São Paulo",
  address: "Rua Exemplo",
  zip_code: "09000-000",
  jaCasado: "Não",
  viveCastidade: "Sim",
  is_catholic: "Sim",
  concordaRegras: true,
};

describe("profileSchema", () => {
  it("rejeita menor de 18 anos", () => {
    const result = profileSchema.safeParse({
      ...validBase,
      birthDate: "14/03/2020",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita quem não concorda com as regras", () => {
    const result = profileSchema.safeParse({
      ...validBase,
      concordaRegras: false,
    });
    expect(result.success).toBe(false);
  });

  it("exige nulidade só para quem já foi casado e não é viúvo", () => {
    const missingNullity = profileSchema.safeParse({
      ...validBase,
      jaCasado: "Sim",
      isViuvo: "Não",
      nulidadeMatrimonial: "",
    });
    expect(missingNullity.success).toBe(false);

    const widow = profileSchema.safeParse({
      ...validBase,
      jaCasado: "Sim",
      isViuvo: "Sim",
      nulidadeMatrimonial: "",
    });
    expect(widow.success).toBe(true);
  });

  it("aceita resposta Não nas regras de fé para o formulário poder registrar o bloqueio", () => {
    const result = profileSchema.safeParse({
      ...validBase,
      is_catholic: "Não",
      viveCastidade: "Não",
    });
    expect(result.success).toBe(true);
  });

  it("exige um CPF válido", () => {
    expect(
      profileSchema.safeParse({
        ...validBase,
        cpf: "",
      }).success
    ).toBe(false);

    expect(
      profileSchema.safeParse({
        ...validBase,
        cpf: "111.111.111-11",
      }).success
    ).toBe(false);

    expect(profileSchema.safeParse(validBase).success).toBe(true);
  });
});
