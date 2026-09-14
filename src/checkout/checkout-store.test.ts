import { describe, expect, it } from "vitest";
import { nextCheckoutOwnerSnapshot } from "./checkout-store";
import type { PlanConfig } from "../hooks/usePlans";

const plan = {
  id: "semiannual",
  name: "Plano Semestral",
  price: 59.9,
} as PlanConfig;

const empty = {
  ownerUserId: null,
  selectedPlan: plan,
  accountCompleted: false,
  profileCompleted: false,
  couponInput: "",
  appliedCoupon: null,
};

describe("nextCheckoutOwnerSnapshot", () => {
  it("vincula o dono sem apagar o plano escolhido como convidado", () => {
    expect(nextCheckoutOwnerSnapshot(empty, "user-new")).toEqual({
      ...empty,
      ownerUserId: "user-new",
    });
  });

  it("mantém o plano ao criar conta quando já havia outro dono persistido", () => {
    const current = {
      ...empty,
      ownerUserId: "user-old",
      accountCompleted: true,
      couponInput: "PROMO",
    };

    expect(nextCheckoutOwnerSnapshot(current, "user-new")).toEqual({
      ownerUserId: "user-new",
      selectedPlan: plan,
      accountCompleted: false,
      profileCompleted: false,
      couponInput: "",
      appliedCoupon: null,
    });
  });

  it("não muda nada se o dono já é o mesmo", () => {
    const current = { ...empty, ownerUserId: "user-new" };
    expect(nextCheckoutOwnerSnapshot(current, "user-new")).toBeNull();
  });
});
