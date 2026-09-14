import { useState } from "react";
import { toast } from "sonner";
import { formatCpfInput, isValidCpf, onlyCpfDigits } from "../../../lib/cpf";
import { InactiveCpfError, saveAuthenticatedUserCpf } from "../../../lib/user-cpf";
import {
  registerInputClass,
  registerLabelClass,
} from "../../../components/register/form-styles";

interface CpfGateFormProps {
  readonly userId: string;
  readonly onSaved: (cpfDigits: string) => void;
}

export function CpfGateForm({ userId, onSaved }: CpfGateFormProps) {
  const [cpf, setCpf] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const cpfDigits = onlyCpfDigits(cpf);
    if (!isValidCpf(cpfDigits)) {
      setError("Informe um CPF válido.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await saveAuthenticatedUserCpf({
        userId,
        cpf: cpfDigits,
      });
      toast.success("CPF salvo. Você já pode pagar.");
      onSaved(cpfDigits);
    } catch (saveError) {
      const message =
        saveError instanceof InactiveCpfError
          ? saveError.message
          : saveError instanceof Error
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
            setCpf(formatCpfInput(event.target.value));
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
