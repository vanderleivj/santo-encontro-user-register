import { registerInputClass } from "../../../components/register/form-styles";
import type { CardCheckoutInput } from "./useAsaasCheckout";

interface CardPanelProps {
  readonly value: CardCheckoutInput;
  readonly onChange: (value: CardCheckoutInput) => void;
  readonly onSubmit: () => void;
  readonly loading: boolean;
  readonly awaitingConfirmation?: boolean;
  readonly verifying?: boolean;
  readonly onVerifyPayment?: () => void;
}

export function CardPanel({
  value,
  onChange,
  onSubmit,
  loading,
  awaitingConfirmation = false,
  verifying = false,
  onVerifyPayment,
}: CardPanelProps) {
  const patch = (partial: Partial<CardCheckoutInput>) =>
    onChange({ ...value, ...partial });

  if (awaitingConfirmation) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-600 leading-relaxed">
          Estamos confirmando o pagamento no Asaas. Isso pode levar alguns
          segundos.
        </p>
        <button
          type="button"
          disabled={verifying}
          onClick={onVerifyPayment}
          className="brand-primary-button w-full py-3 rounded-2xl font-bold text-sm disabled:opacity-50"
        >
          {verifying ? "Verificando..." : "Já paguei · verificar"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 leading-relaxed">
        Conexão criptografada. O Santo Encontro não armazena o número do seu
        cartão — os dados vão direto para o processador de pagamento.
      </p>
      <input
        type="text"
        value={value.holderName}
        onChange={(event) => patch({ holderName: event.target.value })}
        placeholder="Nome no cartão"
        className={registerInputClass}
      />
      <input
        type="text"
        inputMode="numeric"
        value={value.number}
        onChange={(event) => patch({ number: event.target.value })}
        placeholder="Número do cartão"
        className={registerInputClass}
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={value.expiry}
          onChange={(event) => patch({ expiry: event.target.value })}
          placeholder="MM/AA"
          className={registerInputClass}
        />
        <input
          type="text"
          inputMode="numeric"
          value={value.ccv}
          onChange={(event) => patch({ ccv: event.target.value })}
          placeholder="CVV"
          className={registerInputClass}
        />
      </div>
      <input
        type="text"
        inputMode="numeric"
        value={value.postalCode}
        onChange={(event) => patch({ postalCode: event.target.value })}
        placeholder="CEP"
        className={registerInputClass}
      />
      <input
        type="text"
        value={value.addressNumber}
        onChange={(event) => patch({ addressNumber: event.target.value })}
        placeholder="Número do endereço"
        className={registerInputClass}
      />
      <button
        type="button"
        disabled={loading}
        onClick={onSubmit}
        className="brand-primary-button w-full py-3 rounded-2xl font-bold text-sm disabled:opacity-50"
      >
        {loading ? "Processando..." : "Pagar com cartão"}
      </button>
    </div>
  );
}
