import type { Control, FieldErrors } from "react-hook-form";
import { User } from "lucide-react";
import { FormInput } from "./FormInput";
import { PasswordInput } from "./PasswordInput";
import { RadioGroup } from "./RadioGroup";
import { FormattedPhoneInput } from "../FormattedPhoneInput";
import { FormattedCPFInput } from "../FormattedCPFInput";

interface PersonalDataSectionProps {
  readonly control: Control<any>;
  readonly errors: FieldErrors<any>;
  readonly isSenhaVisible: boolean;
  readonly setIsSenhaVisible: (visible: boolean) => void;
  readonly isConfirmarSenhaVisible: boolean;
  readonly setIsConfirmarSenhaVisible: (visible: boolean) => void;
}

export function PersonalDataSection({
  control,
  errors,
  isSenhaVisible,
  setIsSenhaVisible,
  isConfirmarSenhaVisible,
  setIsConfirmarSenhaVisible,
}: PersonalDataSectionProps) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 text-blue-500">
          <User className="w-5 h-5" aria-hidden />
        </div>
        <h2 className="font-semibold text-lg text-slate-900">Dados Pessoais</h2>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            control={control}
            name="firstName"
            label="Nome"
            placeholder="Nome"
            errors={errors}
            required
          />
          <FormInput
            control={control}
            name="lastName"
            label="Sobrenome"
            placeholder="Sobrenome"
            errors={errors}
            required
          />
        </div>

        <FormattedPhoneInput control={control} errors={errors} />

        <FormattedCPFInput control={control} errors={errors} />

        <FormInput
          control={control}
          name="email"
          label="E-mail"
          type="email"
          placeholder="seu.email@exemplo.com"
          errors={errors}
          required
        />

        <RadioGroup
          control={control}
          name="gender"
          label="Sexo"
          options={[
            { value: "male", label: "Masculino" },
            { value: "female", label: "Feminino" },
          ]}
          errors={errors}
          required
          legend
        />

        <FormInput
          control={control}
          name="age"
          label="Idade"
          type="number"
          placeholder="Sua idade"
          errors={errors}
          required
          min="18"
          max="120"
          helperText="Deve ser maior de 18 anos"
        />

        <RadioGroup
          control={control}
          name="temFilhos"
          label="Tem filhos?"
          options={[
            { value: "Sim", label: "Sim" },
            { value: "Não", label: "Não" },
          ]}
          errors={errors}
          required
          legend
        />

        <PasswordInput
          control={control}
          name="senha"
          label="Senha"
          placeholder="Sua senha"
          errors={errors}
          isVisible={isSenhaVisible}
          onToggleVisibility={() => setIsSenhaVisible(!isSenhaVisible)}
        />

        <PasswordInput
          control={control}
          name="confirmarSenha"
          label="Confirmar Senha"
          placeholder="Confirme sua senha"
          errors={errors}
          isVisible={isConfirmarSenhaVisible}
          onToggleVisibility={() =>
            setIsConfirmarSenhaVisible(!isConfirmarSenhaVisible)
          }
        />
      </div>
    </div>
  );
}
