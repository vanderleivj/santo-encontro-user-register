import { formatBrl } from "../upgrade/plan-type";

export interface InstallmentQuoteOption {
  count: number;
  installmentValue: number;
  totalValue: number;
}

interface InstallmentPickerProps {
  options: InstallmentQuoteOption[];
  loading: boolean;
  value: number;
  onChange: (installmentCount: number) => void;
}

export function InstallmentPicker({
  options,
  loading,
  value,
  onChange,
}: InstallmentPickerProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-500">Parcelas no cartão</p>
      {loading ? (
        <p className="text-xs text-slate-500">Calculando a taxa do cartão...</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {options.map((option) => {
            const selected = value === option.count;
            return (
              <button
                key={option.count}
                type="button"
                onClick={() => onChange(option.count)}
                className={`rounded-2xl border px-3 py-2 text-left ${
                  selected
                    ? "border-brand-accent bg-white"
                    : "border-slate-200 bg-white/70"
                }`}
              >
                <span className="block text-sm font-bold text-slate-900">
                  {option.count}x de {formatBrl(option.installmentValue)}
                </span>
                <span className="block text-[11px] text-slate-500">
                  {option.count === 1
                    ? "Preço do plano"
                    : `Renova em ${option.count}x`}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <p className="text-[11px] leading-relaxed text-slate-500">
        Em 1x você paga o preço do plano. A partir de 2x, a taxa do cartão entra
        nas parcelas. No fim do período, renova na mesma quantidade.
      </p>
    </div>
  );
}
