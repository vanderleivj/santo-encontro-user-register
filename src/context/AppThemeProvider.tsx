import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "../lib/supabase";
import type { BlackFridayConfig } from "../lib/app-theme";
import {
  applyThemeCssVariables,
  buildAdminThemeCssVariables,
} from "../lib/app-theme";

interface PlanPageThemeContextValue {
  config: BlackFridayConfig;
  loading: boolean;
  error: string | null;
  campaignActive: boolean;
  refetch: () => Promise<void>;
}

const PlanPageThemeContext = createContext<PlanPageThemeContextValue | null>(
  null
);

function parseConfigValue(configValue: Record<string, unknown>): BlackFridayConfig {
  let isEnabled = Boolean(configValue.enabled);

  if (isEnabled && configValue.start_date && configValue.end_date) {
    const now = new Date();
    const start = new Date(String(configValue.start_date));
    const end = new Date(String(configValue.end_date));
    end.setHours(23, 59, 59, 999);
    isEnabled = now >= start && now <= end;
  }

  const asString = (key: string): string | undefined => {
    const value = configValue[key];
    return typeof value === "string" ? value : undefined;
  };

  return {
    enabled: isEnabled,
    start_date: asString("start_date") ?? null,
    end_date: asString("end_date") ?? null,
    banner_text: asString("banner_text"),
    banner_subtitle: asString("banner_subtitle"),
    brand_title: asString("brand_title"),
    brand_subtitle: asString("brand_subtitle"),
    discount_badge_color: asString("discount_badge_color"),
    updated_at: asString("updated_at"),
    banner_background_start: asString("banner_background_start"),
    banner_background_mid: asString("banner_background_mid"),
    banner_background_end: asString("banner_background_end"),
    banner_border_color: asString("banner_border_color"),
    banner_text_color: asString("banner_text_color"),
    banner_accent_text_color: asString("banner_accent_text_color"),
    layout_background_start: asString("layout_background_start"),
    layout_background_mid: asString("layout_background_mid"),
    layout_background_end: asString("layout_background_end"),
    layout_card_background: asString("layout_card_background"),
    layout_card_border: asString("layout_card_border"),
    layout_text_primary: asString("layout_text_primary"),
    layout_text_secondary: asString("layout_text_secondary"),
    card_background_start: asString("card_background_start"),
    card_background_mid: asString("card_background_mid"),
    card_background_end: asString("card_background_end"),
    card_border_color: asString("card_border_color"),
    card_border_hover: asString("card_border_hover"),
    card_text_color: asString("card_text_color"),
    card_text_secondary: asString("card_text_secondary"),
    button_primary_background: asString("button_primary_background"),
    button_primary_hover: asString("button_primary_hover"),
    button_primary_text: asString("button_primary_text"),
    button_primary_shadow: asString("button_primary_shadow"),
    price_original_color: asString("price_original_color"),
    price_discount_color: asString("price_discount_color"),
    price_currency_color: asString("price_currency_color"),
    badge_discount_text: asString("badge_discount_text"),
    badge_discount_shadow: asString("badge_discount_shadow"),
    checkmark_color: asString("checkmark_color"),
    badge_popular_background: asString("badge_popular_background"),
    badge_popular_text: asString("badge_popular_text"),
    shadow_color: asString("shadow_color"),
    ring_color: asString("ring_color"),
    glow_color: asString("glow_color"),
  };
}

export function AppThemeProvider({ children }: { readonly children: ReactNode }) {
  const [config, setConfig] = useState<BlackFridayConfig>({ enabled: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async (options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) {
        setLoading(true);
      }
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("app_config")
        .select("value")
        .eq("key", "black_friday_mode")
        .single();

      if (fetchError) {
        if (fetchError.code === "PGRST116") {
          setConfig({ enabled: false });
          return;
        }
        throw new Error(fetchError.message || "Erro ao buscar configuração");
      }

      if (data?.value && typeof data.value === "object") {
        setConfig(parseConfigValue(data.value as Record<string, unknown>));
      } else {
        setConfig({ enabled: false });
      }
    } catch (err) {
      console.error("Erro ao buscar configuração de tema:", err);
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      setConfig({ enabled: false });
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchConfig();
    const interval = setInterval(() => {
      void fetchConfig({ silent: true });
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchConfig]);

  useEffect(() => {
    if (loading) return;
    applyThemeCssVariables(buildAdminThemeCssVariables(config));
  }, [config, loading]);

  const value = useMemo<PlanPageThemeContextValue>(
    () => ({
      config,
      loading,
      error,
      campaignActive: config.enabled,
      refetch: fetchConfig,
    }),
    [config, loading, error, fetchConfig]
  );

  return (
    <PlanPageThemeContext.Provider value={value}>
      {children}
    </PlanPageThemeContext.Provider>
  );
}

export function usePlanPageTheme(): PlanPageThemeContextValue {
  const context = useContext(PlanPageThemeContext);
  if (!context) {
    throw new Error("usePlanPageTheme must be used within AppThemeProvider");
  }
  return context;
}
