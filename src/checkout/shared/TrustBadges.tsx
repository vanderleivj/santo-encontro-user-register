import { ShieldCheck, CalendarX, Wallet, MessageCircle } from "lucide-react";

const BADGES = [
  { icon: ShieldCheck, label: "Pagamento seguro" },
  { icon: CalendarX, label: "Cancele quando quiser" },
  { icon: Wallet, label: "PIX, cartão ou boleto" },
  { icon: MessageCircle, label: "Suporte no WhatsApp" },
] as const;

export function TrustBadges() {
  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
      {BADGES.map(({ icon: Icon, label }) => (
        <li key={label} className="flex items-center gap-2">
          <Icon
            className="w-[17px] h-[17px] text-[var(--checkout-ink-3,#8493A6)] shrink-0"
            aria-hidden
          />
          <span className="text-sm text-[var(--checkout-ink-2,#55647A)]">
            {label}
          </span>
        </li>
      ))}
    </ul>
  );
}
