import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import type { PixCheckoutData } from "./useAsaasCheckout";

interface PixPanelProps {
  readonly data: PixCheckoutData;
  readonly onGenerate: () => void;
  readonly generating: boolean;
}

function formatRemaining(expiresAt: number): string {
  const diff = Math.max(0, expiresAt - Date.now());
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function PixPanel({ data, onGenerate, generating }: PixPanelProps) {
  const [copied, setCopied] = useState(false);
  const [remaining, setRemaining] = useState(() =>
    formatRemaining(data.expiresAt)
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      setRemaining(formatRemaining(data.expiresAt));
    }, 1000);
    return () => window.clearInterval(id);
  }, [data.expiresAt]);

  const handleCopy = async () => {
    if (!data.copyPaste) return;
    await navigator.clipboard.writeText(data.copyPaste);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  if (!data.copyPaste && !data.qrCode) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          Aprovação imediata · acesso liberado quando o banco confirmar.
        </p>
        <button
          type="button"
          disabled={generating}
          onClick={onGenerate}
          className="brand-primary-button w-full py-3 rounded-2xl font-bold text-sm disabled:opacity-50"
        >
          {generating ? "Gerando PIX..." : "Gerar QR Code PIX"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Escaneie o código no app do seu banco
      </p>

      {data.qrCode ? (
        <div className="flex justify-center">
          <img
            src={data.qrCode}
            alt="QR Code PIX"
            className="w-48 h-48 rounded-2xl border border-slate-100 bg-white p-2"
          />
        </div>
      ) : null}

      <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside">
        <li>Abra o aplicativo do seu banco</li>
        <li>Escolha pagar com PIX › Ler QR Code</li>
        <li>Confirme o valor e finalize</li>
      </ol>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-slate-500 uppercase">
          Pix copia e cola
        </p>
        <div className="flex gap-2">
          <input
            readOnly
            value={data.copyPaste}
            className="flex-1 text-xs px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 truncate"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 px-3 rounded-xl bg-slate-900 text-white text-xs font-semibold flex items-center gap-1"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
        <p className="text-xs text-slate-500">
          O código expira em <strong>{remaining}</strong>
        </p>
      </div>

      <div className="rounded-2xl bg-sky-50 text-sky-800 text-xs px-3 py-2.5 flex items-center gap-2">
        <span className="w-3.5 h-3.5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
        Aguardando confirmação do banco. Assim que o pagamento cair, seu acesso
        é liberado automaticamente.
      </div>
    </div>
  );
}
