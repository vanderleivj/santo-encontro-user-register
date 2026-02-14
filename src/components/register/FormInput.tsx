import { Controller } from "react-hook-form";
import type { Control, FieldErrors } from "react-hook-form";

const inputBase =
  "w-full bg-slate-50 border-none focus:ring-2 focus:ring-register-primary/20 rounded-2xl px-4 py-3.5 text-sm transition-all duration-200";
const labelClass = "text-xs font-medium text-slate-500 ml-1 block";

interface FormInputProps {
  readonly control: Control<any>;
  readonly name: string;
  readonly label: string;
  readonly type?: string;
  readonly placeholder?: string;
  readonly errors: FieldErrors<any>;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly min?: string;
  readonly max?: string;
  readonly helperText?: string;
  readonly getInputClasses?: (fieldError: any, isLoading?: boolean) => string;
  readonly isLoading?: boolean;
}

export function FormInput({
  control,
  name,
  label,
  type = "text",
  placeholder,
  errors,
  required = false,
  disabled = false,
  min,
  max,
  helperText,
  getInputClasses,
  isLoading = false,
}: FormInputProps) {
  const fieldError = errors[name];
  let inputClasses = inputBase;
  if (fieldError) {
    inputClasses += " ring-2 ring-red-200 focus:ring-red-500/30";
  } else if (isLoading) {
    inputClasses += " bg-slate-100/80";
  }
  if (getInputClasses) {
    const custom = getInputClasses(fieldError, isLoading);
    if (custom) inputClasses += ` ${custom}`;
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className={labelClass}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <input
            id={name}
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            disabled={disabled || isLoading}
            min={min}
            max={max}
            className={inputClasses}
          />
        )}
      />
      {fieldError && (
        <p className="text-red-600 text-sm mt-1 ml-1">
          {fieldError.message as string}
        </p>
      )}
      {helperText && !fieldError && (
        <p className="text-[10px] text-slate-400 ml-1">{helperText}</p>
      )}
    </div>
  );
}
