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
  ownerUserId: string | null;
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
  bindCheckoutOwner: (userId: string | null) => void;
  resetCheckout: () => void;
}

const EMPTY_CHECKOUT = {
  selectedPlan: null as PlanConfig | null,
  accountCompleted: false,
  profileCompleted: false,
  couponInput: "",
  appliedCoupon: null as AppliedCoupon | null,
};

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set, get) => ({
      ownerUserId: null,
      ...EMPTY_CHECKOUT,
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
      bindCheckoutOwner: (userId) => {
        const currentOwner = get().ownerUserId;
        if (!userId) {
          set({ ownerUserId: null, ...EMPTY_CHECKOUT });
          return;
        }
        if (currentOwner && currentOwner !== userId) {
          set({ ownerUserId: userId, ...EMPTY_CHECKOUT });
          return;
        }
        if (!currentOwner) {
          set({ ownerUserId: userId });
        }
      },
      resetCheckout: () =>
        set({
          ownerUserId: get().ownerUserId,
          ...EMPTY_CHECKOUT,
        }),
    }),
    {
      name: "santo-checkout",
      partialize: (state) => ({
        ownerUserId: state.ownerUserId,
        selectedPlan: state.selectedPlan,
        accountCompleted: state.accountCompleted,
        profileCompleted: state.profileCompleted,
        couponInput: state.couponInput,
        appliedCoupon: state.appliedCoupon,
      }),
    }
  )
);
