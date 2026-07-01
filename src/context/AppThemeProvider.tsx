import { useEffect } from "react";
import { applyThemeCssVariables, buildThemeCssVariables } from "../lib/app-theme";

export function AppThemeProvider({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  useEffect(() => {
    applyThemeCssVariables(buildThemeCssVariables());
  }, []);

  return <>{children}</>;
}
