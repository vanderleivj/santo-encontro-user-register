import { useState, useEffect } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { supabase } from "../../lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";

interface LoginModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onLoginSuccess: () => void;
  readonly userEmail?: string;
  readonly isManualTrigger?: boolean;
  readonly onInactiveUser?: (reason: string) => void;
}

export function LoginModal({
  isOpen,
  onClose,
  onLoginSuccess,
  userEmail,
  isManualTrigger = false,
  onInactiveUser,
}: LoginModalProps) {
  const [email, setEmail] = useState(userEmail || "");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (userEmail) {
      setEmail(userEmail);
    } else if (isManualTrigger && isOpen) {
      setEmail("");
      setPassword("");
      setError("");
    }
  }, [userEmail, isManualTrigger, isOpen]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword(
        {
          email,
          password,
        }
      );

      if (authError) {
        throw authError;
      }

      if (data.user) {
        // Verificar se o usuário está na blacklist
        const { data: inactiveUser, error: inactiveUserError } = await supabase
          .from("inactive_users")
          .select("email, reason")
          .eq("email", email)
          .maybeSingle();

        if (inactiveUser && !inactiveUserError && inactiveUser.reason) {
          // Usuário está na blacklist
          if (onInactiveUser) {
            onInactiveUser(inactiveUser.reason);
          } else {
            setError(
              "Sua conta está inativa. Entre em contato conosco para mais informações."
            );
          }
          // Fazer logout para não manter a sessão ativa
          await supabase.auth.signOut();
          return;
        }

        // Usuário não está na blacklist, prosseguir com login
        onLoginSuccess();
      }
    } catch (err: any) {
      console.error("Erro ao fazer login:", err);
      setError(err.message || "Email ou senha incorretos. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const inputBase =
    "w-full bg-slate-50 border-none focus:ring-2 focus:ring-register-primary/20 rounded-2xl px-4 py-3.5 text-sm transition-all duration-200 disabled:bg-slate-100 disabled:cursor-not-allowed";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-3xl border-slate-100 shadow-sm">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center">
              <Lock className="w-5 h-5" aria-hidden />
            </div>
            <DialogTitle className="text-xl font-semibold text-slate-900">
              {isManualTrigger ? "Fazer Login" : "Usuário já cadastrado"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-500 text-sm leading-relaxed">
            {isManualTrigger
              ? "Digite suas credenciais para acessar sua conta e continuar."
              : "Identificamos que este email já está cadastrado. Se você já possui uma conta, faça login para continuar."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200/50 rounded-2xl">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <span className="text-xs" aria-hidden>⚠️</span>
              </div>
              <p className="text-red-800 text-sm font-medium">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5 mt-6">
          <div className="space-y-1.5">
            <label
              htmlFor="modal-email"
              className="text-xs font-medium text-slate-500 ml-1 block"
            >
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="modal-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@exemplo.com"
              required
              disabled={isLoading || !!userEmail}
              className={inputBase}
            />
          </div>

          <div className="space-y-1.5 relative">
            <label
              htmlFor="modal-password"
              className="text-xs font-medium text-slate-500 ml-1 block"
            >
              Senha <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="modal-password"
                type={isPasswordVisible ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
                required
                disabled={isLoading}
                className={`${inputBase} pr-12`}
              />
              <button
                type="button"
                onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                disabled={isLoading}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                aria-label={isPasswordVisible ? "Ocultar senha" : "Mostrar senha"}
              >
                {isPasswordVisible ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="w-full sm:flex-1 px-4 py-3.5 text-sm font-medium rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:flex-1 bg-slate-800 cursor-pointer px-4 py-3.5 text-sm font-semibold rounded-2xl bg-register-primary text-white hover:bg-transparent hover:text-slate-800 hover:border-2 hover:border-slate-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4  border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Entrando...
                </div>
              ) : (
                "Entrar"
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
