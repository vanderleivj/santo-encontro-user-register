import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowRight, Lock } from "lucide-react";
import type { Control, FieldErrors, FieldValues } from "react-hook-form";
import { CheckoutShell } from "../../CheckoutShell";
import { useCheckoutStore } from "../../checkout-store";
import {
  accountSchema,
  getPasswordStrength,
  type AccountFormData,
} from "./account-schema";
import { FormInput } from "../../../components/register/FormInput";
import { PasswordInput } from "../../../components/register/PasswordInput";
import { FormattedPhoneInput } from "../../../components/FormattedPhoneInput";
import { supabase } from "../../../lib/supabase";
import { fetchInactiveRegistrationStatus, INACTIVE_REGISTRATION_MESSAGE } from "../../../lib/inactive-registration";

export function AccountModule() {
  const navigate = useNavigate();
  const selectedPlan = useCheckoutStore((state) => state.selectedPlan);
  const setAccountCompleted = useCheckoutStore(
    (state) => state.setAccountCompleted
  );
  const [isSenhaVisible, setIsSenhaVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      senha: "",
    },
  });

  const senhaValue = useWatch({ control, name: "senha" }) ?? "";
  const passwordStrength = useMemo(
    () => getPasswordStrength(senhaValue),
    [senhaValue]
  );

  useEffect(() => {
    if (!selectedPlan) {
      navigate({ to: "/planos" });
    }
  }, [selectedPlan, navigate]);

  if (!selectedPlan) {
    return null;
  }

  const onSubmit = async (data: AccountFormData) => {
    setIsSubmitting(true);
    try {
      const inactive = await fetchInactiveRegistrationStatus({
        email: data.email,
      });

      if (inactive.exists) {
        throw new Error(INACTIVE_REGISTRATION_MESSAGE);
      }

      const { data: existingUserByEmail } = await supabase
        .from("users")
        .select("email")
        .eq("email", data.email)
        .maybeSingle();

      if (existingUserByEmail) {
        toast.message("Já existe uma conta com este e-mail. Faça login.");
        navigate({
          to: "/entrar",
          search: { next: "/sobre-voce", email: data.email },
        });
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.senha,
        options: {
          data: {
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
          },
        },
      });

      if (authError) {
        if (
          authError.message.includes("already registered") ||
          authError.message.includes("User already registered")
        ) {
          toast.message("Já existe uma conta com este e-mail. Faça login.");
          navigate({
            to: "/entrar",
            search: { next: "/sobre-voce", email: data.email },
          });
          return;
        }
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error("Erro ao criar usuário");
      }

      await new Promise((resolve) => setTimeout(resolve, 800));

      const {
        data: { user },
        error: getUserError,
      } = await supabase.auth.getUser();

      if ((!user || getUserError) && !authData.session) {
        throw new Error(
          "Confirme seu e-mail ou faça login para continuar o cadastro."
        );
      }

      const userId = user?.id ?? authData.user.id;
      useCheckoutStore.getState().bindCheckoutOwner(userId);

      const { error: userError } = await supabase.from("users").upsert(
        {
          id: userId,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone || null,
          email: data.email,
        },
        { onConflict: "id" }
      );

      if (userError) {
        throw new Error("Erro ao criar usuário: " + userError.message);
      }

      setAccountCompleted(true);
      toast.success("Conta criada! Agora conte um pouco sobre você.");
      navigate({ to: "/sobre-voce" });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao criar conta"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const formControl = control as unknown as Control<FieldValues>;
  const formErrors = errors as unknown as FieldErrors<FieldValues>;
  const filledBars = Math.min(4, Math.max(0, passwordStrength.score));

  return (
    <CheckoutShell
      step="account"
      title="Vamos criar sua conta"
      subtitle="Leva menos de um minuto. O pagamento é só na última etapa."
      showSummary
      showChangePlan
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
          <FormInput
            control={formControl}
            name="firstName"
            label="Nome"
            placeholder="Maria"
            errors={formErrors}
            required
          />
          <FormInput
            control={formControl}
            name="lastName"
            label="Sobrenome"
            placeholder="Souza"
            errors={formErrors}
            required
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
          <FormInput
            control={formControl}
            name="email"
            label="E-mail"
            type="email"
            placeholder="maria.souza@gmail.com"
            errors={formErrors}
            required
          />
          <FormattedPhoneInput
            control={formControl}
            errors={formErrors}
            required
          />
        </div>

        <div className="space-y-2">
          <PasswordInput
            control={formControl}
            name="senha"
            label="Senha"
            placeholder="••••••••••"
            errors={formErrors}
            isVisible={isSenhaVisible}
            onToggleVisibility={() => setIsSenhaVisible((value) => !value)}
          />
          <div className="flex gap-1.5 px-0.5">
            {[0, 1, 2, 3].map((index) => (
              <span
                key={index}
                className="h-1 flex-1 rounded-full transition-colors"
                style={{
                  backgroundColor:
                    index < filledBars
                      ? passwordStrength.color
                      : "var(--checkout-line,#E6DFD4)",
                }}
              />
            ))}
          </div>
          <p
            className="text-[13px] ml-0.5"
            style={{ color: senhaValue ? passwordStrength.color : "var(--checkout-ink-3,#8493A6)" }}
          >
            {senhaValue
              ? passwordStrength.label
              : "Senha forte · mínimo de 8 caracteres"}
          </p>
        </div>

        <div className="flex items-start gap-2 pt-1">
          <Lock
            className="w-[15px] h-[15px] text-[var(--checkout-ink-3,#8493A6)] shrink-0 mt-0.5"
            aria-hidden
          />
          <p className="text-xs text-[var(--checkout-ink-2,#55647A)] leading-relaxed">
            Seu WhatsApp e seu e-mail nunca aparecem no perfil público e não são
            compartilhados com outros membros.
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
          <p className="text-sm text-center sm:text-left">
            <span className="text-[var(--checkout-ink-2,#55647A)]">
              Já tem conta?{" "}
            </span>
            <button
              type="button"
              className="font-medium text-[var(--brand-accent-hover,#9A3412)] hover:underline"
              onClick={() =>
                navigate({
                  to: "/entrar",
                  search: { next: "/sobre-voce", email: undefined },
                })
              }
            >
              Entrar
            </button>
          </p>
          <button
            type="submit"
            disabled={isSubmitting}
            className="brand-primary-button w-full sm:w-auto min-w-[180px] py-3.5 px-6 rounded-xl font-bold text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {isSubmitting ? "Criando..." : "Continuar"}
            <ArrowRight className="w-4 h-4" aria-hidden />
          </button>
        </div>
      </form>
    </CheckoutShell>
  );
}
