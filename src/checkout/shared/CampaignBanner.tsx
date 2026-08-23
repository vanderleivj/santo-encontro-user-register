import { Megaphone } from "lucide-react";
import { useBlackFriday } from "../../hooks/useBlackFriday";

export function CampaignBanner() {
  const { campaignActive, config } = useBlackFriday();

  if (!campaignActive) return null;

  const title = config.banner_text?.trim() || "Campanha especial";
  const subtitle = config.banner_subtitle?.trim();

  return (
    <aside
      className="mx-auto w-full max-w-[880px] overflow-hidden rounded-2xl border-2 px-4 py-3.5 sm:px-5 sm:py-4"
      style={{
        background:
          "linear-gradient(to right, var(--banner-bg-start), var(--banner-bg-mid), var(--banner-bg-end))",
        borderColor: "var(--banner-border)",
        color: "var(--banner-text)",
        boxShadow:
          "0 10px 28px -14px var(--layout-shadow, rgba(15, 40, 70, 0.28))",
      }}
      aria-label="Campanha ativa"
    >
      <div className="flex flex-col items-center gap-2.5 text-center sm:flex-row sm:items-center sm:justify-center sm:gap-4 sm:text-left">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{
            backgroundColor: "color-mix(in srgb, var(--banner-text) 14%, transparent)",
            color: "var(--banner-accent-text)",
          }}
          aria-hidden
        >
          <Megaphone className="h-4 w-4" strokeWidth={2} />
        </span>

        <div className="min-w-0 space-y-1 sm:space-y-0">
          <p className="font-[family-name:var(--font-display)] text-[15px] font-semibold leading-snug tracking-wide sm:text-base">
            {title}
          </p>
          {subtitle ? (
            <div className="flex flex-col items-center gap-2 sm:mt-0.5 sm:flex-row sm:gap-3">
              <span
                className="hidden h-5 w-px shrink-0 sm:block"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--banner-text) 35%, transparent)",
                }}
                aria-hidden
              />
              <p
                className="text-sm font-medium leading-relaxed sm:text-[15px]"
                style={{ color: "var(--banner-accent-text)" }}
              >
                {subtitle}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
