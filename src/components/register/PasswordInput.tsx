import { Controller } from "react-hook-form";
import type { Control, FieldErrors } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";

const inputBase =
  "w-full bg-slate-50 border-none focus:ring-2 focus:ring-register-primary/20 rounded-2xl px-4 py-3.5 pr-12 text-sm transition-all duration-200";
const labelClass = "text-xs font-medium text-slate-500 ml-1 block";

interface PasswordInputProps {
  readonly control: Control<any>;
  readonly name: string;
  readonly label: string;
  readonly placeholder?: string;
  readonly errors: FieldErrors<any>;
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
    inputBase +
    (fieldError ? " ring-2 ring-red-200 focus:ring-red-500/30" : "");

  return (
    <div className="space-y-1.5 relative">
      <label htmlFor={name} className={labelClass}>
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
              value={value}
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
