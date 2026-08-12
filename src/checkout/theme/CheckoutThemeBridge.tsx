import { useEffect, type ReactNode } from "react";
import { useBlackFriday } from "../../hooks/useBlackFriday";
import {
  applyThemeCssVariables,
  buildAdminThemeCssVariables,
  buildCheckoutThemeCssVariables,
} from "../../lib/app-theme";

interface CheckoutThemeBridgeProps {
  readonly children: ReactNode;
}

export function CheckoutThemeBridge({ children }: CheckoutThemeBridgeProps) {
  const { config, loading } = useBlackFriday();

  useEffect(() => {
    if (loading) return;
    applyThemeCssVariables(buildCheckoutThemeCssVariables(config));

    return () => {
      applyThemeCssVariables(buildAdminThemeCssVariables(config));
    };
  }, [config, loading]);

  return <>{children}</>;
}
