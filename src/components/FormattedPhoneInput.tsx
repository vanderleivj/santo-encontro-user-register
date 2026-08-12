import { Controller } from "react-hook-form";
import type { Control, FieldErrors, FieldValues } from "react-hook-form";
import { registerInputClass, registerLabelClass } from "./register/form-styles";

interface FormattedPhoneInputProps {
  control: Control<FieldValues>;
  errors: FieldErrors<FieldValues>;
  readonly required?: boolean;
}

function formatPhone(value: string): string {
  const text = value ?? "";
  const hasPlus = text.trimStart().startsWith("+");
  if (hasPlus) {
    const digitsAfterPlus = text.replace(/^\+/, "").replace(/\D/g, "");
    return "+" + digitsAfterPlus.substring(0, 15);
  }
  return text
    .replace(/\D/g, "")
    .replace(/^(\d{2})(\d)/g, "($1) $2")
    .replace(/(\d)(\d{4})$/, "$1-$2")
    .substring(0, 15);
}

export const FormattedPhoneInput = ({
  control,
  errors,
  required = false,
}: FormattedPhoneInputProps) => {
  const inputError = "ring-2 ring-red-200 focus:ring-red-500/30";

  return (
    <div className="space-y-1.5">
      <label htmlFor="phone" className={registerLabelClass}>
        WhatsApp {required && <span className="text-red-500">*</span>}
      </label>
      <Controller
        name="phone"
        control={control}
        render={({ field }) => (
          <input
            id="phone"
            name={field.name}
            ref={field.ref}
            value={field.value ?? ""}
            onBlur={field.onBlur}
            placeholder="(11) 99999-9999"
            inputMode="tel"
            autoComplete="tel"
            onChange={(event) => {
              field.onChange(formatPhone(event.target.value));
            }}
            className={`${registerInputClass} ${errors.phone ? inputError : ""}`}
          />
        )}
      />
      {errors.phone && (
        <p className="text-red-600 text-sm mt-1 ml-1">
          {typeof errors.phone.message === "string"
            ? errors.phone.message
            : "Telefone inválido"}
        </p>
      )}
    </div>
  );
};
