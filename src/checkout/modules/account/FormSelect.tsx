import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Controller } from "react-hook-form";
import { Check, ChevronDown, Search } from "lucide-react";
import type { Control, FieldErrors, FieldValues } from "react-hook-form";
import { registerLabelClass } from "../../../components/register/form-styles";

interface SelectOption {
  value: string;
  label: string;
}

interface FormSelectProps {
  readonly control: Control<FieldValues>;
  readonly name: string;
  readonly label: string;
  readonly options: readonly SelectOption[] | readonly string[];
  readonly errors: FieldErrors<FieldValues>;
  readonly required?: boolean;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly searchable?: boolean;
}

function normalizeOptions(
  options: readonly SelectOption[] | readonly string[]
): SelectOption[] {
  return options.map((option) =>
    typeof option === "string"
      ? { value: option, label: option }
      : option
  );
}

interface CustomSelectProps {
  readonly id: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onBlur: () => void;
  readonly options: SelectOption[];
  readonly placeholder: string;
  readonly disabled: boolean;
  readonly hasError: boolean;
  readonly searchable: boolean;
}

function CustomSelect({
  id,
  value,
  onChange,
  onBlur,
  options,
  placeholder,
  disabled,
  hasError,
  searchable,
}: CustomSelectProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);

  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value]
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(normalizedQuery)
    );
  }, [options, query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(-1);
    onBlur();
  }, [onBlur]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        close();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    if (searchable) {
      searchRef.current?.focus();
      return;
    }
    listRef.current?.focus();
  }, [open, searchable]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const optionElement = listRef.current?.querySelector<HTMLElement>(
      `[data-option-index="${activeIndex}"]`
    );
    optionElement?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const selectOption = (optionValue: string) => {
    onChange(optionValue);
    close();
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
      const selectedIndex = filtered.findIndex((option) => option.value === value);
      setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }
  };

  const handleListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        current < filtered.length - 1 ? current + 1 : 0
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        current > 0 ? current - 1 : filtered.length - 1
      );
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0 && filtered[activeIndex]) {
      event.preventDefault();
      selectOption(filtered[activeIndex].value);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => {
          if (disabled) return;
          if (open) {
            close();
            return;
          }
          setOpen(true);
          const selectedIndex = options.findIndex((option) => option.value === value);
          setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
        }}
        onKeyDown={handleTriggerKeyDown}
        className={`w-full flex items-center justify-between gap-3 bg-white border rounded-2xl pl-4 pr-3.5 py-3.5 text-sm text-left transition-all duration-200 disabled:bg-slate-100 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand-accent)_30%,transparent)] focus:border-[var(--brand-accent)] ${
          open
            ? "border-[var(--brand-accent)] ring-2 ring-[color-mix(in_srgb,var(--brand-accent)_30%,transparent)]"
            : hasError
              ? "border-red-300 ring-2 ring-red-200"
              : "border-[var(--checkout-line-strong,#CFC5B6)]"
        } ${
          selected
            ? "text-[var(--checkout-ink,#0F2846)]"
            : "text-[var(--checkout-ink-3,#8493A6)]"
        }`}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-[var(--checkout-ink-2,#55647A)] transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-[var(--checkout-line-strong,#CFC5B6)] bg-[#FFFCFA] shadow-[0_18px_40px_-18px_rgba(15,40,70,0.35)]"
          onKeyDown={handleListKeyDown}
        >
          {searchable ? (
            <div className="border-b border-[var(--checkout-line,#E7DFD2)] px-3 py-2.5">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--checkout-ink-3,#8493A6)]"
                  aria-hidden
                />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActiveIndex(0);
                  }}
                  placeholder="Buscar estado..."
                  className="w-full rounded-xl border border-[var(--checkout-line,#E7DFD2)] bg-white pl-9 pr-3 py-2 text-sm text-[var(--checkout-ink,#0F2846)] placeholder:text-[var(--checkout-ink-3,#8493A6)] outline-none focus:border-[var(--brand-accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand-accent)_25%,transparent)]"
                />
              </div>
            </div>
          ) : null}

          <div
            ref={listRef}
            id={listboxId}
            role="listbox"
            tabIndex={-1}
            aria-labelledby={id}
            className="max-h-56 overflow-y-auto py-1.5 outline-none overscroll-contain"
          >
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-[var(--checkout-ink-3,#8493A6)]">
                Nenhum estado encontrado
              </p>
            ) : (
              filtered.map((option, index) => {
                const isSelected = option.value === value;
                const isActive = index === activeIndex;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-option-index={index}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectOption(option.value)}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                      isActive || isSelected
                        ? "bg-[var(--checkout-primary-soft,#FFF1E7)] text-[var(--brand-accent-hover,#9A3412)]"
                        : "text-[var(--checkout-ink,#0F2846)] hover:bg-[var(--checkout-canvas,#FBF8F3)]"
                    }`}
                  >
                    <span className={isSelected ? "font-semibold" : "font-normal"}>
                      {option.label}
                    </span>
                    {isSelected ? (
                      <Check className="w-4 h-4 shrink-0" aria-hidden />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function FormSelect({
  control,
  name,
  label,
  options,
  errors,
  required = false,
  placeholder = "Selecione",
  disabled = false,
  searchable,
}: FormSelectProps) {
  const fieldError = errors[name];
  const normalized = normalizeOptions(options);
  const enableSearch = searchable ?? normalized.length > 8;

  return (
    <div className="space-y-1.5 min-w-0">
      <label htmlFor={name} className={registerLabelClass}>
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <CustomSelect
            id={name}
            value={field.value ?? ""}
            onChange={field.onChange}
            onBlur={field.onBlur}
            options={normalized}
            placeholder={placeholder}
            disabled={disabled}
            hasError={Boolean(fieldError)}
            searchable={enableSearch}
          />
        )}
      />
      {fieldError ? (
        <p className="text-red-600 text-sm mt-1 ml-1">
          {typeof fieldError.message === "string"
            ? fieldError.message
            : "Campo obrigatório"}
        </p>
      ) : null}
    </div>
  );
}
