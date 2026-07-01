import { useBlackFriday } from "./useBlackFriday";
import {
  EXPO_CATOLICA_BRAND,
  getCampaignPageBackground,
  isDarkCampaignLayout,
} from "../lib/app-theme";

export function useThemedPage() {
  const { config, loading } = useBlackFriday();
  const darkCampaign = isDarkCampaignLayout(config);

  const pageBackground = darkCampaign
    ? getCampaignPageBackground(config)
    : undefined;

  return {
    config,
    loading,
    darkCampaign,
    pageBackground,
    titleColor: EXPO_CATOLICA_BRAND.textPrimary,
    subtitleColor: EXPO_CATOLICA_BRAND.textSecondary,
  };
}
