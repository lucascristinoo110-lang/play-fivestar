import { 
  Home, Gamepad2, Flame, Star, Tv, Dice5, Rocket, 
  Wallet, ArrowDownToLine, ArrowUpFromLine, Users, 
  BarChart3, Settings, Shield, ChevronLeft, ChevronRight
} from "lucide-react";
import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const playerLinks = [
  { icon: Home, label: "Início", path: "/" },
  { icon: Flame, label: "Populares", path: "/?filter=hot" },
  { icon: Star, label: "Novos", path: "/?filter=new" },
  { icon: Gamepad2, label: "Slots", path: "/?category=slots" },
  { icon: Tv, label: "Ao Vivo", path: "/?category=live" },
  { icon: Dice5, label: "Mesa", path: "/?category=table" },
  { icon: Rocket, label: "Crash", path: "/?category=crash" },
];

const financeLinks = [
  { icon: Wallet, label: "Carteira", path: "/wallet" },
  { icon: ArrowDownToLine, label: "Depositar", path: "/deposit" },
  { icon: ArrowUpFromLine, label: "Sacar", path: "/withdraw" },
];

const adminLinks = [
  { icon: BarChart3, label: "Dashboard", path: "/admin" },
  { icon: Users, label: "Usuários", path: "/admin/users" },
  { icon: Shield, label: "API Logs", path: "/admin/logs" },
  { icon: Settings, label: "Configurações", path: "/admin/settings" },
];

export function CasinoSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname + location.search === path || location.pathname === path;

  const SidebarLink = ({ icon: Icon, label, path }: { icon: any; label: string; path: string }) => (
    <Link
      to={path}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150",
        "hover:bg-surface-hover",
        isActive(path)
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  );

  const SectionLabel = ({ children }: { children: string }) => (
    !collapsed ? (
      <p className="px-3 pt-4 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
        {children}
      </p>
    ) : <div className="pt-4 border-t border-border/40 mt-2" />
  );

  return (
    <aside
      className={cn(
        "h-screen sticky top-0 flex flex-col border-r border-border/40 bg-sidebar transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border/40">
        {!collapsed && (
          <span className="text-xl font-bold text-gradient-green tracking-tight">NEXUS</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-surface-hover text-muted-foreground"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        <SectionLabel>Jogos</SectionLabel>
        {playerLinks.map(link => <SidebarLink key={link.path} {...link} />)}
        
        <SectionLabel>Financeiro</SectionLabel>
        {financeLinks.map(link => <SidebarLink key={link.path} {...link} />)}

        <SectionLabel>Admin</SectionLabel>
        {adminLinks.map(link => <SidebarLink key={link.path} {...link} />)}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-border/40">
          <p className="text-xs text-muted-foreground/50 text-center">
            © 2026 Nexus Gaming
          </p>
        </div>
      )}
    </aside>
  );
}
