/** Contrato snake_case de app_config.black_friday_mode (admin). */
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

/** Fallback local quando ainda não há config do admin (Expo Católica). */
export const EXPO_CATOLICA_BRAND = {
  metallicDark: "#051C3F",
  metallic: "#00255D",
  metallicLight: "#0A3D7A",
  metallicSheen: "rgba(147, 197, 253, 0.14)",
  primary: "#00255D",
  accent: "#FF7415",
  accentHover: "#E8650F",
  gold: "#D4AF37",
  registerBg: "#051C3F",
  registerSecondary: "#93C5FD",
  layoutBgStart: "#051C3F",
  layoutBgMid: "#00255D",
  layoutBgEnd: "#0A3D7A",
  textPrimary: "#00255D",
  textOnDark: "#FFFFFF",
  textMutedOnDark: "#E3E3E4",
  buttonPrimary: "#FF7415",
  buttonPrimaryHover: "#E8650F",
  buttonPrimaryText: "#FFFFFF",
  cardBackground: "rgba(255, 255, 255, 0.97)",
  cardBorder: "rgba(212, 175, 55, 0.35)",
  shadow: "rgba(0, 37, 93, 0.45)",
} as const;

/**
 * Espelha o "Tema Padrão" do admin (ThemePresets).
 * Usado quando o app_config existe mas campos específicos faltam.
 */
export const ADMIN_DEFAULT_THEME: BlackFridayConfig = {
  enabled: false,
  banner_text: "Planos Santo Encontro",
  banner_subtitle: "Escolha o plano ideal para sua jornada",
  brand_title: "Santo Encontro",
  brand_subtitle: "Juntos na fé, unidos pelo amor",
  banner_text_color: "#FFFFFF",
  banner_accent_text_color: "#FDE047",
  banner_border_color: "#DC2626",
  banner_background_start: "#000000",
  banner_background_mid: "#7F1D1D",
  banner_background_end: "#000000",
  card_text_color: "#1F2937",
  card_text_secondary: "#6B7280",
  card_border_color: "#E5E7EB",
  card_border_hover: "#D1D5DB",
  card_background_start: "#FFFFFF",
  card_background_mid: "#FFFFFF",
  card_background_end: "#FFFFFF",
  layout_text_primary: "#1F2937",
  layout_text_secondary: "#6B7280",
  layout_card_background: "#FFFFFF",
  layout_card_border: "#E5E7EB",
  layout_background_start: "#F9FAFB",
  layout_background_mid: "#F3F4F6",
  layout_background_end: "#FFFFFF",
  button_primary_background: "#1E293B",
  button_primary_hover: "#334155",
  button_primary_text: "#FFFFFF",
  button_primary_shadow: "rgba(0, 0, 0, 0.1)",
  discount_badge_color: "#10B981",
  badge_discount_text: "#FFFFFF",
  badge_discount_shadow: "rgba(16, 185, 129, 0.3)",
  badge_popular_background: "#3B82F6",
  badge_popular_text: "#FFFFFF",
  price_original_color: "#9CA3AF",
  price_discount_color: "#1F2937",
  price_currency_color: "#1F2937",
  glow_color: "rgba(59, 130, 246, 0.3)",
  ring_color: "rgba(59, 130, 246, 0.2)",
  shadow_color: "rgba(0, 0, 0, 0.1)",
  checkmark_color: "#10B981",
};

function pick(
  value: string | null | undefined,
  fallback: string
): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function isLightHex(color: string): boolean {
  const normalized = color.trim().toUpperCase();
  if (
    normalized === "#FFF" ||
    normalized === "#FFFFFF" ||
    normalized === "WHITE"
  ) {
    return true;
  }
  const hex = normalized.replace("#", "");
  if (!/^[0-9A-F]{6}$/.test(hex)) return false;
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.72;
}

export function mergeAdminThemeConfig(
  config?: Partial<BlackFridayConfig> | null
): BlackFridayConfig {
  return {
    ...ADMIN_DEFAULT_THEME,
    ...(config ?? {}),
    enabled: Boolean(config?.enabled),
  };
}

