import { describe, expect, it } from "vitest";
import {
  installmentOptions,
  installmentValue,
  maxCardInstallments,
} from "./card-installments";

describe("card installments", () => {
  it("limits semiannual to 6 and yearly to 12", () => {
    expect(maxCardInstallments("semiannual")).toBe(6);
    expect(maxCardInstallments("year")).toBe(12);
    expect(maxCardInstallments("yearly")).toBe(12);
    expect(maxCardInstallments("month")).toBe(1);
    expect(maxCardInstallments("quarterly")).toBe(1);
  });

  it("hides parcels below five reais", () => {
    expect(installmentOptions(34.99, 6)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(installmentOptions(44.99, 12)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("floors each parcel without changing the displayed total elsewhere", () => {
    expect(installmentValue(100, 6)).toBe(16.66);
    expect(installmentValue(120, 12)).toBe(10);
  });
});
