import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Outlet, Link, useLocation } from "react-router-dom";
import {
  BarChart3, Users, Settings, Shield, ArrowDownToLine,
  ArrowUpFromLine, FileCheck, Palette, Gamepad2, LogOut, Home, Sun, Moon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const links = [
  { icon: BarChart3, label: "Dashboard", path: "/rei" },
  { icon: Users, label: "Usuários", path: "/rei/users" },
  { icon: ArrowDownToLine, label: "Depósitos", path: "/rei/deposits" },
  { icon: ArrowUpFromLine, label: "Saques", path: "/rei/withdrawals" },
  { icon: FileCheck, label: "KYC / Documentos", path: "/rei/kyc" },
  { icon: Gamepad2, label: "Jogos / Provedores", path: "/rei/games" },
  { icon: Palette, label: "Aparência", path: "/rei/appearance" },
  { icon: Shield, label: "Gateway BSPAY", path: "/rei/bspay" },
  { icon: Settings, label: "Configurações", path: "/rei/settings" },
];

export default function AdminLayout() {
  const { isAdmin, loading, signOut } = useAuth();
  const location = useLocation();
  const [light, setLight] = useState(() => localStorage.getItem("admin-theme") === "light");

  useEffect(() => {
    localStorage.setItem("admin-theme", light ? "light" : "dark");
  }, [light]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className={cn("flex min-h-screen", light ? "bg-white text-gray-900" : "bg-background text-foreground")}>
      <aside className={cn("w-60 h-screen sticky top-0 flex flex-col border-r", light ? "bg-gray-50 border-gray-200" : "bg-card border-border/40")}>
        <div className={cn("h-16 flex items-center justify-between px-4 border-b", light ? "border-gray-200" : "border-border/40")}>
          <span className={cn("text-xl font-bold tracking-tight", light ? "text-gray-900" : "text-gradient-green")}>PAINEL</span>
          <button onClick={() => setLight(!light)} className={cn("p-1.5 rounded-md", light ? "hover:bg-gray-200 text-gray-600" : "hover:bg-surface-hover text-muted-foreground")}>
            {light ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {links.map(({ icon: Icon, label, path }) => (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                light ? "hover:bg-gray-200" : "hover:bg-surface-hover",
                location.pathname === path
                  ? light ? "bg-blue-50 text-blue-700 font-medium" : "bg-primary/10 text-primary font-medium"
                  : light ? "text-gray-600" : "text-muted-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className={cn("p-2 border-t space-y-0.5", light ? "border-gray-200" : "border-border/40")}>
          <Link to="/" className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm", light ? "text-gray-600 hover:bg-gray-200" : "text-muted-foreground hover:bg-surface-hover")}>
            <Home className="h-4 w-4" />
            <span>Voltar ao site</span>
          </Link>
          <button onClick={signOut} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm", light ? "text-red-600 hover:bg-red-50" : "text-destructive hover:bg-destructive/10")}>
            <LogOut className="h-4 w-4" />
            <span>Sair</span>
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className={cn("sticky top-0 z-30 h-16 flex items-center px-6 border-b backdrop-blur-xl", light ? "bg-white/80 border-gray-200" : "bg-background/80 border-border/40")}>
          <h1 className={cn("text-lg font-semibold", light ? "text-gray-900" : "text-foreground")}>Painel Administrativo</h1>
        </header>
        <main className={cn("flex-1 p-6 overflow-y-auto", light ? "bg-gray-50" : "")}>
          <Outlet context={{ light }} />
        </main>
      </div>
    </div>
  );
}