/** Identidade visual a partir da estrutura de tema do admin. */
export function buildAdminThemeCssVariables(
  config?: Partial<BlackFridayConfig> | null
): Record<string, string> {
  const theme = mergeAdminThemeConfig(config);
  const layoutStart = pick(
    theme.layout_background_start,
    ADMIN_DEFAULT_THEME.layout_background_start!
  );
  const layoutMid = pick(
    theme.layout_background_mid,
    ADMIN_DEFAULT_THEME.layout_background_mid!
  );
  const layoutEnd = pick(
    theme.layout_background_end,
    ADMIN_DEFAULT_THEME.layout_background_end!
  );
  const layoutTextPrimary = pick(
    theme.layout_text_primary,
    ADMIN_DEFAULT_THEME.layout_text_primary!
  );
  const layoutTextSecondary = pick(
    theme.layout_text_secondary,
    ADMIN_DEFAULT_THEME.layout_text_secondary!
  );
  const buttonBg = pick(
    theme.button_primary_background,
    ADMIN_DEFAULT_THEME.button_primary_background!
  );
  const buttonHover = pick(
    theme.button_primary_hover,
    ADMIN_DEFAULT_THEME.button_primary_hover!
  );
  const buttonText = pick(
    theme.button_primary_text,
    ADMIN_DEFAULT_THEME.button_primary_text!
  );
  const cardBg = pick(
    theme.layout_card_background,
    ADMIN_DEFAULT_THEME.layout_card_background!
  );
  const cardBorder = pick(
    theme.layout_card_border || theme.card_border_color,
    ADMIN_DEFAULT_THEME.layout_card_border!
  );
  const cardText = pick(
    theme.card_text_color,
    ADMIN_DEFAULT_THEME.card_text_color!
  );
  const shadow = pick(theme.shadow_color, ADMIN_DEFAULT_THEME.shadow_color!);
  const darkSurface = !isLightHex(layoutTextPrimary);

  return {
    "--register-primary": darkSurface
      ? layoutTextPrimary
      : pick(theme.card_text_color, layoutTextPrimary),
    "--register-secondary": layoutTextSecondary,
    "--register-bg": layoutStart,
    "--brand-accent": buttonBg,
    "--brand-accent-hover": buttonHover,
    "--brand-gold": pick(
      theme.banner_accent_text_color,
      EXPO_CATOLICA_BRAND.gold
    ),
    "--metallic-dark": layoutStart,
    "--metallic-mid": layoutMid,
    "--metallic-light": layoutEnd,
    "--metallic-sheen": darkSurface
      ? EXPO_CATOLICA_BRAND.metallicSheen
      : "transparent",
    "--layout-bg-start": layoutStart,
    "--layout-bg-mid": layoutMid,
    "--layout-bg-end": layoutEnd,
    "--layout-text-primary": layoutTextPrimary,
    "--layout-text-secondary": layoutTextSecondary,
    "--layout-text-muted": `color-mix(in srgb, ${layoutTextSecondary} 70%, transparent)`,
    "--layout-text-on-card": cardText,
    "--button-primary-bg": buttonBg,
    "--button-primary-hover": buttonHover,
    "--button-primary-text": buttonText,
    "--button-primary-shadow": pick(
      theme.button_primary_shadow,
      ADMIN_DEFAULT_THEME.button_primary_shadow!
    ),
    "--layout-card-bg": cardBg,
    "--layout-card-border": cardBorder,
    "--layout-shadow": shadow,
    "--input-focus-border": buttonBg,
    "--card-bg-start": pick(
      theme.card_background_start,
      ADMIN_DEFAULT_THEME.card_background_start!
    ),
    "--card-bg-mid": pick(
      theme.card_background_mid,
      ADMIN_DEFAULT_THEME.card_background_mid!
    ),
    "--card-bg-end": pick(
      theme.card_background_end,
      ADMIN_DEFAULT_THEME.card_background_end!
    ),
    "--card-border": pick(
      theme.card_border_color,
      ADMIN_DEFAULT_THEME.card_border_color!
    ),
    "--card-border-hover": pick(
      theme.card_border_hover,
      ADMIN_DEFAULT_THEME.card_border_hover!
    ),
    "--card-text": cardText,
    "--card-text-secondary": pick(
      theme.card_text_secondary,
      ADMIN_DEFAULT_THEME.card_text_secondary!
    ),
    "--banner-bg-start": pick(
      theme.banner_background_start,
      ADMIN_DEFAULT_THEME.banner_background_start!
    ),
    "--banner-bg-mid": pick(
      theme.banner_background_mid,
      ADMIN_DEFAULT_THEME.banner_background_mid!
    ),
    "--banner-bg-end": pick(
      theme.banner_background_end,
      ADMIN_DEFAULT_THEME.banner_background_end!
    ),
    "--banner-border": pick(
      theme.banner_border_color,
      ADMIN_DEFAULT_THEME.banner_border_color!
    ),
    "--banner-text": pick(
      theme.banner_text_color,
      ADMIN_DEFAULT_THEME.banner_text_color!
    ),
    "--banner-accent-text": pick(
      theme.banner_accent_text_color,
      ADMIN_DEFAULT_THEME.banner_accent_text_color!
    ),
    "--price-original": pick(
      theme.price_original_color,
      ADMIN_DEFAULT_THEME.price_original_color!
    ),
    "--price-discount": pick(
      theme.price_discount_color,
      ADMIN_DEFAULT_THEME.price_discount_color!
    ),
    "--price-currency": pick(
      theme.price_currency_color,
      ADMIN_DEFAULT_THEME.price_currency_color!
    ),
    "--badge-discount-bg": pick(
      theme.discount_badge_color,
      ADMIN_DEFAULT_THEME.discount_badge_color!
    ),
    "--badge-discount-text": pick(
      theme.badge_discount_text,
      ADMIN_DEFAULT_THEME.badge_discount_text!
    ),
    "--badge-discount-shadow": pick(
      theme.badge_discount_shadow,
      ADMIN_DEFAULT_THEME.badge_discount_shadow!
    ),
    "--badge-popular-bg": pick(
      theme.badge_popular_background,
      ADMIN_DEFAULT_THEME.badge_popular_background!
    ),
    "--badge-popular-text": pick(
      theme.badge_popular_text,
      ADMIN_DEFAULT_THEME.badge_popular_text!
    ),
    "--glow-color": pick(theme.glow_color, ADMIN_DEFAULT_THEME.glow_color!),
    "--ring-color": pick(theme.ring_color, ADMIN_DEFAULT_THEME.ring_color!),
    "--checkmark-color": pick(
      theme.checkmark_color,
      ADMIN_DEFAULT_THEME.checkmark_color!
    ),
    "--theme-mode": theme.enabled ? "campaign" : "admin",
  };
}

