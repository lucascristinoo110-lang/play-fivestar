import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import autorizadoImg from "@/assets/autorizado-fazenda.png";

export function CasinoFooter() {
  const { settings } = useSiteSettings();
  const siteName = settings?.site_name || "PlayFiveStar";

  return (
    <footer className="mt-8 sm:mt-10 space-y-0 overflow-hidden">
      {/* Divider */}
      <div className="border-t border-border/40" />

      {/* Made with love */}
      <div className="flex items-center justify-center gap-2 py-6">
        <img
          src="https://flagcdn.com/w40/br.png"
          alt="Brasil"
          className="h-5 w-auto rounded-sm"
        />
        <p className="text-sm text-foreground font-medium">
          Feito com <Heart className="inline h-4 w-4 text-primary fill-primary" /> para brasileiros!
        </p>
      </div>

      {/* Divider */}
      <div className="border-t border-border/40" />

      {/* Legal text + Authorization badge */}
      <div className="px-4 sm:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1 space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">{siteName.toUpperCase()}</strong> é um site de entretenimento
              online que oferece aos seus usuários uma experiência única em apostas esportivas e jogos online.
              Este site é operado por uma empresa registrada no Brasil, entidade devidamente autorizada a operar
              na modalidade lotérica de apostas de quota fixa no Brasil, em temática desportiva e jogos online,
              conjuntamente, pela Secretaria de Prêmios e Apostas do Ministério da Fazenda.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Ao acessar, continuar a usar ou navegar neste site, você concorda que podemos usar determinados
              cookies do navegador para melhorar sua experiência ao usar nosso site. Utilizamos cookies apenas
              para melhorar a sua experiência e isso não interfere na sua privacidade.
            </p>
          </div>
          <div className="shrink-0">
            <img
              src={autorizadoImg}
              alt="Autorizado pelo Ministério da Fazenda"
              className="h-20 sm:h-24 w-auto object-contain"
            />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border/40" />

      {/* Responsible gaming badges */}
      <div className="px-4 sm:px-8 py-6">
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-10 h-10 rounded-full border-2 border-muted-foreground flex items-center justify-center text-xs font-bold">
              18+
            </div>
            <span className="text-xs font-semibold uppercase">Jogue com<br />responsabilidade</span>
          </div>
          <div className="text-muted-foreground text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider">BeGambleAware</p>
            <p className="text-[9px]">begambleaware.org</p>
          </div>
          <div className="text-muted-foreground text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider">Jogo Responsável</p>
            <p className="text-[9px]">Pratique com consciência</p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border/40" />

      {/* Bottom links */}
      <div className="px-4 sm:px-8 py-4">
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-muted-foreground">
          <Link to="/ouvidoria" className="hover:text-foreground transition-colors">Ouvidoria</Link>
          <span className="text-border">|</span>
          <Link to="/denuncias" className="hover:text-foreground transition-colors">Denúncias</Link>
          <span className="text-border">|</span>
          <Link to="/suporte" className="hover:text-foreground transition-colors">Suporte ao Jogador</Link>
          <span className="text-border">|</span>
          <Link to="/privacidade" className="hover:text-foreground transition-colors">Política de Privacidade</Link>
          <span className="text-border">|</span>
          <Link to="/termos" className="hover:text-foreground transition-colors">Termos e Condições</Link>
        </div>
      </div>
    </footer>
  );
}
