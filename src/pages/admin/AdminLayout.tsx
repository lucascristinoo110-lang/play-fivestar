import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Outlet, Link, useLocation } from "react-router-dom";
import {
  BarChart3, Users, Settings, Shield, ArrowDownToLine,
  ArrowUpFromLine, FileCheck, Palette, Gamepad2, LogOut, Home
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { icon: BarChart3, label: "Dashboard", path: "/admin" },
  { icon: Users, label: "Usuários", path: "/admin/users" },
  { icon: ArrowDownToLine, label: "Depósitos", path: "/admin/deposits" },
  { icon: ArrowUpFromLine, label: "Saques", path: "/admin/withdrawals" },
  { icon: FileCheck, label: "KYC / Documentos", path: "/admin/kyc" },
  { icon: Gamepad2, label: "Jogos / Provedores", path: "/admin/games" },
  { icon: Palette, label: "Aparência", path: "/admin/appearance" },
  { icon: Shield, label: "Gateway BSPAY", path: "/admin/bspay" },
  { icon: Settings, label: "Configurações", path: "/admin/settings" },
];

export default function AdminLayout() {
  const { isAdmin, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-60 h-screen sticky top-0 flex flex-col border-r border-border/40 bg-card">
        <div className="h-16 flex items-center px-4 border-b border-border/40">
          <span className="text-xl font-bold text-gradient-green tracking-tight">ADMIN</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {links.map(({ icon: Icon, label, path }) => (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                "hover:bg-surface-hover",
                location.pathname === path ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-2 border-t border-border/40 space-y-0.5">
          <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-surface-hover">
            <Home className="h-4 w-4" />
            <span>Voltar ao site</span>
          </Link>
          <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10">
            <LogOut className="h-4 w-4" />
            <span>Sair</span>
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-16 flex items-center px-6 border-b border-border/40 bg-background/80 backdrop-blur-xl">
          <h1 className="text-lg font-semibold text-foreground">Painel Administrativo</h1>
        </header>
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
