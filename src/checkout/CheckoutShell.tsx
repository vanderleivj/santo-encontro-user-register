import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import logo from "../assets/logo.png";
import { CheckoutThemeBridge } from "./theme/CheckoutThemeBridge";
import { CheckoutStepper } from "./CheckoutStepper";
import { OrderSummary } from "./OrderSummary";
import { SupportWhatsApp } from "./shared/SupportWhatsApp";
import { useIsAppWebView } from "./shared/app-webview";
import type { CheckoutStep } from "./checkout-store";

interface CheckoutShellProps {
  readonly step: CheckoutStep;
  readonly title: string;
  readonly subtitle?: string;
  readonly children: ReactNode;
  readonly showSummary?: boolean;
  readonly showChangePlan?: boolean;
  readonly fullWidth?: boolean;
  readonly bareContent?: boolean;
  readonly showSupport?: boolean;
  readonly showHeader?: boolean;
  readonly showStepper?: boolean;
  readonly showLoginCta?: boolean;
  readonly contentMaxWidthClassName?: string;
}

export function CheckoutShell({
  step,
  title,
  subtitle,
  children,
  showSummary = true,
  showChangePlan = true,
  fullWidth = false,
  bareContent = false,
  showSupport = true,
  showHeader,
  showStepper,
  showLoginCta = true,
  contentMaxWidthClassName,
}: CheckoutShellProps) {
  const isAppWebView = useIsAppWebView();
  const shouldShowHeader = showHeader ?? !isAppWebView;
  const shouldShowStepper = showStepper ?? !isAppWebView;
  const withSidebar = showSummary && !fullWidth && !isAppWebView;
  const mainMax =
    contentMaxWidthClassName ||
    (withSidebar ? "max-w-[1140px]" : "max-w-[880px]");

  return (
    <CheckoutThemeBridge>
      <div className="checkout-pencil min-h-[100dvh] bg-[var(--register-bg,#FBF8F3)] text-[var(--checkout-ink,#0F2846)]">
        {shouldShowHeader ? (
          <header className="w-full border-b border-[var(--checkout-line,#E6DFD4)] bg-white">
            <div className="max-w-[1440px] mx-auto px-5 sm:px-10 py-5 flex items-center justify-between gap-4">
              <Link to="/planos" className="flex items-center gap-3 min-w-0">
                <img
                  src={logo}
                  alt="Santo Encontro"
                  className="w-9 h-9 object-contain rounded-xl shrink-0"
                />
                <span className="font-[family-name:var(--font-display)] text-[17px] font-semibold text-[var(--checkout-ink,#0F2846)] truncate tracking-tight">
                  Santo Encontro
                </span>
              </Link>
              {showLoginCta ? (
                <div className="flex items-center gap-4 text-sm text-[var(--checkout-ink-2,#55647A)]">
                  <span className="hidden sm:inline">Já tem conta?</span>
                  <Link
                    to="/entrar"
                    search={{ next: undefined, email: undefined }}
                    className="inline-flex items-center rounded-xl border border-[var(--checkout-line-strong,#CFC5B6)] bg-white px-[18px] py-2.5 font-semibold text-[var(--checkout-ink,#0F2846)] hover:border-[var(--brand-accent)] hover:text-[var(--brand-accent)] transition-colors"
                  >
                    Entrar
                  </Link>
                </div>
              ) : (
                <div className="w-[1px]" aria-hidden />
              )}
            </div>
          </header>
        ) : null}

        <div
          className={`${mainMax} mx-auto px-5 sm:px-10 ${
            shouldShowHeader ? "py-10 sm:py-14" : "py-6 sm:py-8"
          }`}
        >
          {withSidebar ? (
            <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-8 items-start">
              <div className="space-y-6 min-w-0">
                {shouldShowStepper ? (
                  <CheckoutStepper current={step} align="start" />
                ) : null}
                <div className="space-y-2">
                  <h1 className="font-[family-name:var(--font-display)] text-[1.875rem] sm:text-[34px] font-semibold text-[var(--checkout-ink,#0F2846)] tracking-tight leading-[1.2]">
                    {title}
                  </h1>
                  {subtitle ? (
                    <p className="text-base text-[var(--checkout-ink-2,#55647A)] leading-[1.55]">
                      {subtitle}
                    </p>
                  ) : null}
                </div>
                {bareContent ? (
                  children
                ) : (
                  <div className="rounded-2xl bg-white border border-[var(--checkout-line-strong,#CFC5B6)] p-6 sm:p-8">
                    {children}
                  </div>
                )}
              </div>

              <div className="lg:sticky lg:top-6 space-y-4">
                <OrderSummary
                  showChangePlan={showChangePlan}
                  className="hidden lg:block"
                />
                <OrderSummary
                  showChangePlan={showChangePlan}
                  className="lg:hidden"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-10">
              {shouldShowStepper ? (
                <CheckoutStepper current={step} align="center" />
              ) : null}
              <div
                className={`space-y-4 ${
                  bareContent || fullWidth
                    ? "text-center mx-auto max-w-[660px]"
                    : ""
                }`}
              >
                <h1 className="font-[family-name:var(--font-display)] text-[2rem] sm:text-5xl font-semibold text-[var(--checkout-ink,#0F2846)] tracking-tight leading-[1.1]">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="text-base sm:text-[17px] text-[var(--checkout-ink-2,#55647A)] leading-[1.6]">
                    {subtitle}
                  </p>
                ) : null}
              </div>
              {bareContent ? (
                children
              ) : (
                <div className="rounded-2xl bg-white border border-[var(--checkout-line,#E6DFD4)] shadow-sm p-5 sm:p-6">
                  {children}
                </div>
              )}
              {showSupport && !isAppWebView ? <SupportWhatsApp /> : null}
            </div>
          )}
        </div>
      </div>
    </CheckoutThemeBridge>
  );
}
