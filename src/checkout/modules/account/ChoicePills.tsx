import { Controller } from "react-hook-form";
import { Check } from "lucide-react";
import type { Control, FieldErrors, FieldValues } from "react-hook-form";

interface ChoiceOption {
  value: string;
  label: string;
}

interface ChoicePillsProps {
  readonly control: Control<FieldValues>;
  readonly name: string;
  readonly label: string;
  readonly options: readonly ChoiceOption[];
  readonly errors: FieldErrors<FieldValues>;
  readonly required?: boolean;
}

export function ChoicePills({
  control,
  name,
  label,
  options,
  errors,
  required = false,
}: ChoicePillsProps) {
  const fieldError = errors[name];

  return (
    <div className="space-y-2 w-full min-w-0">
      <p className="text-sm font-medium text-[var(--checkout-ink,#0F2846)] leading-snug">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </p>
      <Controller
        control={control}
        name={name}
        render={({ field: { value, onChange } }) => (
          <div className="grid grid-cols-2 gap-2">
            {options.map((option) => {
              const selected = value === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChange(option.value)}
                  className={`h-12 rounded-xl border flex items-center justify-center gap-1.5 text-[15px] transition-colors ${
                    selected
                      ? "bg-[var(--checkout-primary-soft,#FFF1E7)] border-2 border-[var(--brand-accent)] font-semibold text-[var(--brand-accent-hover,#9A3412)]"
                      : "bg-white border border-[var(--checkout-line-strong,#CFC5B6)] font-normal text-[var(--checkout-ink,#0F2846)] hover:border-[var(--checkout-ink-3)]"
                  }`}
                >
                  {selected ? (
                    <Check className="w-[15px] h-[15px] shrink-0" aria-hidden />
                  ) : null}
                  {option.label}
                </button>
              );
            })}
          </div>
        )}
      />
      {fieldError ? (
        <p className="text-red-600 text-sm">
          {typeof fieldError.message === "string"
            ? fieldError.message
            : "Campo obrigatório"}
        </p>
      ) : null}
    </div>
  );
}
