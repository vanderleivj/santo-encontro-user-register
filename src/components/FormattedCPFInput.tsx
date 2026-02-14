import type { Control, FieldErrors } from "react-hook-form";

interface FormattedCPFInputProps {
  control: Control<any>;
  errors: FieldErrors<any>;
}

export const FormattedCPFInput = ({
  control,
  errors,
}: FormattedCPFInputProps) => {
  const inputBase =
    "w-full bg-slate-50 border-none focus:ring-2 focus:ring-register-primary/20 rounded-2xl px-4 py-3.5 text-sm transition-all duration-200";
  const inputError = "ring-2 ring-red-200 focus:ring-red-500/30";

  return (
    <div className="space-y-1.5">
      <label htmlFor="cpf" className="text-xs font-medium text-slate-500 ml-1 block">
        CPF <span className="text-red-500">*</span>
      </label>
      <input
        id="cpf"
        {...control.register("cpf")}
        placeholder="000.000.000-00"
        maxLength={14}
        onChange={(e) => {
          const text = e.target.value;
          const formatted = text
            .replace(/\D/g, "")
            .replace(/^(\d{3})(\d)/g, "$1.$2")
            .replace(/^(\d{3})\.(\d{3})(\d)/g, "$1.$2.$3")
            .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/g, "$1.$2.$3-$4")
            .substring(0, 14);
          e.target.value = formatted;
        }}
        className={`${inputBase} ${errors.cpf ? inputError : ""}`}
      />
      {errors.cpf && (
        <p className="text-red-600 text-sm mt-1 ml-1">
          {typeof errors.cpf.message === "string"
            ? errors.cpf.message
            : "CPF inválido"}
        </p>
      )}
    </div>
  );
};
