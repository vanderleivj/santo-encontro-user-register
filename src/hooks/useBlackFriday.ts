import { usePlanPageTheme } from "../context/AppThemeProvider";
import type { BlackFridayConfig } from "../lib/app-theme";

export type { BlackFridayConfig };

/** Compat: consome o tema único do AppThemeProvider (admin app_config). */
export const useBlackFriday = () => {
  const { config, loading, error, campaignActive, refetch } = usePlanPageTheme();
  return {
    config,
    loading,
    error,
    campaignActive,
    refetch,
  };
};
