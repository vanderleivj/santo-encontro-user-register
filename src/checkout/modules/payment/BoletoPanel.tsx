interface BoletoPanelProps {
  readonly onGenerate: () => void;
  readonly onVerifyPayment: () => void;
  readonly loading: boolean;
  readonly verifying: boolean;
  readonly awaitingConfirmation: boolean;
  readonly boletoUrl: string | null;
}

export function BoletoPanel({
  onGenerate,
  onVerifyPayment,
  loading,
  verifying,
  awaitingConfirmation,
  boletoUrl,
}: BoletoPanelProps) {
  if (!boletoUrl) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          Compensa em até 3 dias úteis. O acesso é liberado após a confirmação
          do pagamento.
        </p>
        <button
          type="button"
          disabled={loading}
          onClick={onGenerate}
          className="brand-primary-button w-full py-3 rounded-2xl font-bold text-sm disabled:opacity-50"
        >
          {loading ? "Gerando boleto..." : "Gerar boleto"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Boleto gerado. Compensa em até 3 dias úteis. Seu acesso só será liberado
        depois da confirmação do pagamento.
      </p>

      <a
        href={boletoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="brand-primary-button block w-full py-3 rounded-2xl font-bold text-sm text-center"
      >
        Abrir boleto
      </a>

      {awaitingConfirmation ? (
        <div className="rounded-2xl bg-sky-50 text-sky-800 text-xs px-3 py-2.5 flex items-center gap-2">
          <span className="w-3.5 h-3.5 shrink-0 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <span>
            Aguardando compensação. Assim que o banco confirmar, seu acesso é
            liberado automaticamente.
          </span>
        </div>
      ) : null}

      <button
        type="button"
        disabled={verifying || loading}
        onClick={onVerifyPayment}
        className="w-full py-3 rounded-2xl font-semibold text-sm border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {verifying ? "Verificando..." : "Já paguei — verificar status"}
      </button>
    </div>
  );
}
