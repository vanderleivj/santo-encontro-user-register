import { SupportContact } from "../../components/register/SupportContact";

export function SupportWhatsApp() {
  return (
    <div className="space-y-2">
      <p className="text-center text-xs text-[var(--layout-text-muted)]">
        Travou em alguma etapa?
      </p>
      <SupportContact />
    </div>
  );
}
