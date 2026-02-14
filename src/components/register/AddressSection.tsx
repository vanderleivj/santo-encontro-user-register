import { Controller } from "react-hook-form";
import type { Control, FieldErrors } from "react-hook-form";
import { Home } from "lucide-react";
import { FormInput } from "./FormInput";
import { FormattedCEPInput } from "../FormattedCEPInput";
import { statesList } from "../../utils/states-list";

const selectBase =
  "w-full bg-slate-50 border-none focus:ring-2 focus:ring-register-primary/20 rounded-2xl px-4 py-3.5 text-sm appearance-none transition-all duration-200";

interface AddressSectionProps {
  readonly control: Control<any>;
  readonly errors: FieldErrors<any>;
  readonly fetchAddressFromCEP: (cep: string) => Promise<void>;
  readonly isLoadingCep: boolean;
}

export function AddressSection({
  control,
  errors,
  fetchAddressFromCEP,
  isLoadingCep,
}: AddressSectionProps) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-50 text-amber-500">
          <Home className="w-5 h-5" aria-hidden />
        </div>
        <h2 className="font-semibold text-lg text-slate-900">Endereço</h2>
      </div>

      <div className="space-y-4">
        <FormattedCEPInput
          control={control}
          errors={errors}
          fetchAddress={fetchAddressFromCEP}
          isLoadingCep={isLoadingCep}
        />

        <FormInput
          control={control}
          name="address"
          label="Endereço"
          placeholder="Rua, número"
          errors={errors}
          required
          disabled={isLoadingCep}
          isLoading={isLoadingCep}
        />

        <FormInput
          control={control}
          name="complement"
          label="Complemento"
          placeholder="Apartamento, bloco, etc."
          errors={errors}
          disabled={isLoadingCep}
          isLoading={isLoadingCep}
        />

        <FormInput
          control={control}
          name="city"
          label="Cidade"
          placeholder="Cidade"
          errors={errors}
          required
          disabled={isLoadingCep}
          isLoading={isLoadingCep}
        />

        <div className="space-y-1.5">
          <label
            htmlFor="state"
            className="text-xs font-medium text-slate-500 ml-1 block"
          >
            Estado <span className="text-red-500">*</span>
          </label>
          <Controller
            control={control}
            name="state"
            render={({ field: { onChange, value } }) => (
              <select
                id="state"
                value={value}
                onChange={onChange}
                disabled={isLoadingCep}
                className={`${selectBase} ${
                  errors.state ? "ring-2 ring-red-200" : ""
                } ${isLoadingCep ? "bg-slate-100/80" : ""}`}
              >
                <option value="">Selecione o estado</option>
                {statesList.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            )}
          />
          {errors.state && (
            <p className="text-red-600 text-sm mt-1 ml-1">
              {errors.state.message as string}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
