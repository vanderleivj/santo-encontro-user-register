import { useBlackFriday } from "./useBlackFriday";
import {
  getThemePageBackground,
  isDarkThemeLayout,
  mergeAdminThemeConfig,
} from "../lib/app-theme";

export function useThemedPage() {
  const { config, loading } = useBlackFriday();
  const theme = mergeAdminThemeConfig(config);
  const darkLayout = isDarkThemeLayout(theme);

  return {
    config: theme,
    loading,
    darkCampaign: darkLayout,
    darkLayout,
    campaignActive: theme.enabled,
    pageBackground: getThemePageBackground(theme),
    titleColor: theme.layout_text_primary,
    subtitleColor: theme.layout_text_secondary,
    brandTitle: theme.brand_title,
    brandSubtitle: theme.brand_subtitle,
  };
}
