import type { Control, FieldErrors } from "react-hook-form";

interface FormattedCEPInputProps {
  control: Control<any>;
  errors: FieldErrors<any>;
  fetchAddress?: (cep: string) => Promise<void>;
  isLoadingCep?: boolean;
}

export const FormattedCEPInput = ({
  control,
  errors,
  fetchAddress,
  isLoadingCep = false,
}: FormattedCEPInputProps) => {
  const inputBase =
    "w-full bg-slate-50 border-none focus:ring-2 focus:ring-register-primary/20 rounded-2xl px-4 py-3.5 text-sm transition-all duration-200";
  const inputError = "ring-2 ring-red-200 focus:ring-red-500/30";

  return (
    <div className="space-y-1.5">
      <label
        htmlFor="zip_code"
        className="text-xs font-medium text-slate-500 ml-1 block"
      >
        CEP
      </label>
      <div className="relative">
        <input
          id="zip_code"
          {...control.register("zip_code")}
          placeholder="00000-000"
          onChange={(e) => {
            const text = e.target.value;
            const formatted = text
              .replace(/\D/g, "")
              .replace(/(\d{5})(\d)/, "$1-$2")
              .substring(0, 9);
            e.target.value = formatted;
          }}
          onBlur={async (e) => {
            const value = e.target.value;
            if (
              value &&
              value.replace(/\D/g, "").length === 8 &&
              fetchAddress
            ) {
              await fetchAddress(value);
            }
          }}
          className={`${inputBase} ${errors.zip_code ? inputError : ""} ${
            isLoadingCep ? "bg-slate-100/80" : ""
          }`}
        />
        {isLoadingCep && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      {errors.zip_code && (
        <p className="text-red-600 text-sm mt-1 ml-1">
          {typeof errors.zip_code.message === "string"
            ? errors.zip_code.message
            : "CEP inválido"}
        </p>
      )}
    </div>
  );
};
