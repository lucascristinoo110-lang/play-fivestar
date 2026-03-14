import { Link } from "react-router-dom";
import { ArrowLeft, MessageSquareWarning } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function Complaints() {
  const { settings } = useSiteSettings();
  const name = settings?.site_name || "SantiagoBet";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 h-14 flex items-center gap-3 px-4 border-b border-border/40 bg-background/95 backdrop-blur-xl">
        <Link to="/" className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <MessageSquareWarning className="h-5 w-5 text-primary" />
        <h1 className="font-bold text-sm">Denúncias</h1>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6 text-sm text-muted-foreground leading-relaxed">
        <h2 className="text-xl font-bold text-foreground">Canal de Denúncias — {name}</h2>

        <section className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">Como Denunciar</h3>
          <p>A {name} mantém um canal de denúncias sigiloso para reportar irregularidades, fraudes, comportamento inadequado ou qualquer atividade suspeita na plataforma.</p>
        </section>

        <div className="rounded-xl bg-card border border-border/40 p-5 space-y-3">
          <h3 className="text-base font-semibold text-foreground">📧 E-mail de Denúncias</h3>
          <p className="text-primary font-medium">denuncias@santiagobet.com</p>
          <p>Todas as denúncias são tratadas com total sigilo e confidencialidade. Ao enviar uma denúncia, inclua o máximo de detalhes possível: data, horário, usuários envolvidos e evidências (prints, links, etc.).</p>
        </div>

        <section className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">O que pode ser denunciado</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Fraude ou manipulação de resultados</li>
            <li>Uso de contas múltiplas (multi-accounting)</li>
            <li>Lavagem de dinheiro ou atividades suspeitas</li>
            <li>Assédio ou comportamento abusivo</li>
            <li>Menores de idade utilizando a plataforma</li>
            <li>Qualquer violação dos Termos e Condições</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">Proteção ao Denunciante</h3>
          <p>A {name} garante total proteção ao denunciante. Sua identidade será mantida em sigilo absoluto e nenhuma retaliação será tolerada. Denúncias anônimas também são aceitas.</p>
        </section>
      </main>
    </div>
  );
}
