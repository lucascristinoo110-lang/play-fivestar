import { Link } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function TermsConditions() {
  const { settings } = useSiteSettings();
  const name = settings?.site_name || "SantiagoBet";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 h-14 flex items-center gap-3 px-4 border-b border-border/40 bg-background/95 backdrop-blur-xl">
        <Link to="/" className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <FileText className="h-5 w-5 text-primary" />
        <h1 className="font-bold text-sm">Termos e Condições</h1>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6 text-sm text-muted-foreground leading-relaxed">
        <h2 className="text-xl font-bold text-foreground">Termos e Condições de Uso — {name}</h2>
        <p>Última atualização: Março de 2026</p>

        <section className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">1. Aceitação dos Termos</h3>
          <p>Ao acessar e utilizar a plataforma {name}, você concorda integralmente com estes Termos e Condições. Caso não concorde com qualquer disposição, não utilize nossos serviços.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">2. Elegibilidade</h3>
          <p>Para utilizar a {name}, você deve: (a) ter no mínimo 18 anos de idade; (b) residir em território onde apostas online sejam legalmente permitidas; (c) fornecer informações verdadeiras e precisas durante o cadastro; (d) possuir CPF válido e regularizado.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">3. Conta do Usuário</h3>
          <p>Cada usuário pode manter apenas uma conta ativa. É de sua responsabilidade manter a segurança de suas credenciais de acesso. A {name} reserva-se o direito de suspender ou encerrar contas que violem estes termos ou apresentem atividades suspeitas.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">4. Depósitos e Saques</h3>
          <p>Os depósitos são processados via PIX e creditados em até 5 minutos. Os saques estão sujeitos a verificação de identidade (KYC) e são processados em até 24 horas úteis. Valores mínimos e máximos para transações são definidos pela plataforma e podem ser alterados a qualquer momento.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">5. Bônus e Promoções</h3>
          <p>Todos os bônus estão sujeitos a requisitos de rollover antes que possam ser sacados. As condições específicas de cada promoção são detalhadas no momento da oferta. A {name} reserva-se o direito de cancelar bônus em caso de uso abusivo ou fraudulento.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">6. Jogo Responsável</h3>
          <p>A {name} promove o jogo responsável e oferece ferramentas para autoexclusão, limites de depósito e períodos de pausa. Se você suspeitar que possui um problema com jogos de azar, procure ajuda profissional.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">7. Limitação de Responsabilidade</h3>
          <p>A {name} não se responsabiliza por perdas decorrentes de apostas, indisponibilidade temporária da plataforma ou eventos de força maior. A plataforma é oferecida "como está" e não garante resultados financeiros.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">8. Legislação Aplicável</h3>
          <p>Estes termos são regidos pela legislação brasileira. Qualquer disputa será resolvida no foro da comarca de São Paulo/SP.</p>
        </section>
      </main>
    </div>
  );
}
