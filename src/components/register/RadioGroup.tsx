import { Controller } from "react-hook-form";
import type { Control, FieldErrors } from "react-hook-form";

interface RadioOption {
  value: string;
  label: string;
}

interface RadioGroupProps {
  readonly control: Control<any>;
  readonly name: string;
  readonly label: string;
  readonly options: readonly RadioOption[];
  readonly errors: FieldErrors<any>;
  readonly required?: boolean;
  readonly legend?: boolean;
}

export function RadioGroup({
  control,
  name,
  label,
  options,
  errors,
  required = false,
  legend = false,
}: RadioGroupProps) {
  const fieldError = errors[name];
  const Wrapper = legend ? "fieldset" : "div";
  const LabelTag = legend ? "legend" : "label";

  return (
    <div className="space-y-3">
      <Wrapper>
        <LabelTag className="block text-xs font-medium text-slate-500 ml-1">
          {label} {required && <span className="text-red-500">*</span>}
        </LabelTag>
        <Controller
          control={control}
          name={name}
          render={({ field: { onChange, value } }) => (
            <div className={`flex gap-6 ${legend ? "mt-2 px-1" : "mt-2 px-1"}`}>
              {options.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 cursor-pointer text-sm"
                >
                  <input
                    type="radio"
                    value={option.value}
                    checked={value === option.value}
                    onChange={onChange}
                    className="w-4 h-4 text-register-primary focus:ring-register-primary border-slate-300"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          )}
        />
      </Wrapper>
      {fieldError && (
        <p className="text-red-600 text-sm mt-1">
          {fieldError.message as string}
        </p>
      )}
    </div>
  );
}
