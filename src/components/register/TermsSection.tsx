import { Controller } from "react-hook-form";
import type { Control, FieldErrors } from "react-hook-form";

interface TermsSectionProps {
  readonly control: Control<any>;
  readonly errors: FieldErrors<any>;
}

export function TermsSection({ control, errors }: TermsSectionProps) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
      <Controller
        control={control}
        name="concordaRegras"
        render={({ field: { onChange, value } }) => (
          <label className="flex gap-4 cursor-pointer">
            <input
              type="checkbox"
              checked={value}
              onChange={onChange}
              className="mt-0.5 w-5 h-5 rounded text-register-primary focus:ring-register-primary border-slate-300"
            />
            <span className="text-[11px] leading-relaxed text-slate-500">
              Estou ciente que o Santo Encontro é para católicos, solteiros,
              maiores de idade que buscam viver um namoro casto. Que o não
              cumprimento de algumas das condições citadas acima, desrespeitar
              outros integrantes, apresentar falsas informações implicarão na
              minha exclusão do projeto sem direito a reembolso. Que sou,
              exclusivamente responsável por qualquer eventual problema que
              possa acontecer comigo ao conhecer uma nova pessoa no Santo
              Encontro.
            </span>
          </label>
        )}
      />
      {errors.concordaRegras && (
        <p className="text-red-600 text-sm mt-1 ml-1">
          {errors.concordaRegras.message as string}
        </p>
      )}
    </div>
  );
}
