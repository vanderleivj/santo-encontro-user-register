import { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  ScrollText,
  TriangleAlert,
} from "lucide-react";
import type { Control, FieldErrors, FieldValues } from "react-hook-form";
import { CheckoutShell } from "../../CheckoutShell";
import { useCheckoutStore } from "../../checkout-store";
import {
  formatBirthDateInput,
  getAgeFromBirthDate,
  profileSchema,
  type ProfileFormData,
} from "./profile-schema";
import { ChoicePills } from "./ChoicePills";
import { FormSelect } from "./FormSelect";
import { FormInput } from "../../../components/register/FormInput";
import { statesList } from "../../../utils/states-list";
import {
  registerInputClass,
  registerLabelClass,
} from "../../../components/register/form-styles";
import { supabase } from "../../../lib/supabase";
import { geocodeAddress, formatAddressForGeocoding } from "../../../lib/geocoding";
import {
  fetchAddressFromCep,
  formatCepInput,
  isCompleteCep,
} from "../../../lib/viacep";
import {
  isCheckoutProfileComplete,
  resolveCheckoutDestination,
} from "../../shared/resolve-checkout-destination";

const YES_NO = [
  { value: "Sim", label: "Sim" },
  { value: "Não", label: "Não" },
] as const;

const GENDER_OPTIONS = [
  { value: "female", label: "Feminino" },
  { value: "male", label: "Masculino" },
] as const;

const CONSENT_ITEMS = [
  "É católico apostólico romano, solteiro(a) e maior de 18 anos",
  "Busca um relacionamento vivendo a castidade",
  "Todas as informações que forneceu são verdadeiras",
  "É o único responsável por encontros presenciais que vier a marcar com outros membros",
] as const;

const EMPTY_PROFILE: ProfileFormData = {
  birthDate: "",
  gender: "",
  temFilhos: "",
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
  concordaRegras: false,
};

type ExistingProfileRow = {
  gender: string | null;
  age: number | null;
  has_children: boolean | null;
  address: string | null;
  complement: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  married_in_church: boolean | null;
  marital_status: string | null;
  is_widowed: boolean | null;
  lives_chastity: boolean | null;
  is_catholic: boolean | null;
};

function boolToSimNao(value: boolean | null | undefined): string {
  if (value === true) return "Sim";
  if (value === false) return "Não";
  return "";
}

function isExistingProfileComplete(profile: ExistingProfileRow | null): boolean {
  return isCheckoutProfileComplete(profile);
}

function approximateBirthDateFromAge(age: number): string {
  const year = new Date().getFullYear() - age;
  return `01/01/${year}`;
}

function mapExistingProfileToForm(
  profile: ExistingProfileRow
): Partial<ProfileFormData> {
  return {
    birthDate:
      typeof profile.age === "number" && profile.age >= 18
        ? approximateBirthDateFromAge(profile.age)
        : "",
    gender: profile.gender ?? "",
    temFilhos: boolToSimNao(profile.has_children),
    address: profile.address ?? "",
    complement: profile.complement ?? "",
    city: profile.city ?? "",
    state: profile.state ?? "",
    zip_code: profile.zip_code ?? "",
    jaCasado: boolToSimNao(profile.married_in_church),
    nulidadeMatrimonial: profile.marital_status ?? "",
    isViuvo: boolToSimNao(profile.is_widowed),
    viveCastidade: boolToSimNao(profile.lives_chastity),
    is_catholic: boolToSimNao(profile.is_catholic),
  };
}

