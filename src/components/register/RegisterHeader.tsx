import { UserPlus } from "lucide-react";
import logo from "../../assets/logo.png";

interface RegisterHeaderProps {
  readonly onOpenLogin: () => void;
}

export function RegisterHeader({ onOpenLogin }: RegisterHeaderProps) {
  return (
    <div className="relative z-10 text-center mb-10">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-white/95 rounded-2xl shadow-lg shadow-black/20 mb-6 overflow-hidden ring-1 ring-white/40">
        <img
          src={logo}
          alt=""
          className="w-14 h-14 object-contain"
        />
      </div>
      <h1 className="font-register text-3xl page-header-title mb-2 drop-shadow-sm">
        Santo Encontro
      </h1>
      <p className="text-sm italic page-header-subtitle">
        Juntos na fé, unidos pelo amor
      </p>
      <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-brand-accent text-white rounded-full text-xs font-medium uppercase tracking-wider shadow-lg shadow-black/20">
        <UserPlus className="w-3.5 h-3.5" aria-hidden />
        Cadastro de Usuário
      </div>
      <p className="mt-4 text-xs themed-muted">
        Já tem conta?{" "}
        <button
          type="button"
          onClick={onOpenLogin}
          className="page-header-link font-semibold underline decoration-2 underline-offset-4 hover:no-underline"
        >
          Clique aqui
        </button>
      </p>
    </div>
  );
}
