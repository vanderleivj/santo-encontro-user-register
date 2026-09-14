import { Ban } from "lucide-react";
import { CheckoutShell } from "../../CheckoutShell";
import { getRegistrationBlockCopy } from "../../../lib/registration-eligibility";

interface IneligibleScreenProps {
  readonly reason: string;
  readonly onBack: () => void;
}

export function IneligibleScreen({ reason, onBack }: IneligibleScreenProps) {
  const copy = getRegistrationBlockCopy(reason);

  return (
    <CheckoutShell
      step="account"
      title={copy.title}
      subtitle="Este cadastro não atende às regras de participação do Santo Encontro."
      showSummary={false}
      showChangePlan={false}
      showLoginCta={false}
      bareContent
    >
      <div className="mx-auto max-w-[660px] rounded-2xl bg-white border border-red-200 p-6 sm:p-8 space-y-5">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-red-50 text-red-700 flex items-center justify-center shrink-0">
            <Ban className="w-5 h-5" aria-hidden />
          </span>
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-red-800">
              Cadastro bloqueado
            </p>
            <p className="text-[15px] leading-relaxed text-[var(--checkout-ink,#0F2846)]">
              {copy.message}
            </p>
            <p className="text-sm text-[var(--checkout-ink-2,#55647A)]">
              Não é possível continuar para o pagamento com este e-mail ou CPF.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="h-[52px] px-5 rounded-xl border border-[var(--checkout-line-strong,#CFC5B6)] bg-white font-semibold text-[var(--checkout-ink,#0F2846)] hover:bg-[var(--checkout-sunken,#F4EFE7)]"
        >
          Voltar
        </button>
      </div>
    </CheckoutShell>
  );
}