export function ProfileModule() {
  const navigate = useNavigate();
  const selectedPlan = useCheckoutStore((state) => state.selectedPlan);
  const setProfileCompleted = useCheckoutStore(
    (state) => state.setProfileCompleted
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [profilePrefillNote, setProfilePrefillNote] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const cepRequestIdRef = useRef(0);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: EMPTY_PROFILE,
  });

  const jaCasado = watch("jaCasado");

  const applyAddressFromCep = async (cep: string): Promise<string | true> => {
    if (!isCompleteCep(cep)) return "Informe um CEP válido.";

    const requestId = ++cepRequestIdRef.current;
    setIsLoadingCep(true);
    setCepError(null);
    try {
      const address = await fetchAddressFromCep(cep);
      if (requestId !== cepRequestIdRef.current) return true;
      setValue("zip_code", address.zipCode, { shouldValidate: true });
      setValue("city", address.city, { shouldValidate: true });
      setValue("state", address.state, { shouldValidate: true });
      setValue("address", address.street, { shouldValidate: true });
      return true;
    } catch (error) {
      if (requestId !== cepRequestIdRef.current) return true;
      setValue("city", "", { shouldValidate: true });
      setValue("state", "", { shouldValidate: true });
      setValue("address", "", { shouldValidate: true });
      const message =
        error instanceof Error ? error.message : "Não foi possível buscar o CEP.";
      setCepError(message);
      return message;
    } finally {
      if (requestId === cepRequestIdRef.current) {
        setIsLoadingCep(false);
      }
    }
  };

  useEffect(() => {
    if (!selectedPlan) {
      navigate({ to: "/planos" });
      return;
    }

    let cancelled = false;

    async function bootstrap() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate({
          to: "/entrar",
          search: { next: "/sobre-voce", email: undefined },
        });
        return;
      }

      useCheckoutStore.getState().bindCheckoutOwner(data.session.user.id);

      const resolved = await resolveCheckoutDestination({
        userId: data.session.user.id,
        hasSelectedPlan: Boolean(selectedPlan),
      });

      if (cancelled) return;

      if (resolved.hasActiveAsaasPlan) {
        setProfileCompleted(true);
        toast.success(
          resolved.message ??
            "Você já tem uma assinatura ativa. Veja os detalhes do seu plano."
        );
        navigate({
          to: "/conta/plano",
          search: { app: undefined, embed: undefined },
        });
        return;
      }

      const { data: existingProfile } = await supabase
        .from("user_profiles")
        .select(
          "gender, age, has_children, address, complement, city, state, zip_code, married_in_church, marital_status, is_widowed, lives_chastity, is_catholic"
        )
        .eq("id", data.session.user.id)
        .maybeSingle();

      if (cancelled) return;

      if (isExistingProfileComplete(existingProfile)) {
        setProfileCompleted(true);
        toast.success("Perfil já completo. Continue para o pagamento.");
        navigate({ to: "/pagamento" });
        return;
      }

      if (existingProfile) {
        setProfilePrefillNote(true);
        reset({
          ...EMPTY_PROFILE,
          ...mapExistingProfileToForm(existingProfile),
        });
      }

      setAuthReady(true);
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [selectedPlan, navigate, reset, setProfileCompleted]);

  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);
    try {
      if (isCompleteCep(data.zip_code) && (!data.city || !data.state)) {
        const filled = await applyAddressFromCep(data.zip_code);
        if (filled !== true) {
          throw new Error(
            typeof filled === "string"
              ? filled
              : "Informe um CEP válido para preencher cidade e estado."
          );
        }
        data = {
          ...data,
          ...getValues(),
        };
      }

      if (!data.city || !data.state) {
        throw new Error("Informe um CEP válido para preencher cidade e estado.");
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Faça login novamente para continuar.");
      }

      if (data.is_catholic === "Não" || data.viveCastidade === "Não") {
        const reason =
          data.is_catholic === "Não" && data.viveCastidade === "Não"
            ? "Não é católico apostólico romano e não busca viver castidade"
            : data.is_catholic === "Não"
              ? "Não é católico apostólico romano"
              : "Não busca viver a castidade";

        const { error: inactiveError } = await supabase
          .from("inactive_users")
          .insert({
            email: user.email ?? "",
            cpf: (user.user_metadata?.cpf as string | undefined) ?? null,
            first_name:
              (user.user_metadata?.firstName as string | undefined) ?? null,
            last_name:
              (user.user_metadata?.lastName as string | undefined) ?? null,
            reason,
            source: "checkout_profile",
          });

        if (inactiveError) {
          console.error("Erro ao registrar usuário inelegível:", inactiveError);
        }

        await supabase.auth.signOut();
        throw new Error(
          "Seu perfil não está elegível para a comunidade neste momento. Entre em contato com o suporte se tiver dúvidas."
        );
      }

      const age = getAgeFromBirthDate(data.birthDate);
      const addressForGeo = data.address?.trim() || data.city;

      let geocodingResult: { latitude?: number; longitude?: number } | null =
        null;
      try {
        const fullAddress = formatAddressForGeocoding({
          street: addressForGeo,
          city: data.city,
          state: data.state,
          zipCode: data.zip_code,
        });
        geocodingResult = await geocodeAddress(fullAddress);
      } catch {
        // continua sem coordenadas
      }

      const profileData: Record<string, unknown> = {
        id: user.id,
        address: data.address || data.city || null,
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
        age,
        has_children: data.temFilhos === "Sim",
      };

      if (geocodingResult?.latitude && geocodingResult?.longitude) {
        profileData.latitude = geocodingResult.latitude;
        profileData.longitude = geocodingResult.longitude;
      }

      const { data: existingProfile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      const { error: profileError } = existingProfile
        ? await supabase
            .from("user_profiles")
            .update(profileData)
            .eq("id", user.id)
        : await supabase.from("user_profiles").insert(profileData);

      if (profileError) {
        throw new Error("Erro ao criar perfil: " + profileError.message);
      }

      setProfileCompleted(true);
      toast.success("Perfil salvo! Escolha como pagar.");
      navigate({ to: "/pagamento" });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar perfil"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!authReady) {
    return (
      <CheckoutShell step="account" title="Carregando..." showSummary>
        <div className="h-2 rounded-full bg-[var(--checkout-sunken,#F4EFE7)] overflow-hidden">
          <div className="h-full w-1/2 bg-[var(--brand-accent)]/60 animate-pulse" />
        </div>
      </CheckoutShell>
    );
  }

  const formControl = control as unknown as Control<FieldValues>;
  const formErrors = errors as unknown as FieldErrors<FieldValues>;

  return (
    <CheckoutShell
      step="account"
      title="Conte um pouco sobre você"
      subtitle="Isso ajuda a encontrar pessoas compatíveis e mantém o Santo Encontro fiel ao seu propósito."
      showSummary
      bareContent
      showSupport={false}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {profilePrefillNote ? (
          <div className="rounded-2xl bg-amber-50 text-amber-900 text-sm p-4">
            Encontramos dados da sua conta. Revise e complete o que faltar
            antes de continuar.
          </div>
        ) : null}
        <section className="rounded-2xl bg-white border border-[var(--checkout-line-strong,#CFC5B6)] p-6 sm:p-8 space-y-6">
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--checkout-ink-3,#8493A6)]">
            Seus dados
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="birthDate" className={registerLabelClass}>
                Data de nascimento <span className="text-red-500">*</span>
              </label>
              <Controller
                control={control}
                name="birthDate"
                render={({ field }) => (
                  <div className="relative">
                    <input
                      id="birthDate"
                      inputMode="numeric"
                      placeholder="14/03/1994"
                      value={field.value}
                      onBlur={field.onBlur}
                      onChange={(event) =>
                        field.onChange(formatBirthDateInput(event.target.value))
                      }
                      className={`${registerInputClass} pr-11`}
                    />
                    <Calendar
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--checkout-ink-2,#55647A)] pointer-events-none"
                      aria-hidden
                    />
                  </div>
                )}
              />
              {errors.birthDate ? (
                <p className="text-red-600 text-sm ml-1">
                  {errors.birthDate.message}
                </p>
              ) : (
                <p className="text-[12px] text-[var(--checkout-ink-2,#55647A)] ml-1">
                  É necessário ter 18 anos ou mais
                </p>
              )}
            </div>

            <ChoicePills
              control={formControl}
              name="gender"
              label="Gênero"
              options={GENDER_OPTIONS}
              errors={formErrors}
              required
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="zip_code" className={registerLabelClass}>
                CEP <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Controller
                  control={control}
                  name="zip_code"
                  render={({ field }) => (
                    <input
                      id="zip_code"
                      value={field.value}
                      onBlur={(event) => {
                        field.onBlur();
                        void applyAddressFromCep(event.target.value);
                      }}
                      onChange={(event) => {
                        const formatted = formatCepInput(event.target.value);
                        field.onChange(formatted);
                        setCepError(null);
                        if (!isCompleteCep(formatted)) {
                          cepRequestIdRef.current += 1;
                          setValue("city", "", { shouldValidate: false });
                          setValue("state", "", { shouldValidate: false });
                          setValue("address", "", { shouldValidate: false });
                          return;
                        }
                        void applyAddressFromCep(formatted);
                      }}
                      placeholder="00000-000"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      disabled={isLoadingCep}
                      className={`${registerInputClass} ${
                        errors.zip_code || cepError
                          ? "ring-2 ring-red-200 focus:ring-red-500/30"
                          : ""
                      } ${isLoadingCep ? "bg-slate-100/80" : ""}`}
                    />
                  )}
                />
                {isLoadingCep ? (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : null}
              </div>
              {errors.zip_code ? (
                <p className="text-red-600 text-sm ml-1">
                  {errors.zip_code.message}
                </p>
              ) : cepError ? (
                <p className="text-red-600 text-sm ml-1">{cepError}</p>
              ) : (
                <p className="text-[12px] text-[var(--checkout-ink-2,#55647A)] ml-1">
                  Cidade e estado são preenchidos automaticamente pelo CEP
                </p>
              )}
            </div>

            <FormInput
              control={formControl}
              name="address"
              label="Endereço"
              placeholder="Rua, número"
              errors={formErrors}
              required
              disabled={isLoadingCep}
              isLoading={isLoadingCep}
            />

            <FormInput
              control={formControl}
              name="complement"
              label="Complemento"
              placeholder="Apartamento, bloco, etc."
              errors={formErrors}
              disabled={isLoadingCep}
              isLoading={isLoadingCep}
            />

            <FormInput
              control={formControl}
              name="city"
              label="Cidade"
              placeholder="Cidade"
              errors={formErrors}
              required
              disabled
              isLoading={isLoadingCep}
            />

            <FormSelect
              control={formControl}
              name="state"
              label="Estado"
              options={statesList}
              errors={formErrors}
              required
              disabled
              placeholder="Selecione o estado"
            />
          </div>

          <div className="h-px w-full bg-[var(--checkout-line,#E6DFD4)]" />

          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--checkout-ink-3,#8493A6)]">
            Sua caminhada
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <ChoicePills
              control={formControl}
              name="is_catholic"
              label="Você é católico apostólico romano?"
              options={YES_NO}
              errors={formErrors}
              required
            />
            <ChoicePills
              control={formControl}
              name="viveCastidade"
              label="Busca viver a castidade no namoro?"
              options={YES_NO}
              errors={formErrors}
              required
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <ChoicePills
              control={formControl}
              name="jaCasado"
              label="Já foi casado(a)?"
              options={YES_NO}
              errors={formErrors}
              required
            />
            <ChoicePills
              control={formControl}
              name="temFilhos"
              label="Tem filhos?"
              options={YES_NO}
              errors={formErrors}
              required
            />
          </div>

          {jaCasado === "Sim" ? (
            <div className="grid sm:grid-cols-2 gap-4">
              <ChoicePills
                control={formControl}
                name="isViuvo"
                label="É viúvo(a)?"
                options={YES_NO}
                errors={formErrors}
              />
              <FormInput
                control={formControl}
                name="nulidadeMatrimonial"
                label="Situação matrimonial / nulidade"
                placeholder="Ex.: processo de nulidade em andamento"
                errors={formErrors}
              />
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl bg-white border border-[var(--checkout-line-strong,#CFC5B6)] p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-[34px] h-[34px] rounded-[9px] bg-[var(--brand-gold,#8A6516)]/15 flex items-center justify-center shrink-0">
              <ScrollText
                className="w-[17px] h-[17px] text-[var(--brand-gold,#8A6516)]"
                aria-hidden
              />
            </span>
            <h2 className="text-[15px] font-semibold text-[var(--checkout-ink,#0F2846)]">
              Declaração de participação
            </h2>
          </div>

          <p className="text-sm text-[var(--checkout-ink-2,#55647A)] leading-relaxed">
            Ao continuar, você declara que:
          </p>

          <ul className="space-y-3">
            {CONSENT_ITEMS.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <Check
                  className="w-4 h-4 text-[var(--checkout-ink-3,#8493A6)] shrink-0 mt-0.5"
                  aria-hidden
                />
                <span className="text-sm text-[var(--checkout-ink-2,#55647A)]">
                  {item}
                </span>
              </li>
            ))}
          </ul>

          <div
            role="note"
            className="flex items-start gap-2.5 rounded-xl px-3.5 py-3.5"
            style={{
              backgroundColor: "#FFF4C8",
              border: "1.5px solid #E0A106",
              borderLeft: "4px solid #B45309",
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.65)",
            }}
          >
            <TriangleAlert
              className="shrink-0 mt-0.5"
              style={{ width: 18, height: 18, color: "#B45309" }}
              aria-hidden
            />
            <div className="min-w-0 space-y-1">
              <p
                className="text-[11px] font-bold uppercase tracking-[0.08em]"
                style={{ color: "#B45309" }}
              >
                Atenção
              </p>
              <p
                className="text-[13.5px] leading-snug font-semibold"
                style={{ color: "#7C2D12" }}
              >
                Informações falsas ou desrespeito a outros membros levam à exclusão
                do projeto, sem direito a reembolso.
              </p>
            </div>
          </div>

          <div className="h-px w-full bg-[var(--checkout-line,#E6DFD4)]" />

          <label className="flex items-start gap-3 cursor-pointer">
            <Controller
              control={control}
              name="concordaRegras"
              render={({ field: { value, onChange } }) => (
                <span
                  className={`mt-0.5 w-6 h-6 rounded-md flex items-center justify-center shrink-0 border ${
                    value
                      ? "bg-[var(--brand-accent)] border-[var(--brand-accent)]"
                      : "bg-white border-[var(--checkout-line-strong,#CFC5B6)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={(event) => onChange(event.target.checked)}
                    className="sr-only"
                  />
                  {value ? (
                    <Check className="w-[15px] h-[15px] text-white" aria-hidden />
                  ) : null}
                </span>
              )}
            />
            <span className="min-w-0 space-y-1">
              <span className="block text-sm text-[var(--checkout-ink,#0F2846)] leading-relaxed">
                Li, entendi e concordo com a declaração acima.
              </span>
              <span className="block text-[13px] text-[var(--brand-accent-hover,#9A3412)]">
                Termos de Uso · Política de Privacidade
              </span>
            </span>
          </label>
          {errors.concordaRegras ? (
            <p className="text-red-600 text-sm">{errors.concordaRegras.message}</p>
          ) : null}
        </section>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate({ to: "/conta" })}
            className="inline-flex items-center justify-center gap-2 h-[52px] px-5 rounded-xl border border-[var(--checkout-line-strong,#CFC5B6)] bg-white font-semibold text-[var(--checkout-ink,#0F2846)] hover:bg-[var(--checkout-sunken,#F4EFE7)]"
          >
            <ArrowLeft className="w-[17px] h-[17px]" aria-hidden />
            Voltar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="brand-primary-button inline-flex items-center justify-center gap-2 h-[52px] px-6 rounded-xl font-bold text-sm disabled:opacity-50 sm:min-w-[260px]"
          >
            {isSubmitting ? "Salvando..." : "Continuar para o pagamento"}
            <ArrowRight className="w-4 h-4" aria-hidden />
          </button>
        </div>
      </form>
    </CheckoutShell>
  );
}