/** @deprecated Use buildAdminThemeCssVariables — mantido para compat. */
export function buildThemeCssVariables(): Record<string, string> {
  return buildAdminThemeCssVariables(ADMIN_DEFAULT_THEME);
}

/** @deprecated Use buildAdminThemeCssVariables. */
export function buildCampaignCssVariables(
  config: BlackFridayConfig
): Record<string, string> {
  return buildAdminThemeCssVariables(config);
}

export function applyThemeCssVariables(vars: Record<string, string>) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

export function isDarkThemeLayout(
  config?: Partial<BlackFridayConfig> | null
): boolean {
  const theme = mergeAdminThemeConfig(config);
  return isLightHex(
    pick(theme.layout_text_primary, ADMIN_DEFAULT_THEME.layout_text_primary!)
  );
}

/** @deprecated Use isDarkThemeLayout. */
export function isDarkCampaignLayout(config: BlackFridayConfig): boolean {
  return isDarkThemeLayout(config);
}

export function getThemePageBackground(
  config?: Partial<BlackFridayConfig> | null
): string {
  const theme = mergeAdminThemeConfig(config);
  return `linear-gradient(135deg, ${pick(
    theme.layout_background_start,
    ADMIN_DEFAULT_THEME.layout_background_start!
  )} 0%, ${pick(
    theme.layout_background_mid,
    ADMIN_DEFAULT_THEME.layout_background_mid!
  )} 48%, ${pick(
    theme.layout_background_end,
    ADMIN_DEFAULT_THEME.layout_background_end!
  )} 100%)`;
}

