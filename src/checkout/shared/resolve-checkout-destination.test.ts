import { describe, expect, it } from "vitest";
import {
  decideCheckoutDestination,
  isCheckoutProfileComplete,
  subscriptionGrantsCheckoutAccess,
} from "./resolve-checkout-destination";

describe("subscriptionGrantsCheckoutAccess", () => {
  it("allows active without end date", () => {
    expect(
      subscriptionGrantsCheckoutAccess({ status: "active", end_date: null })
    ).toBe(true);
  });

  it("blocks expired active", () => {
    expect(
      subscriptionGrantsCheckoutAccess({
        status: "active",
        end_date: "2020-01-01T00:00:00.000Z",
      })
    ).toBe(false);
  });
});

describe("decideCheckoutDestination", () => {
  it("sends active plan users to manage, or upgrade when preferred", () => {
    expect(
      decideCheckoutDestination({
        hasActiveAsaasPlan: true,
        profileComplete: true,
        hasSelectedPlan: false,
      }).destination
    ).toBe("/conta/plano");

    expect(
      decideCheckoutDestination({
        hasActiveAsaasPlan: true,
        profileComplete: true,
        hasSelectedPlan: false,
        preferredNext: "/conta/upgrade?app=1",
      }).destination
    ).toBe("/conta/upgrade");
  });

  it("ignores preferred conta routes without active plan", () => {
    expect(
      decideCheckoutDestination({
        hasActiveAsaasPlan: false,
        profileComplete: true,
        hasSelectedPlan: true,
        preferredNext: "/conta/plano",
      }).destination
    ).toBe("/pagamento");

    expect(
      decideCheckoutDestination({
        hasActiveAsaasPlan: false,
        profileComplete: false,
        hasSelectedPlan: false,
        preferredNext: "/conta/upgrade",
      }).destination
    ).toBe("/planos");
  });

  it("routes incomplete profile to sobre-voce when plan selected", () => {
    expect(
      decideCheckoutDestination({
        hasActiveAsaasPlan: false,
        profileComplete: false,
        hasSelectedPlan: true,
      }).destination
    ).toBe("/sobre-voce");
  });
});

describe("isCheckoutProfileComplete", () => {
  it("requires all profile fields including CEP and address", () => {
    expect(isCheckoutProfileComplete(null)).toBe(false);
    expect(
      isCheckoutProfileComplete({
        gender: "male",
        age: 30,
        has_children: false,
        address: null,
        city: "São Paulo",
        state: "São Paulo",
        zip_code: "01310-100",
        married_in_church: true,
        lives_chastity: true,
        is_catholic: true,
      })
    ).toBe(false);
    expect(
      isCheckoutProfileComplete({
        gender: "male",
        age: 30,
        has_children: false,
        address: "Av. Paulista, 1000",
        city: "São Paulo",
        state: "São Paulo",
        zip_code: "01310-100",
        married_in_church: true,
        lives_chastity: true,
        is_catholic: true,
      })
    ).toBe(true);
  });
});
