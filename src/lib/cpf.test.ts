import { describe, expect, it } from "vitest";
import { formatCpfInput, isValidCpf, onlyCpfDigits } from "./cpf";

describe("cpf", () => {
  it("formata e valida CPF", () => {
    expect(formatCpfInput("52998224725")).toBe("529.982.247-25");
    expect(onlyCpfDigits("529.982.247-25")).toBe("52998224725");
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("123")).toBe(false);
  });
});
