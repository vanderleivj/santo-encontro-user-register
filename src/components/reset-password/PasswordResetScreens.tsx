import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import logo from "../../assets/logo.png";
import { SupportContact } from "../register/SupportContact";

type Feedback = {
  readonly type: "success" | "error" | "info";
  readonly title: string;
  readonly description: string;
};

type ResetStep = "checking" | "ready" | "error" | "success";

const PASSWORD_MIN_LENGTH = 6;
const APP_DEEP_LINK = "santo-encontro://login";

function getSiteUrl() {
  const envUrl = import.meta.env?.VITE_PUBLIC_SITE_URL;
  return (envUrl || globalThis.location.origin).replace(/\/$/, "");
}

function getRecoveryRedirectUrl() {
  return `${getSiteUrl()}/auth/callback?next=/reset-password`;
}

function getUrlParams() {
  const queryParams = new URLSearchParams(globalThis.location.search);
  const hashParams = new URLSearchParams(globalThis.location.hash.replace(/^#/, ""));

  return { queryParams, hashParams };
}

function hasRecoveryLinkParams() {
  const { queryParams, hashParams } = getUrlParams();
  const recoveryKeys = [
    "access_token",
    "refresh_token",
    "code",
    "error",
    "error_code",
  ];

  if (
    queryParams.get("type") === "recovery" ||
    hashParams.get("type") === "recovery"
  ) {
    return true;
  }

  return recoveryKeys.some(
    (key) => queryParams.has(key) || hashParams.has(key)
  );
}

function getFriendlyRecoveryError(description?: string | null, code?: string | null) {
  if (code === "otp_expired") {
    return "Este link expirou. Solicite um novo email de recuperação para continuar.";
  }

  if (description) {
    return description.replaceAll("+", " ");
  }

  return "Não conseguimos validar este link. Solicite um novo email de recuperação.";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "";
}

function getErrorCode(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }

  return null;
}

function isInsideWebView() {
  return Boolean(
    (globalThis as typeof globalThis & {
      ReactNativeWebView?: { postMessage: (message: string) => void };
    }).ReactNativeWebView
  );
}

function notifyAppPasswordResetDone() {
  const bridge = (
    globalThis as typeof globalThis & {
      ReactNativeWebView?: { postMessage: (message: string) => void };
    }
  ).ReactNativeWebView;

  if (bridge) {
    bridge.postMessage(JSON.stringify({ type: "PASSWORD_RESET_DONE" }));
    return;
  }

  globalThis.location.href = APP_DEEP_LINK;
}

function PasswordResetShell({
  badge,
  title,
  subtitle,
  icon,
  children,
}: {
  readonly badge: string;
  readonly title: string;
  readonly subtitle: string;
  readonly icon: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-register-bg text-slate-900 font-sans">
      <main className="max-w-md mx-auto px-6 pb-12 pt-4">
        <header className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-sm mb-6 overflow-hidden">
            <img src={logo} alt="" className="w-14 h-14 object-contain" />
          </div>
          <h1 className="font-register text-3xl text-register-primary mb-2">
            Santo Encontro
          </h1>
          <p className="text-slate-500 text-sm italic">
            Juntos na fé, unidos pelo amor
          </p>
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-register-primary text-white rounded-full text-xs font-medium uppercase tracking-wider">
            {icon}
            {badge}
          </div>
          <div className="mt-6 space-y-2">
            <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
            <p className="text-sm leading-6 text-slate-500">{subtitle}</p>
          </div>
        </header>

        {children}

        <div className="flex justify-center mt-12 mb-2">
          <div className="w-32 h-1.5 bg-slate-200 rounded-full" />
        </div>
      </main>
    </div>
  );
}

function FeedbackCard({ feedback }: { readonly feedback: Feedback }) {
  const styles = {
    success: {
      container: "bg-emerald-50 text-emerald-900 ring-emerald-100",
      icon: "text-emerald-600",
      Icon: CheckCircle2,
    },
    error: {
      container: "bg-red-50 text-red-900 ring-red-100",
      icon: "text-red-600",
      Icon: AlertCircle,
    },
    info: {
      container: "bg-blue-50 text-blue-900 ring-blue-100",
      icon: "text-blue-600",
      Icon: ShieldCheck,
    },
  }[feedback.type];
  const Icon = styles.Icon;

  return (
    <div className={`rounded-2xl p-4 ring-1 ${styles.container}`}>
      <div className="flex gap-3">
        <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${styles.icon}`} />
        <div>
          <p className="text-sm font-semibold">{feedback.title}</p>
          <p className="mt-1 text-sm leading-5 opacity-80">
            {feedback.description}
          </p>
        </div>
      </div>
    </div>
  );
}

function PrimaryButton({
  children,
  disabled,
}: {
  readonly children: ReactNode;
  readonly disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="cursor-pointer w-full bg-slate-800 hover:border-2 hover:border-slate-800 hover:bg-transparent hover:text-slate-800 text-white font-semibold py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-register-primary/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
    >
      {children}
    </button>
  );
}

function SpinnerLabel({ children }: { readonly children: ReactNode }) {
  return (
    <span className="flex items-center justify-center gap-2">
      <LoaderCircle className="h-4 w-4 animate-spin" />
      {children}
    </span>
  );
}

function PasswordField({
  id,
  label,
  value,
  visible,
  autoComplete,
  onChange,
  onToggleVisibility,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly visible: boolean;
  readonly autoComplete: string;
  readonly onChange: (value: string) => void;
  readonly onToggleVisibility: () => void;
}) {
  return (
    <label className="block space-y-2" htmlFor={id}>
      <span className="text-xs font-medium text-slate-500 ml-1 block">
        {label}
      </span>
      <span className="relative block">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          className="w-full bg-slate-50 border-none focus:ring-2 focus:ring-register-primary/20 rounded-2xl px-4 py-3.5 pr-12 text-sm transition-all duration-200"
          required
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-register-primary transition-colors"
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        >
          {visible ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </span>
    </label>
  );
}

export function ForgotPasswordScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const canSubmit = email.trim().length > 0 && !isSubmitting;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFeedback(null);

    if (!email.trim()) {
      setFeedback({
        type: "error",
        title: "Informe seu email",
        description: "Digite o email cadastrado para receber o link de recuperação.",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: getRecoveryRedirectUrl(),
      });

      if (error) throw error;

      setFeedback({
        type: "success",
        title: "Email enviado",
        description:
          "Se este email estiver cadastrado, você receberá um link para criar uma nova senha. Verifique também a caixa de spam.",
      });
    } catch (error: unknown) {
      const isRateLimit = getErrorMessage(error)
        .toLowerCase()
        .includes("too many");

      setFeedback({
        type: "error",
        title: isRateLimit ? "Muitas tentativas" : "Não foi possível enviar",
        description: isRateLimit
          ? "Aguarde alguns minutos antes de solicitar um novo link."
          : "Verifique sua conexão e tente novamente. Se o problema continuar, fale com o suporte.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PasswordResetShell
      badge="Recuperar senha"
      title="Vamos recuperar seu acesso"
      subtitle="Informe o email da sua conta. Enviaremos um link seguro para você definir uma nova senha."
      icon={<Mail className="w-3.5 h-3.5" aria-hidden />}
    >
      <div className="mb-6">
        <SupportContact />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block space-y-2" htmlFor="email">
          <span className="text-xs font-medium text-slate-500 ml-1 block">
            Email cadastrado
          </span>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="seuemail@exemplo.com"
            className="w-full bg-slate-50 border-none focus:ring-2 focus:ring-register-primary/20 rounded-2xl px-4 py-3.5 text-sm transition-all duration-200"
            required
          />
        </label>

        {feedback ? <FeedbackCard feedback={feedback} /> : null}

        <PrimaryButton disabled={!canSubmit}>
          {isSubmitting ? <SpinnerLabel>Enviando link...</SpinnerLabel> : "Enviar link de recuperação"}
        </PrimaryButton>
      </form>

      <button
        type="button"
        onClick={() => navigate({ to: "/registrar" })}
        className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-register-primary hover:text-slate-800 transition-colors mx-auto"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para criação de conta
      </button>
    </PasswordResetShell>
  );
}

export function PasswordResetEntryScreen() {
  if (hasRecoveryLinkParams()) {
    return <AuthCallbackScreen />;
  }

  return <ForgotPasswordScreen />;
}

export function AuthCallbackScreen() {
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState<Feedback>({
    type: "info",
    title: "Validando link",
    description: "Estamos verificando o link enviado para o seu email.",
  });

  useEffect(() => {
    const processRecoveryLink = async () => {
      const { queryParams, hashParams } = getUrlParams();
      const errorCode = queryParams.get("error_code") || hashParams.get("error_code");
      const errorDescription =
        queryParams.get("error_description") || hashParams.get("error_description");
      const error = queryParams.get("error") || hashParams.get("error");
      const code = queryParams.get("code") || hashParams.get("code");
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (error || errorCode) {
        setFeedback({
          type: "error",
          title: "Link inválido",
          description: getFriendlyRecoveryError(errorDescription, errorCode),
        });
        return;
      }

      try {
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
            code
          );
          if (exchangeError) throw exchangeError;
        } else if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
        } else {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (!session?.user) {
            setFeedback({
              type: "error",
              title: "Link não encontrado",
              description:
                "Abra novamente o link recebido no email ou solicite um novo link de recuperação.",
            });
            return;
          }
        }

        navigate({ to: "/reset-password", replace: true });
      } catch (processError: unknown) {
        setFeedback({
          type: "error",
          title: "Não foi possível validar",
          description: getFriendlyRecoveryError(
            getErrorMessage(processError),
            getErrorCode(processError)
          ),
        });
      }
    };

    processRecoveryLink();
  }, [navigate]);

  return (
    <PasswordResetShell
      badge="Verificação"
      title={feedback.type === "error" ? "Link não validado" : "Validando seu link"}
      subtitle={
        feedback.type === "error"
          ? "Você pode solicitar um novo link de recuperação."
          : "Isso leva apenas alguns segundos."
      }
      icon={
        feedback.type === "error" ? (
          <AlertCircle className="w-3.5 h-3.5" aria-hidden />
        ) : (
          <ShieldCheck className="w-3.5 h-3.5" aria-hidden />
        )
      }
    >
      <div className="space-y-5">
        {feedback.type === "info" ? (
          <div className="flex justify-center py-4">
            <LoaderCircle className="h-10 w-10 animate-spin text-register-primary" />
          </div>
        ) : null}

        <FeedbackCard feedback={feedback} />

        {feedback.type === "error" ? (
          <button
            type="button"
            onClick={() => navigate({ to: "/forgot-password" })}
            className="cursor-pointer w-full bg-slate-800 hover:border-2 hover:border-slate-800 hover:bg-transparent hover:text-slate-800 text-white font-semibold py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-register-primary/50"
          >
            Solicitar novo link
          </button>
        ) : null}
      </div>
    </PasswordResetShell>
  );
}

export function ResetPasswordScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState<ResetStep>("checking");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isWebView = useMemo(() => isInsideWebView(), []);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session?.user) {
        setStep("error");
        setFeedback({
          type: "error",
          title: "Link expirado",
          description:
            "A sessão de recuperação não está mais ativa. Solicite um novo link para definir sua senha.",
        });
        return;
      }

      setStep("ready");
      setFeedback({
        type: "info",
        title: "Link validado",
        description:
          "Defina uma senha segura para voltar a acessar sua conta Santo Encontro.",
      });
    };

    checkSession();
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFeedback(null);

    if (password.length < PASSWORD_MIN_LENGTH) {
      setFeedback({
        type: "error",
        title: "Senha muito curta",
        description: `Use pelo menos ${PASSWORD_MIN_LENGTH} caracteres para sua nova senha.`,
      });
      return;
    }

    if (password !== confirmPassword) {
      setFeedback({
        type: "error",
        title: "Senhas diferentes",
        description: "Confirme a nova senha digitando o mesmo valor nos dois campos.",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      await supabase.auth.signOut();
      setStep("success");
      setFeedback({
        type: "success",
        title: "Senha atualizada",
        description: "Agora você já pode fazer login com a nova senha.",
      });
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      setFeedback({
        type: "error",
        title: "Não foi possível atualizar",
        description: message.includes("session_not_found")
          ? "Sua sessão expirou. Solicite um novo link de recuperação."
          : "Tente novamente em alguns instantes. Se o erro continuar, solicite um novo link.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === "checking") {
    return (
      <PasswordResetShell
        badge="Nova senha"
        title="Verificando seu acesso"
        subtitle="Estamos confirmando se o link de recuperação ainda está válido."
        icon={<ShieldCheck className="w-3.5 h-3.5" aria-hidden />}
      >
        <div className="flex flex-col items-center justify-center gap-4 py-10">
          <LoaderCircle className="h-10 w-10 animate-spin text-register-primary" />
          <p className="text-sm text-slate-500">Verificando sessão...</p>
        </div>
      </PasswordResetShell>
    );
  }

  if (step === "error") {
    return (
      <PasswordResetShell
        badge="Link expirado"
        title="Vamos enviar um novo link"
        subtitle="Por segurança, links de recuperação têm validade limitada."
        icon={<AlertCircle className="w-3.5 h-3.5" aria-hidden />}
      >
        <div className="space-y-5">
          {feedback ? <FeedbackCard feedback={feedback} /> : null}
          <button
            type="button"
            onClick={() => navigate({ to: "/forgot-password" })}
            className="cursor-pointer w-full bg-slate-800 hover:border-2 hover:border-slate-800 hover:bg-transparent hover:text-slate-800 text-white font-semibold py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-register-primary/50"
          >
            Enviar novo link
          </button>
          <SupportContact />
        </div>
      </PasswordResetShell>
    );
  }

  if (step === "success") {
    return (
      <PasswordResetShell
        badge="Tudo certo"
        title="Senha atualizada"
        subtitle="Use sua nova senha para voltar ao Santo Encontro."
        icon={<CheckCircle2 className="w-3.5 h-3.5" aria-hidden />}
      >
        <div className="space-y-5">
          {feedback ? <FeedbackCard feedback={feedback} /> : null}
          <button
            type="button"
            onClick={notifyAppPasswordResetDone}
            className="cursor-pointer w-full bg-slate-800 hover:border-2 hover:border-slate-800 hover:bg-transparent hover:text-slate-800 text-white font-semibold py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-register-primary/50"
          >
            {isWebView ? "Voltar para o app" : "Abrir o app para fazer login"}
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/forgot-password" })}
            className="w-full text-sm font-semibold text-register-primary hover:text-slate-800 transition-colors"
          >
            Enviar outro link
          </button>
        </div>
      </PasswordResetShell>
    );
  }

  return (
    <PasswordResetShell
      badge="Nova senha"
      title="Defina sua nova senha"
      subtitle="Escolha uma senha segura e confirme no segundo campo."
      icon={<KeyRound className="w-3.5 h-3.5" aria-hidden />}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {feedback ? <FeedbackCard feedback={feedback} /> : null}

        <PasswordField
          id="password"
          label="Nova senha"
          value={password}
          visible={isPasswordVisible}
          autoComplete="new-password"
          onChange={setPassword}
          onToggleVisibility={() => setIsPasswordVisible((value) => !value)}
        />

        <PasswordField
          id="confirm-password"
          label="Confirmar nova senha"
          value={confirmPassword}
          visible={isConfirmPasswordVisible}
          autoComplete="new-password"
          onChange={setConfirmPassword}
          onToggleVisibility={() =>
            setIsConfirmPasswordVisible((value) => !value)
          }
        />

        <PrimaryButton disabled={isSubmitting}>
          {isSubmitting ? <SpinnerLabel>Atualizando senha...</SpinnerLabel> : "Atualizar senha"}
        </PrimaryButton>
      </form>
    </PasswordResetShell>
  );
}
