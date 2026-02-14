import { useSearch } from "@tanstack/react-router";
import logo from "../assets/logo.png";

const APP_STORE_URL = "https://apps.apple.com/br/app/santo-encontro/id6751910275";
const GOOGLE_PLAY_URL =
  "https://play.google.com/store/apps/details?id=com.santo.encontro&pcampaignid=web_share";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function nextBillingLabel() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function SuccessScreen() {
  const search = useSearch({ strict: false });
  const planLabel =
    search && typeof search === "object" && "planLabel" in search
      ? String((search as { planLabel?: string }).planLabel ?? "")
      : undefined;
  const rawAmount =
    search && typeof search === "object" && "amount" in search
      ? (search as { amount?: unknown }).amount
      : undefined;
  const amount =
    rawAmount !== undefined && rawAmount !== null ? Number(rawAmount) : undefined;
  const hasDetails = Boolean(
    planLabel && planLabel.trim() !== "" && amount !== undefined
  );

  return (
    <div className="min-h-[100dvh] bg-background-light text-slate-900 font-display flex flex-col items-center">
      {/* Decorative background */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-gold/5 rounded-full blur-3xl" />
      </div>

      <header className="w-full max-w-md pt-12 pb-6 px-6 flex flex-col items-center text-center">
        <div className="mb-4 flex flex-col items-center">
          <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center mb-3 overflow-hidden">
            <img
              src={logo}
              alt=""
              className="w-12 h-12 object-contain"
            />
          </div>
          <h1 className="text-2xl font-extrabold text-primary tracking-tight">
            Santo Encontro
          </h1>
          <p className="text-slate-500 text-sm italic font-medium">
            Juntos na fé, unidos pelo amor
          </p>
        </div>
      </header>

      <main className="flex-1 w-full max-w-md px-6 flex flex-col items-center space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-2">
            <span className="text-green-600 text-3xl" aria-hidden>✓</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Assinatura Confirmada
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed max-w-[300px] mx-auto">
            Seu pagamento foi processado com sucesso. Você já pode acessar todas
            as funcionalidades.
          </p>
        </div>

        {hasDetails && (
          <div className="w-full bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-3">
              <span className="text-slate-500">Plano</span>
              <span className="font-bold text-slate-900">{planLabel}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-3">
              <span className="text-slate-500">Total</span>
              <span className="font-bold text-slate-900">
                {formatCurrency(amount ?? 0)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Próxima cobrança</span>
              <span className="font-bold text-slate-900">
                {nextBillingLabel()}
              </span>
            </div>
          </div>
        )}

        <div className="w-full pt-4 space-y-4">
          <p className="text-center text-xs font-bold uppercase tracking-wider text-slate-400">
            Baixe nosso aplicativo
          </p>
          <div className="grid grid-cols-2 gap-3">
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-black text-white py-3 px-4 rounded-xl hover:bg-slate-900 transition-colors"
            >
              <svg
                className="w-7 h-7 shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              <div className="text-left">
                <p className="text-[10px] leading-none opacity-70">
                  Download on
                </p>
                <p className="text-sm font-bold leading-none">App Store</p>
              </div>
            </a>
            <a
              href={GOOGLE_PLAY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-black text-white py-3 px-4 rounded-xl hover:bg-slate-900 transition-colors"
            >
              <svg
                className="w-7 h-7 shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
              </svg>
              <div className="text-left">
                <p className="text-[10px] leading-none opacity-70">
                  Get it on
                </p>
                <p className="text-sm font-bold leading-none">Google Play</p>
              </div>
            </a>
          </div>
        </div>
      </main>

      <footer className="w-full max-w-md px-6 py-8 safe-area-bottom mt-auto">
        <div className="pt-4 flex justify-center">
          <div className="w-32 h-1.5 bg-slate-200 rounded-full opacity-50" />
        </div>
      </footer>
    </div>
  );
}
