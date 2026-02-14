import { UserPlus } from "lucide-react";
import logo from "../../assets/logo.png";

interface RegisterHeaderProps {
  readonly onOpenLogin: () => void;
}

export function RegisterHeader({ onOpenLogin }: RegisterHeaderProps) {
  return (
    <div className="text-center mb-10">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-sm mb-6 overflow-hidden">
        <img
          src={logo}
          alt=""
          className="w-14 h-14 object-contain"
        />
      </div>
      <h1 className="font-register text-3xl text-register-primary mb-2">
        Santo Encontro
      </h1>
      <p className="text-slate-500 text-sm italic">Juntos na fé, unidos pelo amor</p>
      <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-register-primary text-white rounded-full text-xs font-medium uppercase tracking-wider">
        <UserPlus className="w-3.5 h-3.5" aria-hidden />
        Cadastro de Usuário
      </div>
      <p className="mt-4 text-xs text-slate-400">
        Já tem conta?{" "}
        <button
          type="button"
          onClick={onOpenLogin}
          className="text-register-primary font-semibold underline decoration-2 underline-offset-4 hover:no-underline"
        >
          Clique aqui
        </button>
      </p>
    </div>
  );
}
