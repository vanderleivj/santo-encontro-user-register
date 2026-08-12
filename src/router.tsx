import {
  createRouter,
  createRoute,
  createRootRoute,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";

import {
  AuthCallbackScreen,
  ForgotPasswordScreen,
  PasswordResetEntryScreen,
  ResetPasswordScreen,
} from "./components/reset-password/PasswordResetScreens";
import DeleteAccountScreen from "./components/DeleteAccountScreen";
import NotFoundScreen from "./components/NotFoundScreen";
import { PlanModule } from "./checkout/modules/plan/PlanModule";
import { AccountModule } from "./checkout/modules/account/AccountModule";
import { ProfileModule } from "./checkout/modules/account/ProfileModule";
import { PaymentModule } from "./checkout/modules/payment/PaymentModule";
import { LoginScreen } from "./checkout/modules/account/LoginScreen";
import { SuccessModule } from "./checkout/modules/SuccessModule";
import { UpgradeModule } from "./checkout/modules/upgrade/UpgradeModule";
import { PlanManageModule } from "./checkout/modules/plan-manage/PlanManageModule";
import {
  parseAppWebViewSearch,
  useIsAppWebView,
} from "./checkout/shared/app-webview";

function RootLayout() {
  const isAppWebView = useIsAppWebView();

  return (
    <>
      <Outlet />
      {import.meta.env.DEV && !isAppWebView ? <TanStackRouterDevtools /> : null}
    </>
  );
}

const rootRoute = createRootRoute({
  component: RootLayout,
});

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: PasswordResetEntryScreen,
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/forgot-password",
  component: ForgotPasswordScreen,
});

const authCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/auth/callback",
  component: AuthCallbackScreen,
});

const newPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reset-password",
  component: ResetPasswordScreen,
});

const planosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/planos",
  component: PlanModule,
});

const contaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/conta",
  component: AccountModule,
});

const contaUpgradeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/conta/upgrade",
  validateSearch: parseAppWebViewSearch,
  component: UpgradeModule,
});

const contaPlanoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/conta/plano",
  validateSearch: parseAppWebViewSearch,
  component: PlanManageModule,
});

const sobreVoceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sobre-voce",
  component: ProfileModule,
});

const pagamentoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/pagamento",
  component: PaymentModule,
});

const sucessoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sucesso",
  validateSearch: (search: Record<string, unknown>) => ({
    trial: typeof search.trial === "string" ? search.trial : undefined,
    days: typeof search.days === "string" ? search.days : undefined,
    planLabel:
      typeof search.planLabel === "string" ? search.planLabel : undefined,
    amount: typeof search.amount === "string" ? search.amount : undefined,
    method: typeof search.method === "string" ? search.method : undefined,
  }),
  component: SuccessModule,
});

const entrarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/entrar",
  validateSearch: (search: Record<string, unknown>) => ({
    next: typeof search.next === "string" ? search.next : undefined,
    email: typeof search.email === "string" ? search.email : undefined,
  }),
  component: LoginScreen,
});

const registerRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/registrar",
  beforeLoad: () => {
    throw redirect({ to: "/planos" });
  },
  component: () => null,
});

const plansRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/plans",
  beforeLoad: () => {
    throw redirect({ to: "/planos" });
  },
  component: () => null,
});

const successRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/success",
  beforeLoad: (ctx) => {
    const search = ctx.search as Record<string, unknown>;
    throw redirect({
      to: "/sucesso",
      search: {
        trial: typeof search.trial === "string" ? search.trial : undefined,
        days: typeof search.days === "string" ? search.days : undefined,
        planLabel:
          typeof search.planLabel === "string" ? search.planLabel : undefined,
        amount: typeof search.amount === "string" ? search.amount : undefined,
        method:
          typeof search.method === "string"
            ? search.method
            : typeof search.paymentMethod === "string"
              ? search.paymentMethod
              : undefined,
      },
    });
  },
  component: () => null,
});

const deleteAccountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/delete-account",
  component: DeleteAccountScreen,
});

const catchAllRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "*",
  component: NotFoundScreen,
});

const routeTree = rootRoute.addChildren([
  resetPasswordRoute,
  forgotPasswordRoute,
  authCallbackRoute,
  newPasswordRoute,
  planosRoute,
  contaRoute,
  contaUpgradeRoute,
  contaPlanoRoute,
  sobreVoceRoute,
  pagamentoRoute,
  sucessoRoute,
  entrarRoute,
  registerRedirectRoute,
  plansRedirectRoute,
  successRedirectRoute,
  deleteAccountRoute,
  catchAllRoute,
]);

export const router = createRouter({
  routeTree,
  basepath: "/",
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
