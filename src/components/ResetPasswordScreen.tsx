import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabase";
import ScreenLayout from "./ScreenLayout";

export default function ResetPasswordScreen() {
  const resolvePublicSiteBaseUrl = () => {
    const fallback = globalThis.location.origin;
    const raw = (import.meta as any).env?.VITE_PUBLIC_SITE_URL;

    if (typeof raw !== "string") return fallback;
    const trimmed = raw.trim();
    if (!trimmed) return fallback;

    const candidates = [
      trimmed,
      // Caso comum em deploy: variável sem protocolo (ex.: "santoencontro.com")
      `https://${trimmed.replace(/^https?:\/\//, "")}`,
    ];

    for (const candidate of candidates) {
      try {
        const url = new URL(candidate);
        const basePath = url.pathname.replace(/\/+$/, "");
        return `${url.origin}${basePath || ""}`;
      } catch {
        // tentar próximo candidato
      }
    }

    return fallback;
  };
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("error");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordResetMode, setIsPasswordResetMode] = useState(false);
  const didJustUpdatePasswordRef = useRef(false);
  const navigate = useNavigate();
  const search = useSearch({ strict: false });

  const verifyUserAuthentication = useCallback(async () => {
    setIsLoading(true);
    try {
      // Primeiro, tentar obter a sessão atual (pode ter sido estabelecida pelo Supabase automaticamente)
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Se já temos uma sessão válida, usar ela
      if (session?.user) {
        setMessage("Defina sua nova senha abaixo.");
        setMessageType("success");
        setIsLoading(false);
        return;
      }

      // Se não temos sessão, tentar processar tokens do hash
      const hashParams = new URLSearchParams(
        globalThis.location.hash.substring(1)
      );
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      // Se temos tokens no hash, estabelecer a sessão
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          throw error;
        }

        setMessage("Defina sua nova senha abaixo.");
        setMessageType("success");
      } else {
        // Tentar obter o usuário (pode estar autenticado mas sem sessão salva)
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setMessage("Sessão expirada. Solicite um novo reset de senha.");
          setMessageType("error");
          setIsPasswordResetMode(false);
        } else {
          setMessage("Defina sua nova senha abaixo.");
          setMessageType("success");
        }
      }
    } catch (error: any) {
      console.error("Erro ao verificar autenticação:", error);
      setMessage(error.message || "Erro ao verificar sessão. Tente novamente.");
      setMessageType("error");
      setIsPasswordResetMode(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const checkParamsAndSession = async () => {
      // Verificar hash params
      const hashParams = new URLSearchParams(
        globalThis.location.hash.substring(1)
      );
      const typeFromHash = hashParams.get("type");
      const accessToken = hashParams.get("access_token");
      const codeFromHash = hashParams.get("code"); // Código no hash

      // Verificar query params
      const queryParams = new URLSearchParams(globalThis.location.search);
      const typeFromQuery = queryParams.get("type");
      const codeFromQuery = queryParams.get("code"); // Código na query

      // Priorizar código do hash, depois query
      const code = codeFromHash || codeFromQuery;

      // Se temos um código, precisamos processá-lo manualmente
      if (code) {
        setIsLoading(true);

        // Se código está na query, converter para hash primeiro
        if (codeFromQuery && !codeFromHash) {
          const hashParam = "#code=" + codeFromQuery;
          const newUrl =
            globalThis.location.origin +
            globalThis.location.pathname +
            hashParam;
          globalThis.location.replace(newUrl);
          return; // Página vai recarregar com hash
        }

        // Se código está no hash, verificar erros primeiro
        if (codeFromHash) {
          // Verificar se há erros no hash (pode vir do redirect do Supabase)
          const errorFromHash = hashParams.get("error");
          const errorCode = hashParams.get("error_code");
          const errorDescription = hashParams.get("error_description");

          if (errorFromHash || errorCode) {
            console.error("❌ Erro detectado:", errorCode, errorDescription);
            setIsLoading(false);
            setMessage(
              errorCode === "otp_expired"
                ? "Link de recuperação expirado. Solicite um novo reset de senha."
                : errorDescription?.replaceAll("+", " ") ||
                    "Link de recuperação inválido. Solicite um novo reset."
            );
            setMessageType("error");
            setIsPasswordResetMode(false);
            // Limpar hash com erro
            globalThis.history.replaceState(
              {},
              "",
              globalThis.location.pathname
            );
            return;
          }

          // Verificar se já temos sessão (pode ter sido estabelecida automaticamente)
          const {
            data: { session: checkSession },
          } = await supabase.auth.getSession();

          if (checkSession?.user) {
            setIsPasswordResetMode(true);
            setIsLoading(false);
            setMessage("Defina sua nova senha abaixo.");
            setMessageType("success");
            globalThis.history.replaceState(
              {},
              "",
              globalThis.location.pathname
            );
            return;
          }

          await new Promise((resolve) => setTimeout(resolve, 1500));

          const {
            data: { session: delayedSession },
          } = await supabase.auth.getSession();

          if (delayedSession?.user) {
            setIsPasswordResetMode(true);
            setIsLoading(false);
            setMessage("Defina sua nova senha abaixo.");
            setMessageType("success");
            globalThis.history.replaceState(
              {},
              "",
              globalThis.location.pathname
            );
            return;
          }

          // Se ainda não temos sessão, provavelmente o código está expirado/inválido
          console.warn("⚠️ Código presente mas sem sessão após delay");
          setIsLoading(false);
          setMessage(
            "Link de recuperação inválido ou expirado. Solicite um novo reset de senha."
          );
          setMessageType("error");
          setIsPasswordResetMode(false);
          globalThis.history.replaceState({}, "", globalThis.location.pathname);
        }

        console.warn("⚠️ Não foi possível processar o código automaticamente");
        setIsLoading(false);
      }

      // Verificar se já existe uma sessão válida de recovery
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Se já temos sessão e código, ativar modo recovery
      if (codeFromQuery && session) {
        setIsPasswordResetMode(true);
        setIsLoading(false);
        setMessage("Defina sua nova senha abaixo.");
        setMessageType("success");
        // Limpar código da URL
        globalThis.history.replaceState({}, "", globalThis.location.pathname);
        return;
      }

      // Detectar se estamos no modo de reset de senha
      const isRecoveryMode =
        typeFromHash === "recovery" ||
        typeFromQuery === "recovery" ||
        accessToken ||
        (session?.user && session.user.app_metadata?.provider === "email");

      if (isRecoveryMode) {
        setIsPasswordResetMode(true);
        verifyUserAuthentication();
      } else {
        setIsPasswordResetMode(false);
      }
    };

    checkParamsAndSession();

    // Escutar mudanças no hash
    const handleHashChange = () => {
      checkParamsAndSession();
    };

    globalThis.addEventListener("hashchange", handleHashChange);

    // Escutar mudanças na sessão do Supabase
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        if (session?.user) {
          setIsPasswordResetMode(true);
          setIsLoading(false);
          setMessage("Defina sua nova senha abaixo.");
          setMessageType("success");

          // Limpar código da URL após processamento
          if (globalThis.location.search.includes("code=")) {
            globalThis.history.replaceState(
              {},
              "",
              globalThis.location.pathname
            );
          }

          return;
        }
      }

      // Para outros eventos, revalidar (não sobrescrever mensagem logo após atualizar senha)
      if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        if (didJustUpdatePasswordRef.current) return;
        if (session?.user) {
          checkParamsAndSession();
        }
      }

      // Se ainda temos código na URL após INITIAL_SESSION, verificar novamente após um delay
      if (
        event === "INITIAL_SESSION" &&
        globalThis.location.search.includes("code=")
      ) {
        setTimeout(async () => {
          const {
            data: { session: delayedSession },
          } = await supabase.auth.getSession();
          if (delayedSession?.user) {
            setIsPasswordResetMode(true);
            setIsLoading(false);
            setMessage("Defina sua nova senha abaixo.");
            setMessageType("success");
            globalThis.history.replaceState(
              {},
              "",
              globalThis.location.pathname
            );
          } else {
            console.warn(
              "⚠️ Sessão não foi criada após delay com código na URL"
            );
            setIsLoading(false);
          }
        }, 1000);
      }
    });

    return () => {
      globalThis.removeEventListener("hashchange", handleHashChange);
      subscription.unsubscribe();
    };
  }, [search, verifyUserAuthentication]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      if (isPasswordResetMode) {
        await handlePasswordUpdate();
      } else {
        await handlePasswordResetRequest();
      }
    } catch (error: any) {
      setMessage(error.message || "Ocorreu um erro. Tente novamente.");
      setMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordResetRequest = async () => {
    const cleanedEmail = email.trim();
    if (!cleanedEmail) {
      throw new Error("Informe um email válido.");
    }

    const baseUrl = resolvePublicSiteBaseUrl();
    const redirectUrl = new URL(baseUrl);
    if (!redirectUrl.pathname.endsWith("/")) redirectUrl.pathname += "/";
    // Usar sempre query (?type=recovery), nunca hash (#type=recovery), para o allow list do Supabase
    // e para evitar 500 quando o redirect_to não bate com Redirect URLs.
    redirectUrl.hash = "";
    redirectUrl.search = "";
    redirectUrl.searchParams.set("type", "recovery");

    // URL deve estar em Authentication > URL Configuration > Redirect URLs no Supabase
    // (ex.: http://localhost:5173/** ou https://app.santoencontro.com/**)
    const redirectTo = redirectUrl.toString();

    const { error } = await supabase.auth.resetPasswordForEmail(cleanedEmail, {
      redirectTo,
    });

    if (error) {
      const status = (error as any)?.status;
      console.error("Erro ao solicitar reset de senha:", {
        status,
        message: error.message,
        redirectTo,
      });
      // 500 no /recover: redirect URL não permitida, SMTP não configurado ou template de email inválido
      if (status === 500) {
        const origin = (() => {
          try {
            return new URL(redirectTo).origin + "/**";
          } catch {
            return redirectTo;
          }
        })();
        throw new Error(
          "Falha no servidor de recuperação de senha. 1) Redirect URLs: em Authentication > URL Configuration adicione: " +
            origin +
            " (ou a URL exata: " +
            redirectTo +
            "). 2) Se o detalhe for 'Error sending recovery email', configure SMTP em Authentication > Providers > Email (o padrão tem limite de 2 emails/hora). Detalhe: " +
            (error.message || "unexpected_failure")
        );
      }
      throw new Error(
        status ? `${error.message} (HTTP ${status})` : error.message
      );
    }

    setMessage(
      "Instruções de redefinição de senha foram enviadas para seu email. Verifique sua caixa de entrada e spam."
    );
    setMessageType("success");
  };

  const handlePasswordUpdate = async () => {
    if (newPassword !== confirmPassword) {
      throw new Error("As senhas não coincidem.");
    }

    if (newPassword.length < 6) {
      throw new Error("A senha deve ter pelo menos 6 caracteres.");
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw error;
    }

    didJustUpdatePasswordRef.current = true;
    setMessage("Senha atualizada com sucesso! Volte para o aplicativo");
    setMessageType("success");

    setTimeout(() => {
      navigate({ to: "/" });
    }, 2000);
  };

  if (isLoading) {
    return (
      <ScreenLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-600 text-lg">Verificando sessão...</p>
        </div>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-4">
          Santo Encontro
        </h1>
        <p className="text-slate-600 text-lg font-light mb-6">
          Juntos na fé, unidos pelo amor
        </p>
        <div className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl text-sm font-medium shadow-lg">
          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
          <span>
            {isPasswordResetMode ? "🔐 Nova Senha" : "🔑 Redefinir Senha"}
          </span>
        </div>
      </div>

      <div className="text-center mb-8">
        <div className="text-6xl mb-4">{isPasswordResetMode ? "🔑" : "🔐"}</div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl my-6 shadow-sm border ${
            messageType === "error"
              ? "bg-red-50/80 border-red-200/50 text-red-800"
              : "bg-emerald-50/80 border-emerald-200/50 text-emerald-800"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                messageType === "error" ? "bg-red-100" : "bg-emerald-100"
              }`}
            >
              <span className="text-sm">
                {messageType === "error" ? "⚠️" : "✅"}
              </span>
            </div>
            <span className="font-medium text-sm">{message}</span>
          </div>
        </div>
      )}
      <form onSubmit={handleSubmit} className="max-w-md mx-auto">
        {isPasswordResetMode ? (
          <div className="space-y-6">
            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Nova Senha <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={isNewPasswordVisible ? "text" : "password"}
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Digite sua nova senha"
                />
                <button
                  type="button"
                  onClick={() => setIsNewPasswordVisible(!isNewPasswordVisible)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {isNewPasswordVisible ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Confirmar Nova Senha <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={isConfirmPasswordVisible ? "text" : "password"}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Confirme sua nova senha"
                />
                <button
                  type="button"
                  onClick={() =>
                    setIsConfirmPasswordVisible(!isConfirmPasswordVisible)
                  }
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {isConfirmPasswordVisible ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-slate-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              placeholder="Digite seu email"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 px-6 bg-slate-900 text-white rounded-full text-lg font-semibold transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none mt-8"
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              {isPasswordResetMode ? "Atualizando..." : "Enviando..."}
            </div>
          ) : isPasswordResetMode ? (
            "🔐 Atualizar Senha"
          ) : (
            "📧 Enviar Instruções"
          )}
        </button>
      </form>

      <div className="text-center mt-8">
        <button
          onClick={() => navigate({ to: "/" })}
          className="text-orange-600 font-semibold hover:text-orange-700 transition-colors"
        >
          ← Voltar para Login
        </button>

        {!isPasswordResetMode && (
          <div className="text-slate-500 text-sm mt-4">
            💡 Dica: Verifique sua caixa de spam se não receber o email.
          </div>
        )}
      </div>
    </ScreenLayout>
  );
}
