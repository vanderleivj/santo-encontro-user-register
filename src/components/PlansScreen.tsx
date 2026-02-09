import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Check,
  CreditCard,
  Receipt,
  Copy,
  CheckCircle2,
  Upload,
  FileImage,
} from "lucide-react";
import logo from "../assets/logo.png";
import { usePlans, type PlanConfig } from "../hooks/usePlans";
import { useBlackFriday } from "../hooks/useBlackFriday";
import { usePayment } from "../hooks/usePayment";
import { uploadPixProof } from "../lib/api/payments";
import { supabase } from "../lib/supabase";
import ScreenLayout from "./ScreenLayout";
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
  qrCode: string;
  code: string;
  key: string;
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
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handlePaymentClick = (plan: PlanConfig) => {
    if (plan.isFree) {
      handlePayment(plan);
    } else {
      setSelectedPlan(plan);
      setShowPaymentModal(true);
    }
  };

  const generateMockPixData = (plan: PlanConfig): PixData => {
    const expiresAt = Math.floor(Date.now() / 1000) + 30 * 60;

    const pixCode = `00020101021126810014BR.GOV.BCB.PIX2559pix-qr.mercadopago.com/instore/ol/v2/3Z8b2YH8xycGTxKS4KCwTb5204000053039865802BR592557.134.332 RAFAEL COSTA D6009SAO PAULO62080504mpis63047541`;

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(
      pixCode
    )}`;

    return {
      paymentIntentId: `pi_mock_${Date.now()}`,
      qrCode: qrCodeUrl,
      code: pixCode,
      key: "santoencontro.santidade@gmail.com",
      expiresAt: expiresAt,
      amount: plan.price,
      currency: "brl",
    };
  };

  const handlePayment = async (
    plan: PlanConfig,
    paymentMethod?: PaymentMethod
  ) => {
    setShowPaymentModal(false);

    if (paymentMethod === "pix") {
      const mockPixData = generateMockPixData(plan);
      setPixData(mockPixData);
      setMessage("Dados do PIX gerados com sucesso!");
      setMessageType("success");
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
    const fetchUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          setUserEmail(user.email || null);

          const { data: userProfile } = await supabase
            .from("users")
            .select("email")
            .eq("id", user.id)
            .single();

          if (userProfile?.email) {
            setUserEmail(userProfile.email);
          }
        }
      } catch (error) {
        console.error("Erro ao buscar usuário:", error);
      }
    };

    fetchUser();
  }, []);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];

    if (!allowedTypes.includes(file.type)) {
      setUploadError(
        "Tipo de arquivo não permitido. Use JPG, PNG, WEBP ou PDF."
      );
      setSelectedFile(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Arquivo muito grande. Tamanho máximo: 10MB");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setUploadError(null);
  };

  const handleUpload = async () => {
    if (!selectedFile || !pixData || !selectedPlan) {
      setUploadError("Selecione um arquivo");
      return;
    }

    if (!userId && !userEmail) {
      setUploadError("Usuário não identificado. Faça login novamente.");
      return;
    }

    try {
      setUploading(true);
      setUploadError(null);

      await uploadPixProof(
        userId,
        userEmail,
        selectedPlan.id,
        pixData.amount,
        selectedFile
      );

      setUploaded(true);
      setMessage("Comprovante enviado com sucesso! Aguardando aprovação.");
      setMessageType("success");

      setTimeout(() => {
        navigate({ to: "/success", search: { paymentMethod: "pix" } });
      }, 3000);
    } catch (error: any) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Erro ao enviar comprovante. Tente novamente.";
      setUploadError(errorMessage);
      setMessage(errorMessage);
      setMessageType("error");
    } finally {
      setUploading(false);
    }
  };

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
      "rounded-2xl p-8 relative transition-all duration-300 flex flex-col h-full";

    if (isBlackFriday) {
      baseCardClasses += " border-2";
    } else if (isPopular) {
      baseCardClasses += " bg-slate-900 text-white shadow-2xl scale-105";
    } else {
      baseCardClasses +=
        " bg-white border border-slate-200 shadow-lg hover:shadow-xl";
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
            disabled={paymentLoading}
            className="w-full py-4 px-6 rounded-full text-lg font-semibold transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            style={getButtonStyle()}
            onMouseEnter={(e) => {
              if (!paymentLoading) {
                const hoverStyle = getButtonHoverStyle();
                if (hoverStyle.backgroundColor) {
                  e.currentTarget.style.backgroundColor =
                    hoverStyle.backgroundColor;
                }
              }
            }}
            onMouseLeave={(e) => {
              if (!paymentLoading) {
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
      <ScreenLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-600 text-lg">Carregando planos...</p>
          {plansError && (
            <button
              onClick={refetch}
              className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
            >
              Tentar novamente
            </button>
          )}
        </div>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout blackFridayMode={blackFridayConfig.enabled}>
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
              ></div>
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
          {/* Efeito de brilho animado */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer pointer-events-none"></div>
        </div>
      )}

      <div className="text-center mb-12">
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-2xl blur-xl opacity-60"
              style={
                blackFridayConfig.enabled
                  ? {
                      background: `linear-gradient(to right, ${
                        blackFridayConfig.layout_background_start || "#000000"
                      }, ${
                        blackFridayConfig.layout_background_mid || "#111827"
                      }, ${
                        blackFridayConfig.layout_background_end || "#000000"
                      })`,
                    }
                  : {
                      background:
                        "linear-gradient(to right, rgb(241 245 249), rgb(243 244 246))",
                    }
              }
            ></div>
            <div
              className="relative backdrop-blur-sm rounded-2xl p-6 shadow-xl border"
              style={
                blackFridayConfig.enabled
                  ? {
                      backgroundColor:
                        blackFridayConfig.layout_card_background ||
                        "rgba(0, 0, 0, 0.9)",
                      borderColor:
                        blackFridayConfig.layout_card_border ||
                        "rgba(220, 38, 38, 0.5)",
                    }
                  : {
                      backgroundColor: "rgba(255, 255, 255, 0.8)",
                      borderColor: "rgba(255, 255, 255, 0.5)",
                    }
              }
            >
              <img
                src={logo}
                alt="Santo Encontro"
                className="h-20 w-20 object-contain"
              />
            </div>
          </div>
        </div>

        <h1
          className="text-4xl lg:text-5xl font-bold tracking-tight mb-4"
          style={{
            color: blackFridayConfig.enabled
              ? blackFridayConfig.layout_text_primary || "#FFFFFF"
              : "#0F172A",
          }}
        >
          Santo Encontro
        </h1>
        <p
          className="text-lg lg:text-xl font-light max-w-2xl mx-auto leading-relaxed mb-8"
          style={{
            color: blackFridayConfig.enabled
              ? blackFridayConfig.layout_text_secondary || "#D1D5DB"
              : "#475569",
          }}
        >
          Gerencie, acompanhe e otimize sua jornada espiritual com um plano
          feito para suas necessidades.
        </p>
      </div>

      {message && (
        <div
          className={`p-6 rounded-2xl mb-8 shadow-lg ${
            messageType === "error"
              ? "bg-red-50/80 border border-red-200/50 text-red-800"
              : "bg-emerald-50/80 border border-emerald-200/50 text-emerald-800"
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
            <span className="font-medium">{message}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12">
        {plans.map((plan) => renderPlanCard(plan))}
      </div>

      <Dialog
        open={showPaymentModal}
        onOpenChange={(open) => !open && setShowPaymentModal(false)}
      >
        {selectedPlan && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex flex-col items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <CreditCard className="text-slate-600" size={20} />
                </div>
                <DialogTitle className="text-2xl font-bold text-slate-900">
                  Escolha o método de pagamento
                </DialogTitle>
              </div>
              <DialogDescription className="text-slate-600 text-sm leading-relaxed">
                Selecione como deseja pagar o plano{" "}
                <span className="font-semibold">{selectedPlan.name}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 mt-6">
              <button
                onClick={() => handlePayment(selectedPlan, "boleto_card")}
                disabled={paymentLoading}
                className="w-full p-4 border-2 border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 text-left flex items-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="text-blue-600" size={24} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-900">
                    Boleto ou Cartão
                  </div>
                  <div className="text-sm text-slate-600">
                    Pague com boleto bancário ou cartão de crédito
                  </div>
                </div>
              </button>

              <button
                onClick={() => handlePayment(selectedPlan, "pix")}
                disabled={paymentLoading}
                className="w-full p-4 border-2 border-slate-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all duration-200 text-left flex items-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Receipt className="text-green-600" size={24} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-900">PIX</div>
                  <div className="text-sm text-slate-600">
                    Aprovação instantânea via PIX
                  </div>
                </div>
              </button>
            </div>

            {paymentLoading && (
              <div className="flex items-center justify-center gap-2 text-slate-600 mt-4">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                Processando...
              </div>
            )}
          </DialogContent>
        )}
      </Dialog>

      <Dialog
        open={!!pixData}
        onOpenChange={(open) => !open && setPixData(null)}
      >
        {pixData && (
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <Receipt className="text-green-600" size={20} />
                </div>
                <DialogTitle className="text-3xl font-bold text-slate-900">
                  Pague com PIX
                </DialogTitle>
              </div>
              <DialogDescription className="text-slate-600 text-sm leading-relaxed">
                Escaneie o QR Code ou copie o código para pagar
              </DialogDescription>
            </DialogHeader>

            <div className="mb-6">
              <div className="bg-slate-50 rounded-xl p-6 flex items-center justify-center mb-4">
                <img
                  src={pixData.qrCode}
                  alt="QR Code PIX"
                  className="w-64 h-64 object-contain"
                />
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="pix-code"
                    className="block text-sm font-semibold text-slate-700 mb-2"
                  >
                    Código PIX (Copia e Cola)
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="pix-code"
                      type="text"
                      readOnly
                      value={pixData.code}
                      className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button
                      onClick={handleCopyCode}
                      className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-medium"
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
                    className="block text-sm font-semibold text-slate-700 mb-2"
                  >
                    Chave PIX
                  </label>
                  <div
                    id="pix-key"
                    className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-900"
                  >
                    {pixData.key}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-blue-900">
                      Valor a pagar
                    </span>
                    <span className="text-lg font-bold text-blue-900">
                      R$ {pixData.amount.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                  {timeRemaining && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-blue-700">Expira em</span>
                      <span className="text-sm font-semibold text-blue-900">
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

            {/* Seção de Upload de Comprovante */}
            <div className="border-t border-slate-200 pt-6 mt-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Enviar Comprovante de Pagamento
              </h3>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="proof-file"
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    Comprovante PIX
                  </label>
                  <div className="relative">
                    <input
                      id="proof-file"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      disabled={uploading || uploaded}
                      className="hidden"
                    />
                    <label
                      htmlFor="proof-file"
                      className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                        uploading || uploaded
                          ? "bg-slate-100 border-slate-300 cursor-not-allowed"
                          : "bg-slate-50 border-slate-300 hover:bg-slate-100 hover:border-green-500"
                      }`}
                    >
                      {selectedFile ? (
                        <div className="flex items-center gap-3 p-3">
                          <FileImage className="text-green-600" size={24} />
                          <div className="text-left">
                            <p className="text-sm font-medium text-slate-900">
                              {selectedFile.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="text-slate-400" size={32} />
                          <div className="text-center">
                            <p className="text-sm text-slate-600">
                              <span className="font-semibold text-green-600">
                                Clique para enviar
                              </span>{" "}
                              ou arraste o arquivo
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              JPG, PNG, WEBP ou PDF (máx. 10MB)
                            </p>
                          </div>
                        </div>
                      )}
                    </label>
                  </div>

                  {selectedFile && selectedFile.type.startsWith("image/") && (
                    <div className="mt-3">
                      <img
                        src={URL.createObjectURL(selectedFile)}
                        alt="Preview"
                        className="max-w-full max-h-48 rounded-lg border border-slate-200"
                      />
                    </div>
                  )}
                </div>

                {uploadError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                    ⚠️ {uploadError}
                  </div>
                )}

                <button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading || uploaded}
                  className="w-full py-3 px-6 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {(() => {
                    if (uploading) {
                      return (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Enviando...
                        </>
                      );
                    }
                    if (uploaded) {
                      return (
                        <>
                          <CheckCircle2 size={20} />
                          Enviado com sucesso!
                        </>
                      );
                    }
                    return (
                      <>
                        <Upload size={20} />
                        Enviar Comprovante
                      </>
                    );
                  })()}
                </button>

                {uploaded && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <CheckCircle2
                        className="text-green-600 flex-shrink-0 mt-0.5"
                        size={20}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-green-900 mb-1">
                          Comprovante enviado com sucesso!
                        </p>
                        <p className="text-xs text-green-700">
                          Aguardando aprovação. Você será notificado quando o
                          pagamento for confirmado.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 mt-6">
              <p className="text-sm text-yellow-800">
                <strong>Importante:</strong> Após o pagamento, envie o
                comprovante acima. Sua assinatura será ativada assim que o
                pagamento for aprovado.
              </p>
            </div>

            <button
              onClick={() => {
                setPixData(null);
                setSelectedFile(null);
                setUploaded(false);
                setUploadError(null);
              }}
              className="w-full py-3 px-6 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-colors font-medium"
            >
              Fechar
            </button>
          </DialogContent>
        )}
      </Dialog>
    </ScreenLayout>
  );
}
