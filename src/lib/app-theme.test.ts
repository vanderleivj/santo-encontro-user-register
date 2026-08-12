import { describe, expect, it } from "vitest";
import {
  ADMIN_DEFAULT_THEME,
  buildAdminThemeCssVariables,
  buildCheckoutThemeCssVariables,
  isDarkThemeLayout,
  mergeAdminThemeConfig,
} from "./app-theme";

describe("admin theme mapping", () => {
  it("merges partial admin config with Tema Padrão defaults", () => {
    const merged = mergeAdminThemeConfig({
      enabled: false,
      button_primary_background: "#FF0000",
    });
    expect(merged.button_primary_background).toBe("#FF0000");
    expect(merged.layout_background_start).toBe(
      ADMIN_DEFAULT_THEME.layout_background_start
    );
    expect(merged.enabled).toBe(false);
  });

  it("maps admin colors to CSS variables even when campaign is off", () => {
    const vars = buildAdminThemeCssVariables({
      enabled: false,
      layout_background_start: "#F9FAFB",
      layout_text_primary: "#1F2937",
      button_primary_background: "#1E293B",
      card_background_start: "#FFFFFF",
    });

    expect(vars["--layout-bg-start"]).toBe("#F9FAFB");
    expect(vars["--layout-text-primary"]).toBe("#1F2937");
    expect(vars["--button-primary-bg"]).toBe("#1E293B");
    expect(vars["--brand-accent"]).toBe("#1E293B");
    expect(vars["--card-bg-start"]).toBe("#FFFFFF");
    expect(vars["--theme-mode"]).toBe("admin");
  });

  it("marks campaign mode when enabled", () => {
    const vars = buildAdminThemeCssVariables({
      ...ADMIN_DEFAULT_THEME,
      enabled: true,
      layout_text_primary: "#FFFFFF",
      layout_background_start: "#000000",
    });
    expect(vars["--theme-mode"]).toBe("campaign");
    expect(isDarkThemeLayout({ enabled: true, layout_text_primary: "#FFFFFF" })).toBe(
      true
    );
    expect(isDarkThemeLayout(ADMIN_DEFAULT_THEME)).toBe(false);
  });

  it("builds checkout tokens from admin theme", () => {
    const vars = buildCheckoutThemeCssVariables({
      enabled: false,
      layout_text_primary: "#111827",
      layout_text_secondary: "#6B7280",
      button_primary_background: "#0F172A",
      layout_card_border: "#E5E7EB",
    });

    expect(vars["--checkout-ink"]).toBe("#111827");
    expect(vars["--checkout-ink-2"]).toBe("#6B7280");
    expect(vars["--checkout-line"]).toBe("#E5E7EB");
    expect(vars["--brand-accent"]).toBe("#0F172A");
    expect(vars["--theme-mode"]).toBe("checkout-admin");
  });
});
