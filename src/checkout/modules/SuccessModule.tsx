import { useSearch } from "@tanstack/react-router";
import logo from "../../assets/logo.png";
import { CheckoutThemeBridge } from "../theme/CheckoutThemeBridge";
import { useCheckoutStore } from "../checkout-store";

const APP_STORE_URL = "https://apps.apple.com/br/app/santo-encontro/id6751910275";
const GOOGLE_PLAY_URL =
  "https://play.google.com/store/apps/details?id=com.santo.encontro&pcampaignid=web_share";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function methodLabel(method?: string) {
  if (method === "pix") return "PIX";
  if (method === "credit_card") return "Cartão de crédito";
  if (method === "boleto") return "Boleto";
  return null;
}

function endDateLabel(interval?: string | null) {
  const date = new Date();
  if (interval === "year" || interval === "yearly") {
    date.setFullYear(date.getFullYear() + 1);
  } else if (interval === "semiannual") {
    date.setMonth(date.getMonth() + 6);
  } else {
    date.setMonth(date.getMonth() + 1);
  }
  return date.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function SuccessModule() {
  const search = useSearch({ strict: false }) as {
    trial?: string;
    days?: string;
    planLabel?: string;
    amount?: string;
    method?: string;
  };
  const selectedPlan = useCheckoutStore((state) => state.selectedPlan);

  const isTrial = search.trial === "1";
  const trialDays = search.days ? Number(search.days) : undefined;
  const planLabel = search.planLabel || selectedPlan?.name || "Seu plano";
  const amount =
    search.amount !== undefined ? Number(search.amount) : selectedPlan?.price;
  const method = methodLabel(search.method);
  const paidToday = new Date().toLocaleDateString("pt-BR");

  return (
    <CheckoutThemeBridge>
      <div className="min-h-[100dvh] themed-page-bg">
        <header className="max-w-lg mx-auto px-4 pt-10 pb-4">
          <div className="flex items-center gap-2">
            <img
              src={logo}
              alt=""
              className="w-9 h-9 object-contain rounded-lg bg-white/90 p-0.5"
            />
            <span className="font-bold text-[var(--layout-text-primary)]">
              Santo Encontro
            </span>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-4 pb-10 space-y-5">
          <div className="rounded-3xl bg-[var(--layout-card-bg)] border border-[var(--layout-card-border)] shadow-sm p-6 space-y-4 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 text-2xl">
              ✓
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isTrial ? "Período de teste ativado!" : "Bem-vindo(a)!"}
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              {isTrial
                ? `Seu teste${
                    trialDays && Number.isFinite(trialDays)
                      ? ` de ${trialDays} dias`
                      : ""
                  } já começou. Que este caminho seja abençoado.`
                : `Seu ${planLabel} está ativo até ${endDateLabel(
                    selectedPlan?.interval
                  )}. Que este caminho seja abençoado.`}
            </p>

            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-left space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Plano</span>
                <span className="font-semibold text-slate-900">{planLabel}</span>
              </div>
              {method ? (
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Pago via</span>
                  <span className="font-semibold text-slate-900">
                    {method} em {paidToday}
                  </span>
                </div>
              ) : null}
              {amount !== undefined && Number.isFinite(amount) ? (
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Valor</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(amount)}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          <section className="rounded-3xl bg-[var(--layout-card-bg)] border border-[var(--layout-card-border)] shadow-sm p-6 space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">
              Por onde começar
            </h2>
            <ul className="space-y-3 text-sm text-slate-700">
              <li>
                <strong className="text-slate-900">Complete seu perfil</strong>
                <p className="text-xs text-slate-500">
                  Leva 2 minutos. Perfis completos recebem muito mais interações.
                </p>
              </li>
              <li>
                <strong className="text-slate-900">Entre nas comunidades</strong>
                <p className="text-xs text-slate-500">
                  Encontre grupos da sua região e da sua espiritualidade.
                </p>
              </li>
              <li>
                <strong className="text-slate-900">Comece uma formação</strong>
                <p className="text-xs text-slate-500">
                  Conteúdos liberados no seu plano.
                </p>
              </li>
            </ul>
          </section>

          <div className="space-y-3">
            <p className="text-center text-xs font-bold uppercase tracking-wider text-[var(--layout-text-muted)]">
              Baixe o aplicativo
            </p>
            <div className="grid grid-cols-2 gap-3">
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-black text-white py-3 px-4 rounded-xl"
              >
                App Store
              </a>
              <a
                href={GOOGLE_PLAY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-black text-white py-3 px-4 rounded-xl"
              >
                Google Play
              </a>
            </div>
          </div>
        </main>
      </div>
    </CheckoutThemeBridge>
  );
}
