import { Controller } from "react-hook-form";
import type { Control, FieldErrors, FieldValues } from "react-hook-form";
import { registerInputClass, registerLabelClass } from "./register/form-styles";

interface FormattedCPFInputProps {
  control: Control<FieldValues>;
  errors: FieldErrors<FieldValues>;
}

function formatCpf(value: string): string {
  return value
    .replace(/\D/g, "")
    .replace(/^(\d{3})(\d)/g, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/g, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/g, "$1.$2.$3-$4")
    .substring(0, 14);
}

export const FormattedCPFInput = ({
  control,
  errors,
}: FormattedCPFInputProps) => {
  const inputError = "ring-2 ring-red-200 focus:ring-red-500/30";

  return (
    <div className="space-y-1.5">
      <label htmlFor="cpf" className={registerLabelClass}>
        CPF <span className="text-red-500">*</span>
      </label>
      <Controller
        name="cpf"
        control={control}
        render={({ field }) => (
          <input
            id="cpf"
            name={field.name}
            ref={field.ref}
            value={field.value ?? ""}
            onBlur={field.onBlur}
            placeholder="000.000.000-00"
            maxLength={14}
            inputMode="numeric"
            autoComplete="off"
            onChange={(event) => {
              field.onChange(formatCpf(event.target.value));
            }}
            className={`${registerInputClass} ${errors.cpf ? inputError : ""}`}
          />
        )}
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
