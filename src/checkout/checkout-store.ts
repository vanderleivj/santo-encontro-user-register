import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PlanConfig } from "../hooks/usePlans";

export type CheckoutStep = "plan" | "account" | "payment";

interface CheckoutState {
  selectedPlan: PlanConfig | null;
  accountCompleted: boolean;
  profileCompleted: boolean;
  setSelectedPlan: (plan: PlanConfig | null) => void;
  setAccountCompleted: (value: boolean) => void;
  setProfileCompleted: (value: boolean) => void;
  resetCheckout: () => void;
}

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set) => ({
      selectedPlan: null,
      accountCompleted: false,
      profileCompleted: false,
      setSelectedPlan: (plan) => set({ selectedPlan: plan }),
      setAccountCompleted: (value) => set({ accountCompleted: value }),
      setProfileCompleted: (value) => set({ profileCompleted: value }),
      resetCheckout: () =>
        set({
          selectedPlan: null,
          accountCompleted: false,
          profileCompleted: false,
        }),
    }),
    {
      name: "santo-checkout",
      partialize: (state) => ({
        selectedPlan: state.selectedPlan,
        accountCompleted: state.accountCompleted,
        profileCompleted: state.profileCompleted,
      }),
    }
  )
);