/** @deprecated Use getThemePageBackground. */
export function getCampaignPageBackground(config: BlackFridayConfig): string {
  return getThemePageBackground(config);
}

/** Checkout: tema admin + tokens de superfície do wizard. */
export function buildCheckoutThemeCssVariables(
  config?: Partial<BlackFridayConfig> | null
): Record<string, string> {
  const theme = mergeAdminThemeConfig(config);
  const base = buildAdminThemeCssVariables(theme);
  const ink = pick(
    theme.layout_text_primary || theme.card_text_color,
    ADMIN_DEFAULT_THEME.layout_text_primary!
  );
  const ink2 = pick(
    theme.layout_text_secondary || theme.card_text_secondary,
    ADMIN_DEFAULT_THEME.layout_text_secondary!
  );
  const line = pick(
    theme.layout_card_border || theme.card_border_color,
    ADMIN_DEFAULT_THEME.layout_card_border!
  );
  const buttonBg = pick(
    theme.button_primary_background,
    ADMIN_DEFAULT_THEME.button_primary_background!
  );
  const surface = pick(
    theme.layout_card_background,
    ADMIN_DEFAULT_THEME.layout_card_background!
  );
  const canvas = pick(
    theme.layout_background_start,
    ADMIN_DEFAULT_THEME.layout_background_start!
  );

  return {
    ...base,
    "--register-bg": canvas,
    "--layout-text-on-card": ink,
    "--checkout-ink": ink,
    "--checkout-ink-2": ink2,
    "--checkout-ink-3": `color-mix(in srgb, ${ink2} 75%, white)`,
    "--checkout-sunken": `color-mix(in srgb, ${canvas} 85%, ${ink} 15%)`,
    "--checkout-line": line,
    "--checkout-line-strong": `color-mix(in srgb, ${line} 70%, ${ink} 30%)`,
    "--checkout-primary-soft": `color-mix(in srgb, ${buttonBg} 12%, white)`,
    "--checkout-navy-deep": ink,
    "--checkout-success": pick(
      theme.checkmark_color,
      ADMIN_DEFAULT_THEME.checkmark_color!
    ),
    "--checkout-success-soft": `color-mix(in srgb, ${pick(
      theme.checkmark_color,
      ADMIN_DEFAULT_THEME.checkmark_color!
    )} 12%, white)`,
    "--layout-card-bg": surface,
    "--font-display": "'Fraunces', Georgia, serif",
    "--font-body": "'Inter', system-ui, sans-serif",
    "--theme-mode": theme.enabled ? "checkout-campaign" : "checkout-admin",
  };
}

/** @deprecated Use buildCheckoutThemeCssVariables. */
export function buildCheckoutLightCssVariables(): Record<string, string> {
  return buildCheckoutThemeCssVariables(ADMIN_DEFAULT_THEME);
}

export const PENCIL_CHECKOUT = {
  ink: "#0F2846",
  ink2: "#55647A",
  ink3: "#8493A6",
  surface: "#FFFFFF",
  canvas: "#FBF8F3",
  sunken: "#F4EFE7",
  line: "#E6DFD4",
  lineStrong: "#CFC5B6",
  primary: "#C2410C",
  primaryDeep: "#9A3412",
  primarySoft: "#FFF1E7",
  navyDeep: "#0A1D34",
  success: "#15803D",
  successSoft: "#ECFDF3",
  shadow: "#0F284620",
  fontDisplay: "Fraunces",
  fontBody: "Inter",
} as const;

export const METALLIC_BLUE_GRADIENT = `linear-gradient(
  135deg,
  ${EXPO_CATOLICA_BRAND.metallicDark} 0%,
  ${EXPO_CATOLICA_BRAND.metallic} 48%,
  ${EXPO_CATOLICA_BRAND.metallicLight} 100%
)`;
