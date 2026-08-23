import { useEffect, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import logo from "../../../assets/logo.png";
import { supabase } from "../../../lib/supabase";
import { CheckoutThemeBridge } from "../../theme/CheckoutThemeBridge";
import { SupportWhatsApp } from "../../shared/SupportWhatsApp";
import { useCheckoutStore } from "../../checkout-store";
import { resolveCheckoutDestination } from "../../shared/resolve-checkout-destination";
import type { PlanConfig } from "../../../hooks/usePlans";
import {
  registerInputClass,
  registerLabelClass,
} from "../../../components/register/form-styles";
import { fetchInactiveRegistrationStatus, INACTIVE_REGISTRATION_MESSAGE } from "../../../lib/inactive-registration";

export function LoginScreen() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as {
    next?: string;
    email?: string;
  };
  const selectedPlan = useCheckoutStore(
    (state) => state.selectedPlan as PlanConfig | null
  );
  const [email, setEmail] = useState(search.email ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (search.email) setEmail(search.email);
  }, [search.email]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const inactive = await fetchInactiveRegistrationStatus({ email });
      if (inactive.exists) {
        toast.error(INACTIVE_REGISTRATION_MESSAGE);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Sessão inválida após o login.");
      }

      useCheckoutStore.getState().bindCheckoutOwner(user.id);
      useCheckoutStore.getState().setAccountCompleted(true);

      const preferredNext = search.next;
      const resolved = await resolveCheckoutDestination({
        userId: user.id,
        hasSelectedPlan: Boolean(selectedPlan),
        preferredNext,
      });

      if (resolved.profileComplete) {
        useCheckoutStore.getState().setProfileCompleted(true);
      }

      toast.success(resolved.message ?? "Login realizado!");

      const params = new URLSearchParams(
        preferredNext?.includes("?")
          ? preferredNext.split("?")[1] ?? ""
          : ""
      );
      const appSearch = {
        app: params.get("app") ?? undefined,
        embed: params.get("embed") ?? undefined,
      };

      if (resolved.destination === "/conta/plano") {
        navigate({ to: "/conta/plano", search: appSearch });
      } else if (resolved.destination === "/conta/upgrade") {
        navigate({ to: "/conta/upgrade", search: appSearch });
      } else {
        navigate({ to: resolved.destination });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <CheckoutThemeBridge>
      <div className="min-h-[100dvh] themed-page-bg flex flex-col">
        <header className="max-w-lg mx-auto w-full px-4 pt-10 pb-4 text-center space-y-3">
          <img
            src={logo}
            alt=""
            className="w-14 h-14 mx-auto object-contain rounded-2xl bg-white/90 p-1"
          />
          <h1 className="text-2xl font-bold text-[var(--layout-text-primary)]">
            Santo Encontro
          </h1>
          <p className="text-sm italic text-[var(--layout-text-secondary)] whitespace-pre-line">
            {"Juntos na fé,\nunidos pelo amor."}
          </p>
          <p className="text-xs text-[var(--layout-text-muted)] max-w-sm mx-auto">
            Uma comunidade de católicos que buscam um relacionamento vivido com
            fé, respeito e propósito.
          </p>
          <ul className="flex flex-wrap justify-center gap-2 text-[10px] text-[var(--layout-text-secondary)]">
            <li className="px-2 py-1 rounded-full bg-white/10">Comunidades ativas</li>
            <li className="px-2 py-1 rounded-full bg-white/10">Formações inclusas</li>
            <li className="px-2 py-1 rounded-full bg-white/10">Ambiente moderado</li>
          </ul>
        </header>

        <main className="flex-1 max-w-lg mx-auto w-full px-4 pb-8">
          <div className="rounded-3xl bg-[var(--layout-card-bg)] border border-[var(--layout-card-border)] shadow-sm p-6 space-y-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Bem-vindo de volta</h2>
              <p className="text-sm text-slate-500 mt-1">
                Entre para continuar sua caminhada.
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="login-email" className={registerLabelClass}>
                  E-mail
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={registerInputClass}
                  placeholder="seu@email.com"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="login-password" className={registerLabelClass}>
                  Senha
                </label>
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={registerInputClass}
                  placeholder="Sua senha"
                />
              </div>
              <div className="text-right">
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-brand-accent hover:underline"
                >
                  Esqueci minha senha
                </Link>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="brand-primary-button w-full py-3.5 rounded-2xl font-bold text-sm disabled:opacity-50"
              >
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>

            <div className="relative text-center text-xs text-slate-400">
              <span className="bg-[var(--layout-card-bg)] px-2 relative z-10">ou</span>
              <div className="absolute inset-x-0 top-1/2 h-px bg-slate-100" />
            </div>

            <Link
              to="/conta"
              className="block text-center text-sm font-semibold text-slate-700 hover:text-brand-accent"
            >
              Criar uma conta
            </Link>
          </div>

          <div className="mt-6">
            <SupportWhatsApp />
          </div>
        </main>
      </div>
    </CheckoutThemeBridge>
  );
}
