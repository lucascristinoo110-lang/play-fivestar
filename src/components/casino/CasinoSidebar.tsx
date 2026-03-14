import {
  Home, Gamepad2, Flame, Star, Tv, Dice5, Rocket,
  Wallet, ArrowDownToLine, ArrowUpFromLine, ChevronLeft, ChevronRight,
  LogIn, LogOut, User, X, Trophy
} from "lucide-react";
import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useIsMobile } from "@/hooks/use-mobile";

const playerLinks = [
  { icon: Home, label: "Início", path: "/" },
  { icon: Flame, label: "Populares", path: "/?filter=hot" },
  { icon: Star, label: "Novos", path: "/?filter=new" },
  { icon: Gamepad2, label: "Slots", path: "/?category=slots" },
  { icon: Tv, label: "Ao Vivo", path: "/?category=live" },
  { icon: Dice5, label: "Mesa", path: "/?category=table" },
  { icon: Rocket, label: "Crash", path: "/?category=crash" },
  { icon: Trophy, label: "Futebol", path: "/football" },
];

const financeLinks = [
  { icon: User, label: "Meu Perfil", path: "/profile" },
  { icon: Wallet, label: "Carteira", path: "/profile" },
  { icon: ArrowDownToLine, label: "Depositar", path: "/profile?action=deposit" },
  { icon: ArrowUpFromLine, label: "Sacar", path: "/profile?tab=kyc" },
];

export function CasinoSidebar({ onClose }: { onClose?: () => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { settings } = useSiteSettings();
  const isMobile = useIsMobile();

  const isActive = (path: string) => location.pathname + location.search + location.hash === path || location.pathname === path;

  const handleLinkClick = () => {
    if (isMobile && onClose) onClose();
  };

  const SidebarLink = ({ icon: Icon, label, path }: { icon: any; label: string; path: string }) => (
    <Link
      to={path}
      onClick={handleLinkClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150",
        "hover:bg-surface-hover",
        isActive(path) ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  );

  const SectionLabel = ({ children }: { children: string }) =>
    !collapsed ? (
      <p className="px-3 pt-4 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">{children}</p>
    ) : (
      <div className="pt-4 border-t border-border/40 mt-2" />
    );

  return (
    <aside
      className={cn(
        "h-screen flex flex-col border-r border-border/40 bg-sidebar transition-all duration-200",
        isMobile ? "w-60" : collapsed ? "w-16" : "w-60",
        !isMobile && "sticky top-0",
      )}
    >
      <div className="flex items-center justify-between h-14 sm:h-16 px-4 border-b border-border/40">
        {!collapsed && (
          <Link to="/" onClick={handleLinkClick} className="min-w-0">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt={settings?.site_name || "Logo"} className="h-10 w-auto object-contain" />
            ) : (
              <span className="text-lg sm:text-xl font-bold text-gradient-green tracking-tight">{settings?.site_name || ""}</span>
            )}
          </Link>
        )}
        {isMobile ? (
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-surface-hover text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        ) : (
          <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-md hover:bg-surface-hover text-muted-foreground">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        <SectionLabel>Jogos</SectionLabel>
        {playerLinks.map((link) => (
          <SidebarLink key={link.path + link.label} {...link} />
        ))}

        {user && (
          <>
            <SectionLabel>Financeiro</SectionLabel>
            {financeLinks.map((link) => (
              <SidebarLink key={link.path + link.label} {...link} />
            ))}
          </>
        )}
      </nav>

      <div className="p-2 border-t border-border/40">
        {user ? (
          <button onClick={() => { signOut(); handleLinkClick(); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-surface-hover">
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
        ) : (
          <Link to="/" onClick={handleLinkClick} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-primary hover:bg-surface-hover">
            <LogIn className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Entrar</span>}
          </Link>
        )}
        {!collapsed && <p className="text-xs text-muted-foreground/50 text-center mt-2">© 2026 {settings?.site_name || ""}</p>}
      </div>
    </aside>
  );
}
