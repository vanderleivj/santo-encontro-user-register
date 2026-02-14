import { useState, useEffect } from "react";
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
  createMercadoPagoPixOrder,
  getPixPaymentStatusByPaymentId,
} from "../lib/api/payments";
import { supabase } from "../lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { SupportContact } from "./register/SupportContact";

export type PaymentMethod = "boleto_card" | "pix";

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
    setShowPaymentModal(false);

    if (paymentMethod === "pix") {
      setPixCreating(true);
      setMessage("");
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          setMessage("Erro ao verificar sessão. Faça login novamente.");
          setMessageType("error");
          return;
        }
        const accessToken = session?.access_token;
        if (!accessToken) {
          setMessage("Faça login novamente para gerar o PIX.");
          setMessageType("error");
          return;
        }
        const raw = plan.interval === "one_time" || !plan.interval ? "monthly" : plan.interval;
        const planType =
          raw === "month"
            ? "monthly"
            : raw === "year"
              ? "yearly"
              : raw;
        const res = await createMercadoPagoPixOrder(
          accessToken,
          planType,
          plan.price
        );
        const pix: PixData = {
          paymentIntentId: res.paymentId,
          paymentId: res.paymentId,
          qrCode: res.qrCodeBase64
            ? `data:image/png;base64,${res.qrCodeBase64}`
            : "",
          qrCodeBase64: res.qrCodeBase64,
          code: res.qrCode,
          key: "Pagamento via Mercado Pago",
          ticketUrl: res.ticketUrl,
          expiresAt: typeof res.expiresAt === "number" ? res.expiresAt : Math.floor(Date.now() / 1000) + 30 * 60,
          amount: res.amount,
          currency: (res.currency ?? "BRL").toLowerCase(),
        };
        setPixData(pix);
        setPollingPaymentId(res.paymentId);
        setMessage("PIX gerado. Escaneie ou copie o código para pagar.");
        setMessageType("success");
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Erro ao gerar PIX. Tente novamente.";
        setMessage(msg);
        setMessageType("error");
      } finally {
        setPixCreating(false);
      }
      return;
    }

    const result = await handlePaymentWithStripe(
      plan,
      undefined,
      paymentMethod
    );

    if (result.success) {
      setMessage(result.message ?? "Sucesso!");
      setMessageType("success");

      if (plan.isFree) {
        setTimeout(() => {
          navigate({ to: "/" });
        }, 2000);
      } else if (result.checkoutUrl) {
        globalThis.window.location.href = result.checkoutUrl;
      }
    } else {
      setMessage(result.error ?? "Erro no pagamento");
      setMessageType("error");
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
        const res = await getPixPaymentStatusByPaymentId(token, pollingPaymentId);
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
    const isBlackFriday = blackFridayConfig.enabled;

    const getCardStyle = () => {
      if (isBlackFriday) {
        const style: React.CSSProperties = {
          background: `linear-gradient(to bottom right, ${
            blackFridayConfig.card_background_start || "#000000"
          }, ${blackFridayConfig.card_background_mid || "#111827"}, ${
            blackFridayConfig.card_background_end || "#000000"
          })`,
          color: blackFridayConfig.card_text_color || "#FFFFFF",
          borderColor: isPopular
            ? blackFridayConfig.badge_popular_background ||
              blackFridayConfig.card_border_color ||
              "#3B82F6"
            : blackFridayConfig.card_border_color || "#DC2626",
          borderWidth: "2px",
          transform: isPopular ? "scale(1.05)" : "scale(1)",
        };

        const shadow =
          blackFridayConfig.shadow_color || "rgba(127, 29, 29, 0.5)";
        style.boxShadow = `0 25px 50px -12px ${shadow}`;

        if (isPopular && blackFridayConfig.ring_color) {
          style.boxShadow = `${style.boxShadow}, 0 0 0 4px ${blackFridayConfig.ring_color}`;
        }

        if (blackFridayConfig.glow_color) {
          style.filter = `drop-shadow(0 0 8px ${blackFridayConfig.glow_color})`;
        }

        return style;
      } else if (isPopular) {
        const borderColor =
          blackFridayConfig.badge_popular_background || "#3B82F6";
        const ringColor =
          blackFridayConfig.ring_color || "rgba(59, 130, 246, 0.3)";

        const style: React.CSSProperties = {
          borderColor: borderColor,
          borderWidth: "2px",
          borderStyle: "solid",
        };

        style.boxShadow = `0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 4px ${ringColor}`;

        return style;
      }
      return {};
    };

    const getButtonStyle = () => {
      const style: React.CSSProperties = {};

      if (blackFridayConfig.button_primary_background) {
        style.backgroundColor = blackFridayConfig.button_primary_background;
      }
      if (blackFridayConfig.button_primary_text) {
        style.color = blackFridayConfig.button_primary_text;
      }
      if (isBlackFriday && blackFridayConfig.button_primary_shadow) {
        style.boxShadow = `0 10px 15px -3px ${blackFridayConfig.button_primary_shadow}`;
      }

      return style;
    };

    const getButtonHoverStyle = () => {
      const style: React.CSSProperties = {};

      if (blackFridayConfig.button_primary_hover) {
        style.backgroundColor = blackFridayConfig.button_primary_hover;
      }

      return style;
    };

    const getButtonText = () => {
      if (isFree) return "Ativar Plano Gratuito";
      if (isPopular) return "Gerenciar";
      return "Assinar Plano";
    };

    const cardStyle = getCardStyle();

    let baseCardClasses =
      "rounded-3xl p-8 relative transition-all duration-300 flex flex-col h-full";

    if (isBlackFriday) {
      baseCardClasses += " border-2";
    } else if (isPopular) {
      baseCardClasses += " bg-register-primary text-white shadow-xl scale-105";
    } else {
      baseCardClasses +=
        " bg-white border border-slate-100 shadow-sm hover:shadow-md";
    }

    return (
      <div
        key={plan.id}
        className={baseCardClasses}
        style={cardStyle}
        onMouseEnter={(e) => {
          if (isBlackFriday && !isPopular) {
            e.currentTarget.style.borderColor =
              blackFridayConfig.card_border_hover ||
              blackFridayConfig.card_border_color ||
              "#DC2626";
          }
        }}
        onMouseLeave={(e) => {
          if (isBlackFriday && !isPopular) {
            e.currentTarget.style.borderColor =
              blackFridayConfig.card_border_color || "#DC2626";
          }
        }}
      >
        {isPopular && (
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
            <div
              className="px-4 py-2 rounded-full text-sm font-bold"
              style={{
                backgroundColor:
                  blackFridayConfig.badge_popular_background || "#3B82F6",
                color: blackFridayConfig.badge_popular_text || "#FFFFFF",
                ...(isBlackFriday && {
                  animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                  boxShadow: blackFridayConfig.badge_discount_shadow
                    ? `0 10px 15px -3px ${blackFridayConfig.badge_discount_shadow}`
                    : "0 10px 15px -3px rgba(220, 38, 38, 0.5)",
                }),
              }}
            >
              {isBlackFriday
                ? blackFridayConfig.banner_text || "BLACK FRIDAY"
                : "MAIS VENDIDO"}
            </div>
          </div>
        )}

        <div className="text-center mb-8">
          <h3
            className="text-2xl font-bold mb-3"
            style={{
              color: blackFridayConfig.card_text_color
                ? blackFridayConfig.card_text_color
                : isPopular
                ? "#FFFFFF"
                : "#0F172A",
            }}
          >
            {plan.name}
          </h3>
          <p
            className="text-lg"
            style={{
              color: blackFridayConfig.card_text_secondary
                ? blackFridayConfig.card_text_secondary
                : isPopular
                ? "#CBD5E1"
                : "#475569",
            }}
          >
            {plan.description}
          </p>
        </div>

        <div className="text-center mb-8">
          {plan.originalPrice && plan.originalPrice > plan.price ? (
            <div className="mb-2">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span
                  className="text-lg line-through"
                  style={{
                    color: blackFridayConfig.price_original_color || "#9CA3AF",
                  }}
                >
                  R$ {plan.originalPrice.toFixed(2).replace(".", ",")}
                </span>
                <span
                  className="text-sm font-bold px-3 py-1 rounded-full animate-pulse"
                  style={{
                    backgroundColor:
                      blackFridayConfig.discount_badge_color ||
                      (isPopular ? "rgba(34, 197, 94, 0.2)" : "#D1FAE5"),
                    color:
                      blackFridayConfig.badge_discount_text ||
                      (isPopular ? "#BBF7D0" : "#065F46"),
                    ...(isBlackFriday &&
                      blackFridayConfig.badge_discount_shadow && {
                        boxShadow: `0 10px 15px -3px ${blackFridayConfig.badge_discount_shadow}`,
                      }),
                  }}
                >
                  {Math.round(
                    ((plan.originalPrice - plan.price) / plan.originalPrice) *
                      100
                  )}
                  % OFF
                </span>
              </div>
              <div className="flex items-end justify-center">
                <span
                  className="text-4xl font-bold"
                  style={{
                    color: blackFridayConfig.price_currency_color
                      ? blackFridayConfig.price_currency_color
                      : isPopular
                      ? "#FFFFFF"
                      : "#0F172A",
                  }}
                >
                  R$
                </span>
                <span
                  className="text-6xl font-bold ml-2"
                  style={{
                    color: blackFridayConfig.price_discount_color
                      ? blackFridayConfig.price_discount_color
                      : isPopular
                      ? "#FFFFFF"
                      : "#0F172A",
                  }}
                >
                  {plan.price.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-end justify-center mb-2">
              <span
                className="text-4xl font-bold"
                style={{
                  color: blackFridayConfig.price_currency_color
                    ? blackFridayConfig.price_currency_color
                    : isPopular
                    ? "#FFFFFF"
                    : "#0F172A",
                }}
              >
                R$
              </span>
              <span
                className="text-6xl font-bold ml-2"
                style={{
                  color: blackFridayConfig.price_discount_color
                    ? blackFridayConfig.price_discount_color
                    : isPopular
                    ? "#FFFFFF"
                    : "#0F172A",
                }}
              >
                {plan.price.toFixed(2).replace(".", ",")}
              </span>
            </div>
          )}
          <p
            className="text-lg"
            style={{
              color: blackFridayConfig.card_text_secondary
                ? blackFridayConfig.card_text_secondary
                : isPopular
                ? "#CBD5E1"
                : "#475569",
            }}
          >
            por mês
          </p>
        </div>

        <div className="space-y-4 mb-8 flex-grow">
          {plan.features.map((feature: string) => (
            <div key={feature} className="flex items-center gap-3">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor:
                    blackFridayConfig.checkmark_color || "#22C55E",
                }}
              >
                <Check size={12} className="text-white" />
              </div>
              <span
                className="text-base"
                style={{
                  color: blackFridayConfig.card_text_secondary
                    ? blackFridayConfig.card_text_secondary
                    : isPopular
                    ? "#E2E8F0"
                    : "#334155",
                }}
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
              isBlackFriday ? "rounded-full transform hover:scale-105 disabled:transform-none" : "rounded-2xl bg-register-primary hover:bg-slate-800 text-white shadow-lg active:scale-[0.98]"
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
              7 dias grátis
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
      <div className="min-h-screen bg-register-bg text-slate-900 font-sans">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-12 h-12 border-4 border-register-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-600 text-lg">Carregando planos...</p>
            {plansError && (
              <button
                onClick={refetch}
                className="mt-4 px-6 py-3 bg-register-primary text-white rounded-2xl hover:bg-slate-800 transition-colors"
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
    <div
      className={`min-h-screen font-sans ${
        blackFridayConfig.enabled ? "" : "bg-register-bg text-slate-900"
      }`}
      style={
        blackFridayConfig.enabled
          ? {
              background: `linear-gradient(to bottom right, ${
                blackFridayConfig.layout_background_start || "#000000"
              }, ${blackFridayConfig.layout_background_mid || "#111827"}, ${
                blackFridayConfig.layout_background_end || "#000000"
              })`,
            }
          : undefined
      }
    >
      <div className="max-w-6xl mx-auto px-6 pb-12 pt-4">
        {/* Banner Black Friday */}
        {blackFridayConfig.enabled && (
          <div className="relative mb-8 overflow-hidden">
            <div
              className="py-4 px-6 rounded-2xl shadow-2xl border-2"
              style={{
                background: `linear-gradient(to right, ${
                  blackFridayConfig.banner_background_start || "#000000"
                }, ${blackFridayConfig.banner_background_mid || "#7F1D1D"}, ${
                  blackFridayConfig.banner_background_end || "#000000"
                })`,
                borderColor: blackFridayConfig.banner_border_color || "#DC2626",
                color: blackFridayConfig.banner_text_color || "#FFFFFF",
              }}
            >
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-2xl animate-pulse">🔥</span>
                  <h2 className="text-2xl lg:text-3xl font-black tracking-wider">
                    {blackFridayConfig.banner_text || "BLACK FRIDAY"}
                  </h2>
                  <span className="text-2xl animate-pulse">🔥</span>
                </div>
                <div
                  className="hidden md:block w-px h-8"
                  style={{
                    backgroundColor:
                      blackFridayConfig.banner_border_color || "#DC2626",
                  }}
                />
                <p
                  className="text-lg font-bold animate-pulse"
                  style={{
                    color:
                      blackFridayConfig.banner_accent_text_color || "#FDE047",
                  }}
                >
                  DESCONTOS ESPECIAIS!
                </p>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer pointer-events-none" />
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-sm mb-6 overflow-hidden">
            <img src={logo} alt="" className="w-14 h-14 object-contain" />
          </div>
          <h1
            className={`font-register text-3xl mb-2 ${
              blackFridayConfig.enabled ? "" : "text-register-primary"
            }`}
            style={
              blackFridayConfig.enabled
                ? { color: blackFridayConfig.layout_text_primary || "#FFFFFF" }
                : undefined
            }
          >
            Santo Encontro
          </h1>
          <p
            className={
              blackFridayConfig.enabled
                ? "text-sm italic"
                : "text-slate-500 text-sm italic"
            }
            style={
              blackFridayConfig.enabled
                ? { color: blackFridayConfig.layout_text_secondary || "#D1D5DB" }
                : undefined
            }
          >
            Juntos na fé, unidos pelo amor
          </p>
          {!blackFridayConfig.enabled && (
            <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
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
          onOpenChange={(open) => !open && setShowPaymentModal(false)}
        >
          {selectedPlan && (
            <DialogContent className="sm:max-w-md rounded-3xl border-slate-100 shadow-sm">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold text-slate-900">
                  Escolha o método de pagamento
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-sm">
                  Plano {selectedPlan.name} · R$ {selectedPlan.price.toFixed(2).replace(".", ",")}
                  {selectedPlan.interval === "month" || selectedPlan.interval === "monthly" ? "/mês" : "/ano"}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-5 space-y-2">
                <button
                  type="button"
                  onClick={() => handlePayment(selectedPlan, "boleto_card")}
                  disabled={paymentLoading}
                  className="w-full p-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-left flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <CreditCard className="text-blue-600 w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-slate-900 block">Boleto ou Cartão</span>
                    <span className="text-xs text-slate-500">Boleto bancário ou cartão de crédito</span>
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
                      {pixCreating ? "Gerando..." : "Aprovação instantânea"}
                    </span>
                  </div>
                </button>
              </div>

              {paymentLoading && (
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
                    Abrir página de pagamento no Mercado Pago
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
                      className="px-4 py-3.5 bg-slate-800 cursor-pointer text-white rounded-2xl hover:bg-transparent hover:text-slate-800 hover:border-2 hover:border-slate-800 transition-colors flex items-center gap-2 font-semibold text-sm shrink-0"
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
