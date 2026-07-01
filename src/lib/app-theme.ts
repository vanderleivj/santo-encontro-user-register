import type { BlackFridayConfig } from "../hooks/useBlackFriday";

/** Paleta Expo Católica — azul metálico, laranja e dourado */
export const EXPO_CATOLICA_BRAND = {
  /** Base metálica */
  metallicDark: "#051C3F",
  metallic: "#00255D",
  metallicLight: "#0A3D7A",
  metallicSheen: "rgba(147, 197, 253, 0.14)",
  primary: "#00255D",
  primaryDark: "#051C3F",
  primaryMid: "#0A3D7A",
  accent: "#FF7415",
  accentHover: "#E8650F",
  gold: "#D4AF37",
  goldLight: "#FFD28A",
  gray: "#E3E3E4",
  registerBg: "#051C3F",
  registerSecondary: "#93C5FD",
  layoutBgStart: "#051C3F",
  layoutBgMid: "#00255D",
  layoutBgEnd: "#0A3D7A",
  textPrimary: "#00255D",
  textSecondary: "#3D5A80",
  textOnDark: "#FFFFFF",
  textMutedOnDark: "#E3E3E4",
  buttonPrimary: "#FF7415",
  buttonPrimaryHover: "#E8650F",
  buttonPrimaryText: "#FFFFFF",
  cardBackground: "rgba(255, 255, 255, 0.97)",
  cardBorder: "rgba(212, 175, 55, 0.35)",
  shadow: "rgba(0, 37, 93, 0.45)",
} as const;

export const METALLIC_BLUE_GRADIENT = `linear-gradient(
  135deg,
  ${EXPO_CATOLICA_BRAND.metallicDark} 0%,
  ${EXPO_CATOLICA_BRAND.metallic} 48%,
  ${EXPO_CATOLICA_BRAND.metallicLight} 100%
)`;

/** Identidade visual fixa — não é sobrescrita por campanhas do admin */
export function buildThemeCssVariables(): Record<string, string> {
  const brand = EXPO_CATOLICA_BRAND;

  return {
    "--register-primary": brand.primary,
    "--register-secondary": brand.registerSecondary,
    "--register-bg": brand.registerBg,
    "--brand-accent": brand.accent,
    "--brand-accent-hover": brand.accentHover,
    "--brand-gold": brand.gold,
    "--metallic-dark": brand.metallicDark,
    "--metallic-mid": brand.metallic,
    "--metallic-light": brand.metallicLight,
    "--metallic-sheen": brand.metallicSheen,
    "--layout-bg-start": brand.layoutBgStart,
    "--layout-bg-mid": brand.layoutBgMid,
    "--layout-bg-end": brand.layoutBgEnd,
    "--layout-text-primary": brand.textOnDark,
    "--layout-text-secondary": brand.textMutedOnDark,
    "--layout-text-muted": "rgba(227, 227, 228, 0.75)",
    "--layout-text-on-card": brand.textPrimary,
    "--button-primary-bg": brand.buttonPrimary,
    "--button-primary-hover": brand.buttonPrimaryHover,
    "--button-primary-text": brand.buttonPrimaryText,
    "--layout-card-bg": brand.cardBackground,
    "--layout-card-border": brand.cardBorder,
    "--layout-shadow": brand.shadow,
    "--input-focus-border": brand.accent,
    "--theme-mode": "brand",
  };
}

export function applyThemeCssVariables(vars: Record<string, string>) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

export function isDarkCampaignLayout(config: BlackFridayConfig): boolean {
  if (!config.enabled) return false;
  const text = (config.layout_text_primary || "").toUpperCase().replace(/\s/g, "");
  return text === "#FFFFFF" || text === "#FFF" || text === "WHITE";
}

export function getCampaignPageBackground(config: BlackFridayConfig): string {
  return `linear-gradient(135deg, ${
    config.layout_background_start || EXPO_CATOLICA_BRAND.metallicDark
  } 0%, ${config.layout_background_mid || EXPO_CATOLICA_BRAND.metallic} 48%, ${
    config.layout_background_end || EXPO_CATOLICA_BRAND.metallicLight
  } 100%)`;
}
