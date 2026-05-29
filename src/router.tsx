import {
  createRouter,
  createRoute,
  createRootRoute,
  Outlet,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";

import RegisterScreen from "./components/RegisterScreen";
import {
  AuthCallbackScreen,
  ForgotPasswordScreen,
  PasswordResetEntryScreen,
  ResetPasswordScreen,
} from "./components/reset-password/PasswordResetScreens";
import DeleteAccountScreen from "./components/DeleteAccountScreen";
import PlansScreen from "./components/PlansScreen";
import SuccessScreen from "./components/SuccessScreen";
import NotFoundScreen from "./components/NotFoundScreen";

const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </>
  ),
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

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/registrar",
  component: RegisterScreen,
});

const deleteAccountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/delete-account",
  component: DeleteAccountScreen,
});

const plansRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/plans",
  component: PlansScreen,
});

const successRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/success",
  component: SuccessScreen,
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
  registerRoute,
  deleteAccountRoute,
  plansRoute,
  successRoute,
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
