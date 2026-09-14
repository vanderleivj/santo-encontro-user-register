import { describe, expect, it } from "vitest";
import {
  normalizeInactiveLookupCpf,
  normalizeInactiveLookupEmail,
} from "./inactive-registration-normalize";

describe("normalizeInactiveLookupEmail", () => {
  it("normaliza e-mail para minúsculas", () => {
    expect(normalizeInactiveLookupEmail("  Pessoa@Exemplo.com ")).toBe(
      "pessoa@exemplo.com"
    );
  });

  it("ignora vazio", () => {
    expect(normalizeInactiveLookupEmail("   ")).toBeNull();
    expect(normalizeInactiveLookupEmail(null)).toBeNull();
  });
});

describe("normalizeInactiveLookupCpf", () => {
  it("aceita CPF mascarado com 11 dígitos", () => {
    expect(normalizeInactiveLookupCpf("123.456.789-09")).toBe("12345678909");
  });

  it("rejeita CPF incompleto", () => {
    expect(normalizeInactiveLookupCpf("123")).toBeNull();
    expect(normalizeInactiveLookupCpf(null)).toBeNull();
  });
});
