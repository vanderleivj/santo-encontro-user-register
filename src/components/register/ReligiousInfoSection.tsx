import type { Control, FieldErrors } from "react-hook-form";
import { Church } from "lucide-react";
import { RadioGroup } from "./RadioGroup";

interface ReligiousInfoSectionProps {
  readonly control: Control<any>;
  readonly errors: FieldErrors<any>;
  readonly jaCasado: string;
  readonly isViuvo: string | undefined;
}

export function ReligiousInfoSection({
  control,
  errors,
  jaCasado,
  isViuvo,
}: ReligiousInfoSectionProps) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-rose-50 text-rose-500">
          <Church className="w-5 h-5" aria-hidden />
        </div>
        <h2 className="font-semibold text-lg text-slate-900">
          Informações Religiosas
        </h2>
      </div>

      <div className="space-y-5">
        <div className="space-y-3">
          <RadioGroup
            control={control}
            name="jaCasado"
            label="Já foi casado(a)?"
            options={[
              { value: "Sim", label: "Sim" },
              { value: "Não", label: "Não" },
            ]}
            errors={errors}
            required
            legend
          />
        </div>

        {jaCasado === "Sim" && (
          <div className="space-y-6">
            <div className="space-y-3">
              <span className="block text-sm font-medium text-slate-700">
                É viúvo(a)?
              </span>
              <RadioGroup
                control={control}
                name="isViuvo"
                label=""
                options={[
                  { value: "Sim", label: "Sim" },
                  { value: "Não", label: "Não" },
                ]}
                errors={errors}
              />
            </div>

            {isViuvo !== "Sim" && (
            <div className="space-y-3">
              <span className="block text-sm font-medium text-slate-700">
                Se sim, tem o processo de nulidade matrimonial?{" "}
                <span className="text-red-500">*</span>
              </span>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Nulidade matrimonial é quando um casamento é declarado inválido
                  pela Igreja Católica, mesmo tendo sido realizada a cerimônia
                  religiosa.
                </p>
                <RadioGroup
                  control={control}
                  name="nulidadeMatrimonial"
                  label=""
                  options={[
                    { value: "Sim", label: "Sim" },
                    { value: "Não", label: "Não" },
                  ]}
                  errors={errors}
                />
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          <RadioGroup
            control={control}
            name="viveCastidade"
            label="Busca viver a castidade?"
            options={[
              { value: "Sim", label: "Sim" },
              { value: "Não", label: "Não" },
            ]}
            errors={errors}
            required
            legend
          />
        </div>

        <div className="space-y-3">
          <span className="block text-sm font-medium text-slate-700">
            É católico apostólico romano? <span className="text-red-500">*</span>
          </span>
          <RadioGroup
            control={control}
            name="is_catholic"
            label=""
            options={[
              { value: "Sim", label: "Sim" },
              { value: "Não", label: "Não" },
            ]}
            errors={errors}
          />
        </div>
      </div>
    </div>
  );
}
