import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export interface BlackFridayConfig {
  enabled: boolean;
  start_date?: string | null;
  end_date?: string | null;
  banner_text?: string;
  banner_subtitle?: string;
  brand_title?: string;
  brand_subtitle?: string;
  discount_badge_color?: string;
  updated_at?: string;

  banner_background_start?: string;
  banner_background_mid?: string;
  banner_background_end?: string;
  banner_border_color?: string;
  banner_text_color?: string;
  banner_accent_text_color?: string;

  layout_background_start?: string;
  layout_background_mid?: string;
  layout_background_end?: string;
  layout_card_background?: string;
  layout_card_border?: string;
  layout_text_primary?: string;
  layout_text_secondary?: string;

  card_background_start?: string;
  card_background_mid?: string;
  card_background_end?: string;
  card_border_color?: string;
  card_border_hover?: string;
  card_text_color?: string;
  card_text_secondary?: string;

  button_primary_background?: string;
  button_primary_hover?: string;
  button_primary_text?: string;
  button_primary_shadow?: string;

  price_original_color?: string;
  price_discount_color?: string;
  price_currency_color?: string;

  badge_discount_text?: string;
  badge_discount_shadow?: string;
  checkmark_color?: string;
  badge_popular_background?: string;
  badge_popular_text?: string;

  shadow_color?: string;
  ring_color?: string;
  glow_color?: string;
}

export const useBlackFriday = () => {
  const [config, setConfig] = useState<BlackFridayConfig>({
    enabled: false,
    banner_text: "BLACK FRIDAY",
    discount_badge_color: "#FF0000",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("app_config")
        .select("value")
        .eq("key", "black_friday_mode")
        .single();

      if (fetchError) {
        if (fetchError.code === "PGRST116") {
          setConfig({
            enabled: false,
            banner_text: "BLACK FRIDAY",
            discount_badge_color: "#FF0000",
          });
          return;
        }
        throw new Error(fetchError.message || "Erro ao buscar configuração");
      }

      if (data?.value) {
        const configValue = data.value as any;

        let isEnabled = Boolean(configValue.enabled) || false;

        if (isEnabled && configValue.start_date && configValue.end_date) {
          const now = new Date();
          const start = new Date(configValue.start_date);
          const end = new Date(configValue.end_date);
          end.setHours(23, 59, 59, 999);

          isEnabled = now >= start && now <= end;
        }

        setConfig({
          enabled: isEnabled,
          start_date: configValue.start_date,
          end_date: configValue.end_date,
          banner_text: configValue.banner_text || "BLACK FRIDAY",
          banner_subtitle: configValue.banner_subtitle,
          brand_title: configValue.brand_title,
          brand_subtitle: configValue.brand_subtitle,
          discount_badge_color: configValue.discount_badge_color || "#FF0000",
          updated_at: configValue.updated_at,
          banner_background_start: configValue.banner_background_start,
          banner_background_mid: configValue.banner_background_mid,
          banner_background_end: configValue.banner_background_end,
          banner_border_color: configValue.banner_border_color,
          banner_text_color: configValue.banner_text_color,
          banner_accent_text_color: configValue.banner_accent_text_color,

          layout_background_start: configValue.layout_background_start,
          layout_background_mid: configValue.layout_background_mid,
          layout_background_end: configValue.layout_background_end,
          layout_card_background: configValue.layout_card_background,
          layout_card_border: configValue.layout_card_border,
          layout_text_primary: configValue.layout_text_primary,
          layout_text_secondary: configValue.layout_text_secondary,

          card_background_start: configValue.card_background_start,
          card_background_mid: configValue.card_background_mid,
          card_background_end: configValue.card_background_end,
          card_border_color: configValue.card_border_color,
          card_border_hover: configValue.card_border_hover,
          card_text_color: configValue.card_text_color,
          card_text_secondary: configValue.card_text_secondary,

          button_primary_background: configValue.button_primary_background,
          button_primary_hover: configValue.button_primary_hover,
          button_primary_text: configValue.button_primary_text,
          button_primary_shadow: configValue.button_primary_shadow,

          price_original_color: configValue.price_original_color,
          price_discount_color: configValue.price_discount_color,
          price_currency_color: configValue.price_currency_color,

          badge_discount_text: configValue.badge_discount_text,
          badge_discount_shadow: configValue.badge_discount_shadow,
          checkmark_color: configValue.checkmark_color,
          badge_popular_background: configValue.badge_popular_background,
          badge_popular_text: configValue.badge_popular_text,

          shadow_color: configValue.shadow_color,
          ring_color: configValue.ring_color,
          glow_color: configValue.glow_color,
        });
      }
    } catch (err) {
      console.error("Erro ao buscar configuração Black Friday:", err);
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      setConfig({
        enabled: false,
        banner_text: "BLACK FRIDAY",
        discount_badge_color: "#FF0000",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();

    const interval = setInterval(fetchConfig, 60000);

    return () => clearInterval(interval);
  }, []);

  return {
    config,
    loading,
    error,
    refetch: fetchConfig,
  };
};
