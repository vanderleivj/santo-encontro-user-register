import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect, useState } from "react";
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

export interface CheckoutSnapshot {
  ownerUserId: string | null;
  selectedPlan: PlanConfig | null;
  accountCompleted: boolean;
  profileCompleted: boolean;
  couponInput: string;
  appliedCoupon: AppliedCoupon | null;
}

interface CheckoutState extends CheckoutSnapshot {
  setSelectedPlan: (plan: PlanConfig | null) => void;
  setAccountCompleted: (value: boolean) => void;
  setProfileCompleted: (value: boolean) => void;
  setCouponInput: (value: string) => void;
  setAppliedCoupon: (coupon: AppliedCoupon | null) => void;
  bindCheckoutOwner: (userId: string | null) => void;
  resetCheckout: () => void;
}

const EMPTY_CHECKOUT: Omit<CheckoutSnapshot, "ownerUserId"> = {
  selectedPlan: null,
  accountCompleted: false,
  profileCompleted: false,
  couponInput: "",
  appliedCoupon: null,
};

export function nextCheckoutOwnerSnapshot(
  current: CheckoutSnapshot,
  userId: string | null
): CheckoutSnapshot | null {
  if (!userId) {
    return { ownerUserId: null, ...EMPTY_CHECKOUT };
  }

  if (!current.ownerUserId) {
    return { ...current, ownerUserId: userId };
  }

  if (current.ownerUserId === userId) {
    return null;
  }

  return {
    ownerUserId: userId,
    selectedPlan: current.selectedPlan,
    accountCompleted: false,
    profileCompleted: false,
    couponInput: "",
    appliedCoupon: null,
  };
}

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
        const next = nextCheckoutOwnerSnapshot(get(), userId);
        if (next) set(next);
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

export function useCheckoutStoreHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() =>
    useCheckoutStore.persist.hasHydrated()
  );

  useEffect(() => {
    if (useCheckoutStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return useCheckoutStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
  }, []);

  return hydrated;
}
