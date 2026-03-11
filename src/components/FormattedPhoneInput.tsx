import type { Control, FieldErrors } from "react-hook-form";

interface FormattedPhoneInputProps {
  control: Control<any>;
  errors: FieldErrors<any>;
  readonly required?: boolean;
}

export const FormattedPhoneInput = ({
  control,
  errors,
  required = false,
}: FormattedPhoneInputProps) => {
  const inputBase =
    "w-full bg-slate-50 border-none focus:ring-2 focus:ring-register-primary/20 rounded-2xl px-4 py-3.5 text-sm transition-all duration-200";
  const inputError = "ring-2 ring-red-200 focus:ring-red-500/30";

  return (
    <div className="space-y-1.5">
      <label htmlFor="phone" className="text-xs font-medium text-slate-500 ml-1 block">
        WhatsApp {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id="phone"
        {...control.register("phone")}
        placeholder="(11) 99999-9999 ou +55 11 99999-9999"
        onChange={(e) => {
          const text = e.target.value;
          const hasPlus = text.trimStart().startsWith("+");
          if (hasPlus) {
            const digitsAfterPlus = text.replace(/^\+/, "").replace(/\D/g, "");
            e.target.value = "+" + digitsAfterPlus.substring(0, 15);
            return;
          }
          const formatted = text
            .replace(/\D/g, "")
            .replace(/^(\d{2})(\d)/g, "($1) $2")
            .replace(/(\d)(\d{4})$/, "$1-$2")
            .substring(0, 15);
          e.target.value = formatted;
        }}
        className={`${inputBase} ${errors.phone ? inputError : ""}`}
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
