import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function PrivacyPolicy() {
  const { settings } = useSiteSettings();
  const name = settings?.site_name || "SantiagoBet";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 h-14 flex items-center gap-3 px-4 border-b border-border/40 bg-background/95 backdrop-blur-xl">
        <Link to="/" className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <Shield className="h-5 w-5 text-primary" />
        <h1 className="font-bold text-sm">Política de Privacidade</h1>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6 text-sm text-muted-foreground leading-relaxed">
        <h2 className="text-xl font-bold text-foreground">Política de Privacidade — {name}</h2>
        <p>Última atualização: Março de 2026</p>

        <section className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">1. Informações que Coletamos</h3>
          <p>A {name} coleta informações pessoais que você nos fornece diretamente, como nome, e-mail, CPF, número de telefone e dados bancários para processamento de transações financeiras. Também coletamos dados automaticamente, incluindo endereço IP, tipo de dispositivo, navegador utilizado e páginas acessadas.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">2. Uso das Informações</h3>
          <p>Utilizamos seus dados para: (a) criar e gerenciar sua conta; (b) processar depósitos e saques; (c) verificar sua identidade conforme regulamentações KYC/AML; (d) enviar comunicações sobre promoções, bônus e atualizações; (e) prevenir fraudes e atividades ilícitas; (f) melhorar nossos serviços e experiência do usuário.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">3. Compartilhamento de Dados</h3>
          <p>A {name} não vende, aluga ou comercializa seus dados pessoais. Podemos compartilhar informações com: processadores de pagamento autorizados, autoridades reguladoras quando exigido por lei, e prestadores de serviços que nos auxiliam na operação da plataforma, sempre sob rígidos acordos de confidencialidade.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">4. Segurança</h3>
          <p>Empregamos medidas de segurança técnicas e organizacionais para proteger seus dados, incluindo criptografia SSL/TLS, firewalls, controle de acesso e auditorias regulares de segurança. Seus dados financeiros são processados por gateways de pagamento certificados PCI-DSS.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">5. Cookies</h3>
          <p>Utilizamos cookies e tecnologias similares para melhorar sua experiência de navegação, lembrar suas preferências e analisar o uso da plataforma. Você pode gerenciar as configurações de cookies através do seu navegador.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">6. Seus Direitos (LGPD)</h3>
          <p>Conforme a Lei Geral de Proteção de Dados (LGPD), você tem direito a: acessar, corrigir, excluir e portar seus dados pessoais; revogar consentimento; e solicitar informações sobre o tratamento de seus dados. Para exercer esses direitos, entre em contato com nosso suporte.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">7. Contato</h3>
          <p>Para questões relacionadas à privacidade, entre em contato através do e-mail: <span className="text-primary">privacidade@santiagobet.com</span> ou pelo nosso canal de Suporte ao Jogador.</p>
        </section>
      </main>
    </div>
  );
}
