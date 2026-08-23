import { useState, useEffect, type CSSProperties } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Check,
  CreditCard,
  Receipt,
  Copy,
  CheckCircle2,
} from "lucide-react";
import logo from "../assets/logo.png";
import { usePlans, type PlanConfig } from "../hooks/usePlans";
import { useBlackFriday } from "../hooks/useBlackFriday";
import { usePayment } from "../hooks/usePayment";
import {
  createAsaasSubscription,
  getAsaasPaymentStatus,
} from "../lib/api/asaas";
import { supabase } from "../lib/supabase";
import { getTrialDays } from "../lib/trial-days";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { SupportContact } from "./register/SupportContact";

export type PaymentMethod = "pix" | "credit_card" | "boleto";

interface PixData {
  paymentIntentId: string;
  paymentId: string;
  qrCode: string;
  qrCodeBase64?: string;
  code: string;
  key: string;
  ticketUrl?: string;
  expiresAt: number;
  amount: number;
  currency: string;
}

function mapPlanIntervalToPlanType(interval: string | null | undefined): string {
  const raw = interval === "one_time" || !interval ? "monthly" : interval;
  if (raw === "month") return "monthly";
  if (raw === "year") return "yearly";
  return raw;
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export default function PlansScreen() {
  const navigate = useNavigate();
  const {
    plans,
    loading: plansLoading,
    error: plansError,
    refetch,
  } = usePlans();
  const { config: blackFridayConfig } = useBlackFriday();

  const { handlePaymentWithStripe, loading: paymentLoading } = usePayment();
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("error");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanConfig | null>(null);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [pixCreating, setPixCreating] = useState(false);
  const [pollingPaymentId, setPollingPaymentId] = useState<string | null>(null);
  const [trialDays, setTrialDays] = useState(7);
  const [cardHolderName, setCardHolderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCcv, setCardCcv] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [showCardFields, setShowCardFields] = useState(false);

  useEffect(() => {
    getTrialDays().then(setTrialDays);
  }, []);

  // Sessão vinda do app (WebView): tokens no hash para não exigir login de novo na web
  useEffect(() => {
    const hash = globalThis.location?.hash?.slice(1);
    if (!hash) return;

    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) return;

    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(() => {
        globalThis.history?.replaceState(
          null,
          "",
          globalThis.location?.pathname + globalThis.location?.search || "/plans"
        );
      })
      .catch((err) => console.warn("Erro ao restaurar sessão no /plans:", err));
  }, []);

  const handlePaymentClick = (plan: PlanConfig) => {
    if (plan.isFree) {
      handlePayment(plan);
    } else {
      setSelectedPlan(plan);
      setShowPaymentModal(true);
    }
  };

  const handlePayment = async (
    plan: PlanConfig,
    paymentMethod?: PaymentMethod
  ) => {
    if (plan.isFree) {
      const result = await handlePaymentWithStripe(plan);
      if (result.success) {
        setMessage(result.message ?? "Sucesso!");
        setMessageType("success");
        const days = await getTrialDays();
        setTimeout(() => {
          navigate({
            to: "/success",
            search: { trial: "1", days: String(days) },
          });
        }, 2000);
      } else {
        setMessage(result.error ?? "Erro no pagamento");
        setMessageType("error");
      }
      return;
    }

    if (!paymentMethod) return;

    if (paymentMethod === "credit_card" && !showCardFields) {
      setShowCardFields(true);
      return;
    }

    if (paymentMethod === "credit_card") {
      const [expiryMonth, expiryYearRaw] = cardExpiry.split("/");
      const expiryYear = expiryYearRaw?.length === 2
        ? `20${expiryYearRaw}`
        : expiryYearRaw;
      if (
        !cardHolderName.trim() ||
        onlyDigits(cardNumber).length < 13 ||
        !expiryMonth ||
        !expiryYear ||
        onlyDigits(cardCcv).length < 3 ||
        onlyDigits(postalCode).length < 8 ||
        !addressNumber.trim() ||
        onlyDigits(phone).length < 10
      ) {
        setMessage("Preencha todos os dados do cartão e endereço.");
        setMessageType("error");
        return;
      }
    }

    setShowPaymentModal(false);
    setPixCreating(true);
    setMessage("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        setMessage("Faça login novamente para continuar o pagamento.");
        setMessageType("error");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: userProfile } = await supabase
        .from("users")
        .select('email, "firstName", "lastName", cpf')
        .eq("id", user?.id ?? "")
        .maybeSingle();

      const cpfDigits = onlyDigits(userProfile?.cpf ?? "");
      if (cpfDigits.length !== 11) {
        setMessage(
          "CPF não encontrado no cadastro. Atualize seu perfil ou refaça o registro."
        );
        setMessageType("error");
        return;
      }

      const planType = mapPlanIntervalToPlanType(plan.interval);
      const billingType =
        paymentMethod === "pix"
          ? "PIX"
          : paymentMethod === "boleto"
            ? "BOLETO"
            : "CREDIT_CARD";

      const [expiryMonth, expiryYearRaw] = cardExpiry.split("/");
      const expiryYear =
        expiryYearRaw?.length === 2 ? `20${expiryYearRaw}` : expiryYearRaw;
      const fullName =
        `${userProfile?.firstName ?? ""} ${userProfile?.lastName ?? ""}`.trim() ||
        cardHolderName.trim() ||
        userProfile?.email ||
        "Cliente";

      const res = await createAsaasSubscription(session.access_token, {
        planType,
        billingType,
        cpf: cpfDigits,
        ...(billingType === "CREDIT_CARD"
          ? {
              creditCard: {
                holderName: cardHolderName.trim(),
                number: onlyDigits(cardNumber),
                expiryMonth: onlyDigits(expiryMonth || ""),
                expiryYear: onlyDigits(expiryYear || ""),
                ccv: onlyDigits(cardCcv),
              },
              creditCardHolderInfo: {
                name: cardHolderName.trim() || fullName,
                email: userProfile?.email || user?.email || "",
                cpfCnpj: cpfDigits,
                postalCode: onlyDigits(postalCode),
                addressNumber: addressNumber.trim(),
                phone: onlyDigits(phone),
                mobilePhone: onlyDigits(phone),
              },
            }
          : {}),
      });

      if (billingType === "PIX") {
        const pix: PixData = {
          paymentIntentId: res.paymentId || res.subscriptionId,
          paymentId: res.paymentId || "",
          qrCode: res.qrCodeBase64
            ? `data:image/png;base64,${res.qrCodeBase64}`
            : "",
          qrCodeBase64: res.qrCodeBase64 || undefined,
          code: res.qrCode || "",
          key: "Pagamento via Asaas",
          ticketUrl: res.invoiceUrl || undefined,
          expiresAt:
            typeof res.expiresAt === "number"
              ? res.expiresAt
              : Math.floor(Date.now() / 1000) + 30 * 60,
          amount: res.amount,
          currency: (res.currency ?? "BRL").toLowerCase(),
        };
        setPixData(pix);
        if (res.paymentId) setPollingPaymentId(res.paymentId);
        setMessage("PIX gerado. Escaneie ou copie o código para pagar.");
        setMessageType("success");
        return;
      }

      if (billingType === "BOLETO" && (res.bankSlipUrl || res.invoiceUrl)) {
        setMessage("Boleto gerado. Conclua o pagamento para ativar o plano.");
        setMessageType("success");
        globalThis.window.open(res.bankSlipUrl || res.invoiceUrl || "", "_blank");
        if (res.paymentId) setPollingPaymentId(res.paymentId);
        return;
      }

      if (billingType === "CREDIT_CARD" && res.status === "active") {
        setMessage("Pagamento aprovado!");
        setMessageType("success");
        navigate({
          to: "/success",
          search: {
            paymentMethod: "card",
            planLabel: plan.name,
            amount: res.amount,
          },
        });
        return;
      }

      setMessage("Assinatura criada. Aguarde a confirmação do pagamento.");
      setMessageType("success");
      if (res.paymentId) setPollingPaymentId(res.paymentId);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Erro ao processar pagamento.";
      setMessage(msg);
      setMessageType("error");
    } finally {
      setPixCreating(false);
      setShowCardFields(false);
    }
  };

  const handleCopyCode = async () => {
    if (pixData?.code) {
      try {
        await navigator.clipboard.writeText(pixData.code);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } catch (err) {
        console.error("Erro ao copiar:", err);
      }
    }
  };

  useEffect(() => {
    if (!pixData?.expiresAt) return;

    const updateTimeRemaining = () => {
      const now = Math.floor(Date.now() / 1000);
      const expires = pixData.expiresAt;
      const remaining = expires - now;

      if (remaining <= 0) {
        setTimeRemaining("Expirado");
        return;
      }

      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [pixData?.expiresAt]);

  useEffect(() => {
    if (!pollingPaymentId) return;

    const poll = async () => {
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        if (!token) return;
        const res = await getAsaasPaymentStatus(token, pollingPaymentId);
        if (res.status === "approved") {
          const planLabel = selectedPlan?.name;
          const amount = pixData?.amount;
          setPollingPaymentId(null);
          setPixData(null);
          navigate({
            to: "/success",
            search: { paymentMethod: "pix", planLabel, amount },
          });
        }
      } catch {
        // ignore
      }
    };

    const interval = setInterval(poll, 3000);
    poll();

    return () => clearInterval(interval);
  }, [pollingPaymentId, navigate]);

  const renderPlanCard = (plan: PlanConfig) => {
    const isPopular = plan.isPopular;
    const isFree = plan.isFree;
    const displayPriceAsFree = Boolean(isFree || plan.price <= 0);
    const isCampaign = blackFridayConfig.enabled;

    const getCardStyle = (): CSSProperties => {
      const style: CSSProperties = {
        background:
          "linear-gradient(to bottom right, var(--card-bg-start), var(--card-bg-mid), var(--card-bg-end))",
        color: "var(--card-text)",
        borderColor: isPopular
          ? "var(--badge-popular-bg)"
          : "var(--card-border)",
        borderWidth: "2px",
        borderStyle: "solid",
        transform: isPopular ? "scale(1.05)" : "scale(1)",
        boxShadow: isPopular
          ? "0 25px 50px -12px var(--layout-shadow), 0 0 0 4px var(--ring-color)"
          : "0 25px 50px -12px var(--layout-shadow)",
      };

      if (isCampaign) {
        style.filter = "drop-shadow(0 0 8px var(--glow-color))";
      }

      return style;
    };

    const getButtonStyle = (): CSSProperties => {
      const style: CSSProperties = {
        backgroundColor: "var(--button-primary-bg)",
        color: "var(--button-primary-text)",
      };
      if (isCampaign) {
        style.boxShadow = "0 10px 15px -3px var(--button-primary-shadow)";
      }
      return style;
    };

    const getButtonHoverStyle = (): CSSProperties => ({
      backgroundColor: "var(--button-primary-hover)",
    });

    const getButtonText = () => {
      if (isFree) return "Ativar Plano Gratuito";
      if (isPopular) return "Gerenciar";
      return "Assinar Plano";
    };

    const cardStyle = getCardStyle();
    const baseCardClasses =
      "rounded-3xl p-8 relative transition-all duration-300 flex flex-col h-full border-2";

    return (
      <div
        key={plan.id}
        className={baseCardClasses}
        style={cardStyle}
        onMouseEnter={(e) => {
          if (!isPopular) {
            e.currentTarget.style.borderColor = "var(--card-border-hover)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isPopular) {
            e.currentTarget.style.borderColor = "var(--card-border)";
          }
        }}
      >
        {isPopular && (
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
            <div
              className="px-4 py-2 rounded-full text-sm font-bold"
              style={{
                backgroundColor: "var(--badge-popular-bg)",
                color: "var(--badge-popular-text)",
                ...(isCampaign && {
                  animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                  boxShadow: "0 10px 15px -3px var(--badge-discount-shadow)",
                }),
              }}
            >
              {isCampaign
                ? blackFridayConfig.banner_text || "DESTAQUE"
                : "MAIS VENDIDO"}
            </div>
          </div>
        )}

        <div className="text-center mb-8">
          <h3
            className="text-2xl font-bold mb-3"
            style={{ color: "var(--card-text)" }}
          >
            {plan.name}
          </h3>
          <p
            className="text-lg"
            style={{ color: "var(--card-text-secondary)" }}
          >
            {plan.description}
          </p>
        </div>

        <div className="text-center mb-8">
          {displayPriceAsFree ? (
            <div className="flex items-end justify-center mb-2">
              <span
                className="text-5xl sm:text-6xl font-bold tracking-tight"
                style={{ color: "var(--price-discount)" }}
              >
                Gratuito
              </span>
            </div>
          ) : (
            <div className="flex items-end justify-center mb-2">
              <span
                className="text-4xl font-bold"
                style={{ color: "var(--price-currency)" }}
              >
                R$
              </span>
              <span
                className="text-6xl font-bold ml-2"
                style={{ color: "var(--price-discount)" }}
              >
                {plan.price.toFixed(2).replace(".", ",")}
              </span>
            </div>
          )}
          <p
            className="text-lg"
            style={{ color: "var(--card-text-secondary)" }}
          >
            {plan.intervalLabel ?? "por mês"}
          </p>
        </div>

        <div className="space-y-4 mb-8 flex-grow">
          {plan.features.map((feature: string) => (
            <div key={feature} className="flex items-center gap-3">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: "var(--checkmark-color)",
                }}
              >
                <Check size={12} className="text-white" />
              </div>
              <span
                className="text-base"
                style={{ color: "var(--card-text-secondary)" }}
              >
                {feature}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-auto">
          <button
            onClick={() => handlePaymentClick(plan)}
            disabled={paymentLoading || pixCreating}
            className={`w-full py-4 px-6 text-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
              "rounded-2xl brand-primary-button shadow-lg active:scale-[0.98]"
            }`}
            style={getButtonStyle()}
            onMouseEnter={(e) => {
              if (!paymentLoading && !pixCreating) {
                const hoverStyle = getButtonHoverStyle();
                if (hoverStyle.backgroundColor) {
                  e.currentTarget.style.backgroundColor =
                    hoverStyle.backgroundColor;
                }
              }
            }}
            onMouseLeave={(e) => {
              if (!paymentLoading && !pixCreating) {
                const buttonStyle = getButtonStyle();
                if (buttonStyle.backgroundColor) {
                  e.currentTarget.style.backgroundColor =
                    buttonStyle.backgroundColor;
                }
              }
            }}
          >
            {paymentLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                Processando...
              </div>
            ) : (
              getButtonText()
            )}
          </button>

          {isFree && (
            <p className="text-center text-sm text-slate-500 mt-3">
              {trialDays === 1
                ? "1 dia grátis"
                : `${trialDays} dias grátis`}
            </p>
          )}
          {!isFree &&
            plan.interval != null &&
            plan.interval !== "one_time" && (
              <p
                className="text-center text-sm mt-3"
                style={{ color: "var(--card-text-secondary)" }}
              >
                Os planos são renovados automaticamente.
              </p>
            )}
          {isPopular && (
            <p className="text-center text-sm text-slate-300 mt-3">
              2 dias até expirar
            </p>
          )}
        </div>
      </div>
    );
  };

  if (plansLoading) {
    return (
      <div className="min-h-screen themed-page-bg font-sans">
        <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-12 h-12 border-4 border-[var(--brand-accent)] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="themed-subtitle text-lg">Carregando planos...</p>
            {plansError && (
              <button
                onClick={refetch}
                className="mt-4 px-6 py-3 brand-primary-button rounded-2xl transition-colors"
              >
                Tentar novamente
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans themed-page-bg">
      <div className="relative z-10 max-w-6xl mx-auto px-6 pb-12 pt-4">
        {blackFridayConfig.enabled && (
          <aside
            className="relative mb-8 overflow-hidden rounded-2xl border-2 px-4 py-3.5 sm:px-5 sm:py-4"
            style={{
              background:
                "linear-gradient(to right, var(--banner-bg-start), var(--banner-bg-mid), var(--banner-bg-end))",
              borderColor: "var(--banner-border)",
              color: "var(--banner-text)",
              boxShadow:
                "0 10px 28px -14px var(--layout-shadow, rgba(15, 40, 70, 0.28))",
            }}
            aria-label="Campanha ativa"
          >
            <div className="flex flex-col items-center gap-2.5 text-center sm:flex-row sm:items-center sm:justify-center sm:gap-4">
              <div className="min-w-0 space-y-1">
                <p className="text-[15px] font-semibold leading-snug tracking-wide sm:text-base">
                  {blackFridayConfig.banner_text || "Campanha especial"}
                </p>
                {blackFridayConfig.banner_subtitle ? (
                  <p
                    className="text-sm font-medium leading-relaxed sm:text-[15px]"
                    style={{ color: "var(--banner-accent-text)" }}
                  >
                    {blackFridayConfig.banner_subtitle}
                  </p>
                ) : null}
              </div>
            </div>
          </aside>
        )}

        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-sm mb-6 overflow-hidden">
            <img src={logo} alt="" className="w-14 h-14 object-contain" />
          </div>
          <h1
            className="font-register text-3xl mb-2 themed-title"
          >
            {blackFridayConfig.brand_title || "Santo Encontro"}
          </h1>
          <p className="text-sm italic themed-subtitle">
            {blackFridayConfig.brand_subtitle ||
              "Juntos na fé, unidos pelo amor"}
          </p>
          {!blackFridayConfig.enabled && (
            <p className="themed-muted text-sm mt-2 max-w-md mx-auto">
              Escolha o plano ideal para sua jornada.
            </p>
          )}
        </div>

        {message && (
          <div
            className={`p-6 rounded-2xl mb-8 ${
              messageType === "error"
                ? "bg-red-50 border border-red-200/50 text-red-800"
                : "bg-emerald-50 border border-emerald-200/50 text-emerald-800"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  messageType === "error" ? "bg-red-100" : "bg-emerald-100"
                }`}
              >
                <span className="text-sm" aria-hidden>
                  {messageType === "error" ? "⚠️" : "✅"}
                </span>
              </div>
              <span className="font-medium">{message}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => renderPlanCard(plan))}
        </div>

        <div className="flex justify-center mt-12 mb-2">
          <div className="w-32 h-1.5 bg-slate-200 rounded-full" />
        </div>

        <Dialog
          open={showPaymentModal}
          onOpenChange={(open) => {
            if (!open) {
              setShowPaymentModal(false);
              setShowCardFields(false);
            }
          }}
        >
          {selectedPlan && (
            <DialogContent className="sm:max-w-md rounded-3xl border-slate-100 shadow-sm">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold text-slate-900">
                  Escolha o método de pagamento
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-sm">
                  Plano {selectedPlan.name}
                  {selectedPlan.isFree || selectedPlan.price <= 0
                    ? " · Gratuito"
                    : ` · R$ ${selectedPlan.price.toFixed(2).replace(".", ",")}${
                        selectedPlan.interval === "month" ||
                        selectedPlan.interval === "monthly"
                          ? "/mês"
                          : "/ano"
                      }`}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-5 space-y-3">
                {showCardFields && (
                  <div className="space-y-2 rounded-2xl border border-slate-100 p-3">
                    <input
                      type="text"
                      value={cardHolderName}
                      onChange={(event) => setCardHolderName(event.target.value)}
                      placeholder="Nome no cartão"
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cardNumber}
                      onChange={(event) => setCardNumber(event.target.value)}
                      placeholder="Número do cartão"
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(event) => setCardExpiry(event.target.value)}
                        placeholder="MM/AA"
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm"
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={cardCcv}
                        onChange={(event) => setCardCcv(event.target.value)}
                        placeholder="CVV"
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm"
                      />
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={postalCode}
                      onChange={(event) => setPostalCode(event.target.value)}
                      placeholder="CEP"
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm"
                    />
                    <input
                      type="text"
                      value={addressNumber}
                      onChange={(event) => setAddressNumber(event.target.value)}
                      placeholder="Número do endereço"
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm"
                    />
                    <input
                      type="text"
                      inputMode="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="Telefone"
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handlePayment(selectedPlan, "credit_card")}
                  disabled={paymentLoading || pixCreating}
                  className="w-full p-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-left flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <CreditCard className="text-blue-600 w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-slate-900 block">Cartão de crédito</span>
                    <span className="text-xs text-slate-500">
                      {showCardFields ? "Confirmar pagamento no cartão" : "Assinatura recorrente Asaas"}
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handlePayment(selectedPlan, "boleto")}
                  disabled={paymentLoading || pixCreating}
                  className="w-full p-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-left flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                    <Receipt className="text-amber-600 w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-slate-900 block">Boleto</span>
                    <span className="text-xs text-slate-500">Assinatura com boleto bancário</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handlePayment(selectedPlan, "pix")}
                  disabled={paymentLoading || pixCreating}
                  className="w-full p-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-left flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                    <Receipt className="text-emerald-600 w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-slate-900 block">PIX</span>
                    <span className="text-xs text-slate-500">
                      {pixCreating ? "Gerando..." : "Assinatura com QR Code Asaas"}
                    </span>
                  </div>
                </button>
              </div>

              {(paymentLoading || pixCreating) && (
                <p className="text-center text-sm text-slate-500 mt-4">Processando...</p>
              )}
            </DialogContent>
          )}
        </Dialog>

        <Dialog
          open={!!pixData}
          onOpenChange={(open) => {
            if (!open) {
              setPixData(null);
              setPollingPaymentId(null);
            }
          }}
        >
          {pixData && (
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border-slate-100 shadow-sm">
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center">
                    <Receipt className="w-5 h-5" aria-hidden />
                  </div>
                  <DialogTitle className="text-xl font-semibold text-slate-900">
                    Pague com PIX
                  </DialogTitle>
                </div>
                <DialogDescription className="text-slate-500 text-sm leading-relaxed">
                  Escaneie o QR Code ou copie o código para pagar. O plano será ativado automaticamente após a confirmação.
                </DialogDescription>
              </DialogHeader>

              <div className="mb-6">
                <div className="bg-slate-50 rounded-2xl p-6 flex items-center justify-center mb-4">
                <img
                  src={
                    pixData.qrCodeBase64
                      ? `data:image/png;base64,${pixData.qrCodeBase64}`
                      : pixData.qrCode
                  }
                  alt="QR Code PIX"
                  className="w-64 h-64 object-contain"
                />
              </div>
              {pixData.ticketUrl && (
                <div className="mb-4">
                  <a
                    href={pixData.ticketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-green-600 hover:underline"
                  >
                    Abrir página de pagamento Asaas
                  </a>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="pix-code"
                    className="text-xs font-medium text-slate-500 ml-1 block mb-1.5"
                  >
                    Código PIX (Copia e Cola)
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="pix-code"
                      type="text"
                      readOnly
                      value={pixData.code}
                      className="flex-1 px-4 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-mono text-slate-900 focus:ring-2 focus:ring-register-primary/20"
                    />
                    <button
                      onClick={handleCopyCode}
                      type="button"
                      className="px-4 py-3.5 brand-primary-button cursor-pointer rounded-2xl transition-colors flex items-center gap-2 font-semibold text-sm shrink-0"
                    >
                      {copiedCode ? (
                        <>
                          <CheckCircle2 size={18} />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy size={18} />
                          Copiar
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="pix-key"
                    className="text-xs font-medium text-slate-500 ml-1 block mb-1.5"
                  >
                    Chave PIX
                  </label>
                  <div
                    id="pix-key"
                    className="px-4 py-3.5 bg-slate-50 rounded-2xl text-sm font-semibold text-slate-900"
                  >
                    {pixData.key}
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-700">
                      Valor a pagar
                    </span>
                    <span className="text-lg font-bold text-slate-900">
                      R$ {pixData.amount.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                  {timeRemaining && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Expira em</span>
                      <span className="text-sm font-semibold text-slate-900">
                        {timeRemaining}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="my-6">
              <SupportContact />
            </div>

            <button
              type="button"
              onClick={() => setPixData(null)}
              className="w-full py-3.5 px-6 bg-slate-200 text-slate-800 rounded-2xl hover:bg-slate-300 transition-colors font-semibold text-sm"
            >
              Fechar
            </button>
            </DialogContent>
          )}
        </Dialog>
      </div>
    </div>
  );
}
