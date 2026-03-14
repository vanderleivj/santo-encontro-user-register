import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "../lib/supabase";
import { geocodeAddress, formatAddressForGeocoding } from "../lib/geocoding";
import { getTrialDays } from "../lib/trial-days";
import { isTrialAutomaticoEnabled } from "../lib/feature-flag-trial";

function isValidCPF(cpf: string): boolean {
  cpf = cpf.replace(/\D/g, "");

  if (cpf.length !== 11) return false;

  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let remainder = sum % 11;
  let digit1 = remainder < 2 ? 0 : 11 - remainder;

  if (parseInt(cpf.charAt(9)) !== digit1) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  remainder = sum % 11;
  let digit2 = remainder < 2 ? 0 : 11 - remainder;

  return parseInt(cpf.charAt(10)) === digit2;
}

/** DDDs válidos no Brasil (códigos de área da Anatel) */
const VALID_DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35,
  37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64,
  65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88,
  89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

/**
 * Valida número de celular brasileiro (WhatsApp).
 * Regras: 11 dígitos (DDD + 9 + 8 dígitos), DDD válido, celular deve começar com 9.
 * Não existe dígito verificador como no CPF; a validação é apenas estrutural.
 */
function isValidBrazilianCellPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false; // todos dígitos iguais
  const ddd = parseInt(digits.slice(0, 2), 10);
  if (!VALID_DDDS.has(ddd)) return false;
  if (digits[2] !== "9") return false; // celular no Brasil começa com 9
  return true;
}

/** Considera internacional se começar com + ou tiver mais de 11 dígitos (código do país + número). */
function isInternationalPhone(val: string): boolean {
  const trimmed = val?.trim() ?? "";
  if (trimmed.startsWith("+")) return true;
  const digits = trimmed.replace(/\D/g, "");
  return digits.length > 11;
}

/** Valida número internacional: 10 a 15 dígitos (padrão E.164). */
function isValidInternationalPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

export const registerSchema = z
  .object({
    firstName: z.string().min(1, "Nome é obrigatório"),
    lastName: z.string().min(1, "Sobrenome é obrigatório"),
    phone: z
      .string()
      .min(1, "WhatsApp é obrigatório")
      .refine(
        (val) => {
          const digits = val?.replace(/\D/g, "") ?? "";
          if (digits.length < 10) return false;
          if (isInternationalPhone(val)) {
            return isValidInternationalPhone(val);
          }
          if (digits.length !== 11) return false;
          return isValidBrazilianCellPhone(val);
        },
        "Brasil: use (DDD) 9XXXX-XXXX. Exterior: use +código do país e número (ex: +1 555 123 4567)"
      ),
    cpf: z
      .string()
      .min(1, "CPF é obrigatório")
      .min(11, "CPF deve ter 11 dígitos")
      .max(14, "CPF inválido")
      .refine((val) => {
        const cpf = val.replace(/\D/g, "");
        return cpf.length === 11 && isValidCPF(cpf);
      }, "CPF inválido"),
    email: z
      .string()
      .min(1, "Email é obrigatório")
      .email("Formato de email inválido"),
    age: z
      .string()
      .min(1, "Idade é obrigatória")
      .refine((val) => {
        const age = parseInt(val);
        return age >= 18 && age <= 120;
      }, "Idade deve ser entre 18 e 120 anos"),
    temFilhos: z.string().min(1, "Esta informação é obrigatória"),
    senha: z
      .string()
      .min(1, "Senha é obrigatória")
      .min(6, "Senha deve ter pelo menos 6 caracteres"),
    confirmarSenha: z.string().min(1, "Confirmação de senha é obrigatória"),
    address: z.string().min(1, "Endereço é obrigatório"),
    complement: z.string().optional(),
    city: z.string().min(1, "Cidade é obrigatória"),
    state: z.string().min(1, "Estado é obrigatório"),
    zip_code: z.string().optional(),
    jaCasado: z.string().min(1, "Esta informação é obrigatória"),
    nulidadeMatrimonial: z.string().optional(),
    isViuvo: z.string().optional(),
    viveCastidade: z.string().min(1, "Esta informação é obrigatória"),
    is_catholic: z.string().min(1, "Esta informação é obrigatória"),
    gender: z.string().min(1, "Sexo é obrigatório"),
    concordaRegras: z.boolean().refine((val) => val === true, {
      message: "Você deve concordar com as regras para continuar",
    }),
  })
  .refine((data) => data.senha === data.confirmarSenha, {
    message: "As senhas não coincidem",
    path: ["confirmarSenha"],
  })
  .refine(
    (data) => {
      if (data.jaCasado === "Sim") {
        // Se for viúvo, não precisa de nulidade
        if (data.isViuvo === "Sim") {
          return true;
        }
        return (
          data.nulidadeMatrimonial !== undefined &&
          data.nulidadeMatrimonial !== ""
        );
      }
      return true;
    },
    {
      message: "Esta informação é obrigatória para quem já foi casado",
      path: ["nulidadeMatrimonial"],
    }
  );

