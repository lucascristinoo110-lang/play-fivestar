import { Link } from "react-router-dom";
import { ArrowLeft, Headphones } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function PlayerSupport() {
  const { settings } = useSiteSettings();
  const name = settings?.site_name || "SantiagoBet";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 h-14 flex items-center gap-3 px-4 border-b border-border/40 bg-background/95 backdrop-blur-xl">
        <Link to="/" className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <Headphones className="h-5 w-5 text-primary" />
        <h1 className="font-bold text-sm">Suporte ao Jogador</h1>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6 text-sm text-muted-foreground leading-relaxed">
        <h2 className="text-xl font-bold text-foreground">Central de Suporte — {name}</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-xl bg-card border border-border/40 p-5 space-y-2">
            <h3 className="text-base font-semibold text-foreground">📧 E-mail</h3>
            <p>Para dúvidas gerais, envie um e-mail para:</p>
            <p className="text-primary font-medium">suporte@santiagobet.com</p>
            <p className="text-xs">Tempo médio de resposta: até 24 horas</p>
          </div>
          <div className="rounded-xl bg-card border border-border/40 p-5 space-y-2">
            <h3 className="text-base font-semibold text-foreground">💬 Chat ao Vivo</h3>
            <p>Atendimento em tempo real, 24 horas por dia, 7 dias por semana.</p>
            <p className="text-xs">Disponível diretamente na plataforma através do ícone de chat.</p>
          </div>
          <div className="rounded-xl bg-card border border-border/40 p-5 space-y-2">
            <h3 className="text-base font-semibold text-foreground">📱 WhatsApp</h3>
            <p>Atendimento rápido via WhatsApp:</p>
            <p className="text-primary font-medium">+55 (11) 99999-0000</p>
            <p className="text-xs">Horário: Seg a Sex, 9h às 21h</p>
          </div>
          <div className="rounded-xl bg-card border border-border/40 p-5 space-y-2">
            <h3 className="text-base font-semibold text-foreground">❓ FAQ</h3>
            <p>Perguntas frequentes sobre depósitos, saques, bônus e verificação de conta.</p>
          </div>
        </div>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Perguntas Frequentes</h3>
          {[
            { q: "Como faço um depósito?", a: `Na ${name}, os depósitos são feitos exclusivamente via PIX. Clique em "Depositar", insira o valor desejado e escaneie o QR Code ou copie o código PIX. O saldo é creditado em até 5 minutos.` },
            { q: "Quanto tempo leva para sacar?", a: "Os saques são processados em até 24 horas úteis após a verificação de identidade (KYC). Saques via PIX são creditados instantaneamente após a aprovação." },
            { q: "Preciso verificar minha conta?", a: "Sim. Para realizar saques, é necessário completar a verificação de identidade (KYC) enviando um documento com foto e um comprovante de residência." },
            { q: "Esqueci minha senha, o que faço?", a: 'Na tela de login, clique em "Esqueceu a senha?" e siga as instruções para redefinir sua senha via e-mail.' },
            { q: "Como funciona o bônus de boas-vindas?", a: `O bônus de primeiro depósito da ${name} é creditado automaticamente após seu primeiro depósito. Consulte os termos de rollover aplicáveis antes de solicitar um saque.` },
          ].map((faq, i) => (
            <div key={i} className="rounded-lg bg-secondary/50 border border-border/30 p-4">
              <p className="font-semibold text-foreground text-sm">{faq.q}</p>
              <p className="mt-1 text-xs">{faq.a}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
