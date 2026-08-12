import { Navigate } from "@tanstack/react-router";

export function RedirectToPlanos() {
  return <Navigate to="/planos" replace />;
}

export function RedirectToSucesso() {
  return (
    <Navigate
      to="/sucesso"
      replace
      search={{
        trial: undefined,
        days: undefined,
        planLabel: undefined,
        amount: undefined,
        method: undefined,
      }}
    />
  );
}
