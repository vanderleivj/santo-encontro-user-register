import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PlanConfig } from "../hooks/usePlans";

export type CheckoutStep = "plan" | "account" | "payment";

export interface AppliedCoupon {
  code: string;
  discountType: string;
  discountValue: number;
  discountAmount: number;
  originalAmount: number;
  finalAmount: number;
}

interface CheckoutState {
  selectedPlan: PlanConfig | null;
  accountCompleted: boolean;
  profileCompleted: boolean;
  couponInput: string;
  appliedCoupon: AppliedCoupon | null;
  setSelectedPlan: (plan: PlanConfig | null) => void;
  setAccountCompleted: (value: boolean) => void;
  setProfileCompleted: (value: boolean) => void;
  setCouponInput: (value: string) => void;
  setAppliedCoupon: (coupon: AppliedCoupon | null) => void;
  resetCheckout: () => void;
}

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set) => ({
      selectedPlan: null,
      accountCompleted: false,
      profileCompleted: false,
      couponInput: "",
      appliedCoupon: null,
      setSelectedPlan: (plan) =>
        set({
          selectedPlan: plan,
          appliedCoupon: null,
          couponInput: "",
        }),
      setAccountCompleted: (value) => set({ accountCompleted: value }),
      setProfileCompleted: (value) => set({ profileCompleted: value }),
      setCouponInput: (value) => set({ couponInput: value }),
      setAppliedCoupon: (coupon) => set({ appliedCoupon: coupon }),
      resetCheckout: () =>
        set({
          selectedPlan: null,
          accountCompleted: false,
          profileCompleted: false,
          couponInput: "",
          appliedCoupon: null,
        }),
    }),
    {
      name: "santo-checkout",
      partialize: (state) => ({
        selectedPlan: state.selectedPlan,
        accountCompleted: state.accountCompleted,
        profileCompleted: state.profileCompleted,
        couponInput: state.couponInput,
        appliedCoupon: state.appliedCoupon,
      }),
    }
  )
);