type RegisterFormData = z.infer<typeof registerSchema>;

export function useRegister() {
  const navigate = useNavigate();
  const [isSenhaVisible, setIsSenhaVisible] = useState(false);
  const [isConfirmarSenhaVisible, setIsConfirmarSenhaVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [showInactiveScreen, setShowInactiveScreen] = useState(false);
  const [inactiveReason, setInactiveReason] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [existingUserEmail, setExistingUserEmail] = useState("");

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      cpf: "",
      email: "",
      age: "",
      temFilhos: "",
      senha: "",
      confirmarSenha: "",
      address: "",
      complement: "",
      city: "",
      state: "",
      zip_code: "",
      jaCasado: "",
      nulidadeMatrimonial: "",
      isViuvo: "",
      viveCastidade: "",
      is_catholic: "",
      gender: "",
      concordaRegras: false,
    },
  });

  const jaCasado = watch("jaCasado");
  const isViuvo = watch("isViuvo");

  const registerInactiveUser = async (
    data: RegisterFormData,
    reason: string
  ) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.senha,
        options: {
          data: {
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
          },
          emailRedirectTo: undefined,
        },
      });

      if (authError) {
        console.error("❌ Erro no Supabase Auth:", authError);
        throw new Error(authError.message);
      }
      if (!authData.user) {
        console.error("❌ Usuário não criado no Auth");
        throw new Error("Erro ao criar usuário");
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const { error: userError } = await supabase.from("users").insert({
        id: authData.user.id,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || null,
        email: data.email,
      });

      if (userError) {
        console.error("❌ Erro ao criar usuário na tabela users:", userError);
        throw new Error("Erro ao criar usuário: " + userError.message);
      }

      let geocodingResult = null;

      const hasAddressInfo = data.address && data.city && data.state;

      if (hasAddressInfo) {
        try {
          const fullAddress = formatAddressForGeocoding({
            street: data.address,
            city: data.city,
            state: data.state,
            zipCode: data.zip_code,
          });

          geocodingResult = await geocodeAddress(fullAddress);
        } catch (geocodingError: any) {
          console.warn(
            "⚠️ Erro no geocoding, continuando sem coordenadas:",
            geocodingError.message
          );
        }
      } else {
      }

      const profileData: any = {
        id: authData.user.id,
        address: data.address || null,
        complement: data.complement || null,
        city: data.city || null,
        state: data.state || null,
        zip_code: data.zip_code || null,
        married_in_church: data.jaCasado === "Sim",
        marital_status:
          data.jaCasado === "Sim" ? data.nulidadeMatrimonial : null,
        is_widowed: data.isViuvo === "Sim" || false,
        lives_chastity: data.viveCastidade === "Sim",
        is_catholic: data.is_catholic === "Sim" || false,
        gender: data.gender,
        age: parseInt(data.age),
        has_children: data.temFilhos === "Sim",
        whatsapp: data.phone || null,
      };

      if (geocodingResult?.latitude && geocodingResult?.longitude) {
        profileData.latitude = geocodingResult.latitude;
        profileData.longitude = geocodingResult.longitude;
      }

      const { error: profileError } = await supabase
        .from("user_profiles")
        .insert(profileData);

      if (profileError) {
        console.error("❌ Erro ao criar perfil:", profileError);
        throw new Error("Erro ao criar perfil: " + profileError.message);
      }

      const { error } = await supabase.from("inactive_users").insert({
        email: data.email,
        cpf: data.cpf,
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone,
        reason: reason,
      });

      if (error) {
        console.error("❌ Erro ao registrar usuário inativo:", error);
        throw new Error("Erro ao registrar usuário inativo");
      }

      setInactiveReason(reason);
      setShowInactiveScreen(true);
    } catch (error) {
      console.error("❌ Erro ao registrar usuário inativo:", error);
      throw error;
    }
  };

  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);

    try {
      if (
        data.jaCasado === "Sim" &&
        data.isViuvo !== "Sim" &&
        data.nulidadeMatrimonial === "Não"
      ) {
        await registerInactiveUser(data, "Nulidade matrimonial não possui");
        setIsSubmitting(false);
        return;
      }

      if (data.is_catholic === "Não" || data.viveCastidade === "Não") {
        let reason = "";
        if (data.is_catholic === "Não" && data.viveCastidade === "Não") {
          reason =
            "Não é católico apostólico romano e não busca viver castidade";
        } else if (data.is_catholic === "Não") {
          reason = "Não é católico apostólico romano";
        } else if (data.viveCastidade === "Não") {
          reason = "Não busca viver a castidade";
        }

        await registerInactiveUser(data, reason);
        setIsSubmitting(false);
        return;
      }

      const { data: inactiveUser, error: inactiveUserError } = await supabase
        .from("inactive_users")
        .select("email, cpf")
        .or(`email.eq.${data.email},cpf.eq.${data.cpf}`)
        .single();

      if (inactiveUser && !inactiveUserError) {
        throw new Error(
          "Este email ou CPF já foi registrado anteriormente e não pode ser usado para novo cadastro."
        );
      }

      const { data: existingUserByEmail } = await supabase
        .from("users")
        .select("email")
        .eq("email", data.email)
        .maybeSingle();

      if (existingUserByEmail) {
        setExistingUserEmail(data.email);
        setShowLoginModal(true);
        setIsSubmitting(false);
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
          emailRedirectTo: undefined,
        },
      });

      if (authError) {
        if (
          authError.message.includes("already registered") ||
          authError.message.includes("User already registered") ||
          authError.message.includes("email address is already registered")
        ) {
          setExistingUserEmail(data.email);
          setShowLoginModal(true);
          setIsSubmitting(false);
          return;
        }
        console.error("❌ Erro no Supabase Auth:", authError);
        throw new Error(authError.message);
      }
      if (!authData.user) {
        console.error("❌ Usuário não criado no Auth");
        throw new Error("Erro ao criar usuário");
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const {
        data: { user },
        error: getUserError,
      } = await supabase.auth.getUser();

      if (!user || getUserError) {
        console.error("❌ Erro ao verificar usuário:", getUserError);
        throw new Error("Por favor, confirme seu email antes de continuar");
      }

      const { error: userError } = await supabase.from("users").insert({
        id: authData.user.id,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || null,
        email: data.email,
      });

      if (userError) {
        console.error("❌ Erro ao inserir na tabela users:", userError);
        throw new Error("Erro ao criar usuário: " + userError.message);
      }

      let geocodingResult = null;

      const hasAddressInfo = data.address && data.city && data.state;

      if (hasAddressInfo) {
        try {
          const fullAddress = formatAddressForGeocoding({
            street: data.address,
            city: data.city,
            state: data.state,
            zipCode: data.zip_code,
          });

          geocodingResult = await geocodeAddress(fullAddress);
        } catch (geocodingError: any) {
          console.warn(
            "⚠️ Erro no geocoding, continuando sem coordenadas:",
            geocodingError.message
          );
        }
      }

      const profileData: any = {
        id: authData.user.id,
        address: data.address || null,
        complement: data.complement || null,
        city: data.city || null,
        state: data.state || null,
        zip_code: data.zip_code || null,
        married_in_church: data.jaCasado === "Sim",
        marital_status:
          data.jaCasado === "Sim" ? data.nulidadeMatrimonial : null,
        is_widowed: data.isViuvo === "Sim" || false,
        lives_chastity: data.viveCastidade === "Sim",
        is_catholic: data.is_catholic === "Sim" || false,
        gender: data.gender,
        age: parseInt(data.age),
        has_children: data.temFilhos === "Sim",
        whatsapp: data.phone || null,
      };

      if (geocodingResult?.latitude && geocodingResult?.longitude) {
        profileData.latitude = geocodingResult.latitude;
        profileData.longitude = geocodingResult.longitude;
      }

      const { error: profileError } = await supabase
        .from("user_profiles")
        .insert(profileData);

      if (profileError) {
        console.error(
          "❌ Erro ao inserir na tabela user_profiles:",
          profileError
        );
        throw new Error("Erro ao criar perfil: " + profileError.message);
      }

      const trialAutomaticoEnabled = await isTrialAutomaticoEnabled();

      if (trialAutomaticoEnabled) {
        // Inicia o trial automaticamente (sem exigir cartão / checkout)
        const trialDays = await getTrialDays();
        const now = new Date();
        const trialEnd = new Date(
          now.getTime() + trialDays * 24 * 60 * 60 * 1000
        );

        const { data: existingSubs, error: existingSubsError } = await supabase
          .from("subscriptions")
          .select("id, status")
          .eq("user_id", authData.user.id)
          .in("status", ["active", "trialing"])
          .limit(1);

        if (existingSubsError) {
          console.warn(
            "⚠️ Erro ao verificar subscription existente (seguindo cadastro):",
            existingSubsError
          );
        }

        if (!existingSubs || existingSubs.length === 0) {
          const subscriptionData = {
            user_id: authData.user.id,
            stripe_customer_id: `trial-customer-${authData.user.id}`,
            stripe_subscription_id: null,
            plan_type: "trialing",
            status: "trialing",
            start_date: now.toISOString(),
            end_date: trialEnd.toISOString(),
            payment_intent_id: null,
            trial_days: trialDays,
          };

          const { error: subscriptionError } = await supabase
            .from("subscriptions")
            .insert([subscriptionData]);

          if (subscriptionError) {
            console.warn(
              "⚠️ Não foi possível criar o trial automaticamente:",
              subscriptionError
            );
          }
        }

        toast.success(
          "Cadastro realizado com sucesso! Seu período de teste já começou.",
          {
            duration: 2000,
          }
        );

        setTimeout(() => {
          navigate({
            to: "/success",
            search: { trial: "1", days: String(trialDays) },
          });
        }, 2000);
      } else {
        toast.success("Cadastro realizado! Escolha um plano para continuar.", {
          duration: 2000,
        });

        setTimeout(() => {
          navigate({ to: "/plans" });
        }, 2000);
      }
    } catch (error: any) {
      console.error("❌ Erro no cadastro:", error);
      toast.error(
        error?.message ||
          "Ocorreu um erro ao realizar seu cadastro. Por favor, tente novamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchAddressFromCEP = async (cep: string) => {
    if (cep && cep.replace(/\D/g, "").length === 8) {
      setIsLoadingCep(true);
      try {
        const response = await fetch(
          `https://viacep.com.br/ws/${cep.replace(/\D/g, "")}/json/`
        );
        const data = await response.json();
        if (!data.erro) {
          setValue("address", data.logradouro || "");
          setValue("city", data.localidade || "");
          setValue("state", data.estado || "");
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
      } finally {
        setIsLoadingCep(false);
      }
    }
  };

  const handleBackToLogin = () => {
    setShowInactiveScreen(false);
    setInactiveReason("");
  };

  const checkInactiveUser = async (email: string) => {
    try {
      const { data: inactiveUser, error: inactiveUserError } = await supabase
        .from("inactive_users")
        .select("email, reason")
        .eq("email", email)
        .maybeSingle();

      if (inactiveUser && !inactiveUserError) {
        return inactiveUser.reason;
      }
      return null;
    } catch (error) {
      console.error("Erro ao verificar usuário inativo:", error);
      return null;
    }
  };

  return {
    onSubmit,
    fetchAddressFromCEP,
    jaCasado,
    isViuvo,
    errors,
    control,
    handleSubmit,
    setIsConfirmarSenhaVisible,
    isConfirmarSenhaVisible,
    setIsSenhaVisible,
    isSenhaVisible,
    isLoadingCep,
    isSubmitting,
    showInactiveScreen,
    inactiveReason,
    handleBackToLogin,
    showLoginModal,
    setShowLoginModal,
    existingUserEmail,
    checkInactiveUser,
    setInactiveReason,
    setShowInactiveScreen,
  };
}
