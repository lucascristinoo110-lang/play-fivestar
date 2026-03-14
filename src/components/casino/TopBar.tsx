import { Search, Bell, User, Wallet, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import type { AuthMode } from "./AuthOverlayModal";

type TopBarProps = {
  onSearch: (q: string) => void;
  onDeposit?: () => void;
  onMenuToggle?: () => void;
  onOpenAuth?: (mode: AuthMode) => void;
};

export function TopBar({ onSearch, onDeposit, onMenuToggle, onOpenAuth }: TopBarProps) {
  const { user, profile } = useAuth();
  const balance = profile?.balance ?? 0;
  const isMobile = useIsMobile();
  const { settings } = useSiteSettings();

  return (
    <header className="sticky top-0 z-30 border-b border-border/40 bg-background/95 backdrop-blur-xl">
      {/* Main top bar */}
      <div className="h-14 sm:h-16 flex items-center justify-between px-3 sm:px-6 gap-2">
        {isMobile && (
          <button onClick={onMenuToggle} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground shrink-0">
            <Menu className="h-5 w-5" />
          </button>
        )}

        {/* Logo - mobile shows in top bar */}
        {isMobile && (
          <Link to="/" className="flex-1 flex justify-center min-w-0">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt={settings?.site_name || "Logo"} className="h-8 w-auto object-contain" />
            ) : (
              <span className="text-lg font-bold text-gradient-green tracking-tight">{settings?.site_name || "NEXUS"}</span>
            )}
          </Link>
        )}

        {/* Search - desktop only in top bar */}
        {!isMobile && (
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar jogos..."
              className="pl-10 bg-secondary border-border/40 text-sm h-9 focus-visible:ring-primary/30"
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
        )}

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {user ? (
            <>
              {isMobile ? (
                /* Mobile: just balance + deposit */
                <>
                  <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-secondary border border-border/40">
                    <Wallet className="h-3.5 w-3.5 text-primary" />
                    <span className="font-mono text-xs font-semibold text-foreground">
                      R$ {Number(balance).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </>
              ) : (
                /* Desktop: full controls */
                <>
                  <div className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-secondary border border-border/40">
                    <Wallet className="h-4 w-4 text-primary" />
                    <span className="font-mono text-sm font-semibold text-foreground">
                      R$ {Number(balance).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-0 rounded-lg animate-ping bg-primary/20" />
                    <Button
                      size="sm"
                      className="relative bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs h-9 px-4"
                      onClick={onDeposit}
                    >
                      Depositar
                    </Button>
                  </div>
                  <button className="relative p-2 rounded-lg hover:bg-secondary text-muted-foreground">
                    <Bell className="h-4 w-4" />
                  </button>
                  <Link to="/profile" className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
                    <User className="h-4 w-4" />
                  </Link>
                </>
              )}
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-8 px-3 sm:px-4 border-foreground/30 text-foreground font-semibold hover:bg-foreground/10"
                onClick={() => onOpenAuth?.("login")}
              >
                Entrar
              </Button>
              <Button
                size="sm"
                className="bg-primary text-primary-foreground text-xs h-8 px-3 sm:px-4 font-semibold"
                onClick={() => onOpenAuth?.("register")}
              >
                Cadastrar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Mobile search bar below */}
      {isMobile && (
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar jogos..."
              className="pl-10 bg-secondary border-border/40 text-sm h-9 focus-visible:ring-primary/30"
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
        </div>
      )}
    </header>
  );
}
