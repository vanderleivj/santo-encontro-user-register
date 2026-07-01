import { Controller } from "react-hook-form";
import type { Control, FieldErrors, FieldValues } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";
import { registerInputClass, registerLabelClass } from "./form-styles";

interface PasswordInputProps {
  readonly control: Control<FieldValues>;
  readonly name: string;
  readonly label: string;
  readonly placeholder?: string;
  readonly errors: FieldErrors<FieldValues>;
  readonly isVisible: boolean;
  readonly onToggleVisibility: () => void;
}

export function PasswordInput({
  control,
  name,
  label,
  placeholder,
  errors,
  isVisible,
  onToggleVisibility,
}: PasswordInputProps) {
  const fieldError = errors[name];
  const inputClasses =
    `${registerInputClass} pr-12` +
    (fieldError ? " ring-2 ring-red-200 focus:ring-red-500/30" : "");

  return (
    <div className="space-y-1.5 relative">
      <label htmlFor={name} className={registerLabelClass}>
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <Controller
          control={control}
          name={name}
          render={({ field: { onChange, onBlur, value } }) => (
            <input
              id={name}
              type={isVisible ? "text" : "password"}
              placeholder={placeholder}
              value={value ?? ""}
              onChange={onChange}
              onBlur={onBlur}
              className={inputClasses}
            />
          )}
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label={isVisible ? "Ocultar senha" : "Mostrar senha"}
        >
          {isVisible ? (
            <EyeOff className="w-5 h-5" />
          ) : (
            <Eye className="w-5 h-5" />
          )}
        </button>
      </div>
      {fieldError && (
        <p className="text-red-600 text-sm mt-1 ml-1">
          {fieldError.message as string}
        </p>
      )}
    </div>
  );
}
