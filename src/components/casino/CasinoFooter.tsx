import { ShieldCheck, Heart, CircleHelp } from "lucide-react";

export function CasinoFooter() {
  return (
    <footer className="mt-8 sm:mt-10 rounded-xl border border-border/40 bg-card card-shadow overflow-hidden">
      <div className="p-4 sm:p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Operação regular no Brasil</p>
              <p className="text-xs text-muted-foreground">Conformidade e jogo responsável para maiores de 18 anos.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <a href="#" className="px-3 py-1.5 rounded-md bg-secondary text-muted-foreground hover:bg-surface-hover">Política de Privacidade</a>
            <a href="#" className="px-3 py-1.5 rounded-md bg-secondary text-muted-foreground hover:bg-surface-hover">Termos e Condições</a>
            <a href="#" className="px-3 py-1.5 rounded-md bg-secondary text-muted-foreground hover:bg-surface-hover">Jogo Responsável</a>
            <a href="#" className="px-3 py-1.5 rounded-md bg-secondary text-muted-foreground hover:bg-surface-hover">Central de Ajuda</a>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border border-border/30 bg-secondary/60 p-3">
            <p className="text-xs font-semibold text-foreground">Atendimento 24/7</p>
            <p className="text-[11px] text-muted-foreground mt-1">Suporte via chat, e-mail e canal prioritário para saque.</p>
          </div>
          <div className="rounded-lg border border-border/30 bg-secondary/60 p-3">
            <p className="text-xs font-semibold text-foreground">Pagamentos seguros</p>
            <p className="text-[11px] text-muted-foreground mt-1">Depósito via PIX e monitoramento automático de risco.</p>
          </div>
          <div className="rounded-lg border border-border/30 bg-secondary/60 p-3">
            <p className="text-xs font-semibold text-foreground">Ajuda rápida</p>
            <p className="text-[11px] text-muted-foreground mt-1">Dúvidas sobre conta, KYC, bônus e regras de apostas.</p>
          </div>
        </div>
      </div>

      <div className="border-t border-border/40 px-4 sm:px-6 py-3 text-[11px] text-muted-foreground flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="flex items-center gap-1.5">
          Feito com <Heart className="h-3.5 w-3.5 text-primary" /> para brasileiros.
        </p>
        <p className="flex items-center gap-1.5">
          <CircleHelp className="h-3.5 w-3.5" /> Apenas para maiores de 18 anos.
        </p>
      </div>
    </footer>
  );
}
