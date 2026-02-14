import { useNavigate } from "@tanstack/react-router";
import { useRegister } from "../hooks/useRegister";
import InactiveUserScreen from "./InactiveUserScreen";
import { RegisterHeader } from "./register/RegisterHeader";
import { SupportContact } from "./register/SupportContact";
import { PersonalDataSection } from "./register/PersonalDataSection";
import { AddressSection } from "./register/AddressSection";
import { ReligiousInfoSection } from "./register/ReligiousInfoSection";
import { TermsSection } from "./register/TermsSection";
import { LoginModal } from "./register/LoginModal";

export default function RegisterScreen() {
  const navigate = useNavigate();
  const {
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
    showLoginModal,
    setShowLoginModal,
    existingUserEmail,
    setInactiveReason,
    setShowInactiveScreen,
  } = useRegister();

  const handleLoginSuccess = () => {
    navigate({ to: "/plans" });
  };

  const handleInactiveUser = (reason: string) => {
    setInactiveReason(reason);
    setShowInactiveScreen(true);
    setShowLoginModal(false);
  };

  if (showInactiveScreen) {
    return (
      <InactiveUserScreen
        reason={inactiveReason}
        onBackToLogin={() => navigate({ to: "/" })}
      />
    );
  }

  return (
    <div className="min-h-screen bg-register-bg text-slate-900 font-sans">
      <div className="max-w-md mx-auto px-6 pb-12 pt-4">
        <RegisterHeader onOpenLogin={() => setShowLoginModal(true)} />

        <div className="mb-6">
          <SupportContact />
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6"
        >
          <div className="space-y-6">
            <PersonalDataSection
            control={control}
            errors={errors}
            isSenhaVisible={isSenhaVisible}
            setIsSenhaVisible={setIsSenhaVisible}
            isConfirmarSenhaVisible={isConfirmarSenhaVisible}
            setIsConfirmarSenhaVisible={setIsConfirmarSenhaVisible}
          />

          <AddressSection
            control={control}
            errors={errors}
            fetchAddressFromCEP={fetchAddressFromCEP}
            isLoadingCep={isLoadingCep}
          />
        </div>

        <ReligiousInfoSection
          control={control}
          errors={errors}
          jaCasado={jaCasado}
          isViuvo={isViuvo}
        />

        <TermsSection control={control} errors={errors} />

          <div className="pt-4">
            <button
              type="submit"
              className="cursor-pointer w-full bg-slate-800 hover:border-2 hover:border-slate-800 hover:bg-transparent hover:text-slate-800 text-white font-semibold py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-register-primary/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processando...
                </div>
              ) : (
                "Escolher Plano"
              )}
            </button>
          </div>
        </form>

        <div className="flex justify-center mt-12 mb-2">
          <div className="w-32 h-1.5 bg-slate-200 rounded-full" />
        </div>
      </div>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
        userEmail={existingUserEmail}
        isManualTrigger={!existingUserEmail}
        onInactiveUser={handleInactiveUser}
      />
    </div>
  );
}
