import { Link } from "react-router-dom";
import { ArrowLeft, Phone } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function Ombudsman() {
  const { settings } = useSiteSettings();
  const name = settings?.site_name || "SantiagoBet";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 h-14 flex items-center gap-3 px-4 border-b border-border/40 bg-background/95 backdrop-blur-xl">
        <Link to="/" className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <Phone className="h-5 w-5 text-primary" />
        <h1 className="font-bold text-sm">Ouvidoria</h1>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6 text-sm text-muted-foreground leading-relaxed">
        <h2 className="text-xl font-bold text-foreground">Ouvidoria — {name}</h2>

        <section className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">O que é a Ouvidoria?</h3>
          <p>A Ouvidoria da {name} é um canal de última instância para resolução de problemas que não foram solucionados pelos canais de atendimento padrão (chat, e-mail, WhatsApp). Nosso compromisso é analisar sua solicitação com imparcialidade e transparência.</p>
        </section>

        <div className="rounded-xl bg-card border border-border/40 p-5 space-y-3">
          <h3 className="text-base font-semibold text-foreground">📧 Contato da Ouvidoria</h3>
          <p className="text-primary font-medium">ouvidoria@santiagobet.com</p>
          <p>Prazo de resposta: até 10 dias úteis</p>
        </div>

        <section className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">Quando Procurar a Ouvidoria?</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Quando o Suporte ao Jogador não resolveu sua solicitação</li>
            <li>Quando o prazo de resposta do suporte foi excedido</li>
            <li>Para reclamações sobre serviços prestados</li>
            <li>Para sugestões de melhoria da plataforma</li>
            <li>Para elogios ao atendimento recebido</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">Como Funciona</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { step: "1", title: "Registre", desc: "Envie sua solicitação com todos os detalhes e seu número de protocolo anterior." },
              { step: "2", title: "Análise", desc: "Nossa equipe de ouvidoria analisará o caso com imparcialidade em até 10 dias úteis." },
              { step: "3", title: "Resposta", desc: "Você receberá uma resposta definitiva com a resolução ou encaminhamento." },
            ].map(s => (
              <div key={s.step} className="rounded-lg bg-secondary/50 border border-border/30 p-4 text-center">
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-sm flex items-center justify-center mx-auto mb-2">{s.step}</div>
                <p className="font-semibold text-foreground text-sm">{s.title}</p>
                <p className="text-xs mt-1">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
