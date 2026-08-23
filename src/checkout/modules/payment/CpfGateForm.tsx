import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "../../../lib/supabase";
import { fetchInactiveRegistrationStatus, INACTIVE_REGISTRATION_MESSAGE } from "../../../lib/inactive-registration";
import {
  registerInputClass,
  registerLabelClass,
} from "../../../components/register/form-styles";

interface CpfGateFormProps {
  readonly userId: string;
  readonly onSaved: (cpfDigits: string) => void;
}

function isValidCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let index = 0; index < 9; index++) {
    sum += Number.parseInt(digits.charAt(index), 10) * (10 - index);
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (Number.parseInt(digits.charAt(9), 10) !== digit1) return false;

  sum = 0;
  for (let index = 0; index < 10; index++) {
    sum += Number.parseInt(digits.charAt(index), 10) * (11 - index);
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  return Number.parseInt(digits.charAt(10), 10) === digit2;
}

function formatCpf(value: string): string {
  return value
    .replace(/\D/g, "")
    .replace(/^(\d{3})(\d)/g, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/g, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/g, "$1.$2.$3-$4")
    .substring(0, 14);
}

export function CpfGateForm({ userId, onSaved }: CpfGateFormProps) {
  const [cpf, setCpf] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const cpfDigits = cpf.replace(/\D/g, "");
    if (!isValidCPF(cpfDigits)) {
      setError("Informe um CPF válido.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const inactive = await fetchInactiveRegistrationStatus({
        cpf: cpfDigits,
      });
      if (inactive.exists) {
        throw new Error(INACTIVE_REGISTRATION_MESSAGE);
      }

      const { error: updateError } = await supabase
        .from("users")
        .update({ cpf: cpfDigits })
        .eq("id", userId);

      if (updateError) {
        throw new Error(
          updateError.message.includes("duplicate") ||
            updateError.code === "23505"
            ? "Este CPF já está em uso em outra conta."
            : "Não foi possível salvar o CPF. Tente novamente."
        );
      }

      toast.success("CPF salvo. Você já pode pagar.");
      onSaved(cpfDigits);
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Erro ao salvar o CPF";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-slate-600">
        Para gerar o pagamento, precisamos do seu CPF no cadastro.
      </p>

      <div className="space-y-1.5">
        <label htmlFor="gate-cpf" className={registerLabelClass}>
          CPF <span className="text-red-500">*</span>
        </label>
        <input
          id="gate-cpf"
          value={cpf}
          onChange={(event) => {
            setCpf(formatCpf(event.target.value));
            setError(null);
          }}
          placeholder="000.000.000-00"
          maxLength={14}
          inputMode="numeric"
          autoComplete="off"
          className={registerInputClass}
        />
        {error ? (
          <p className="text-red-600 text-sm mt-1 ml-1">{error}</p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="brand-primary-button w-full py-3.5 rounded-2xl font-bold text-sm disabled:opacity-50"
      >
        {loading ? "Salvando..." : "Salvar CPF e continuar"}
      </button>
    </form>
  );
}
