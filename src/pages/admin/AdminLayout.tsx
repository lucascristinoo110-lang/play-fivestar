import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Outlet, Link, useLocation } from "react-router-dom";
import {
  BarChart3, Users, Settings, Shield, ArrowDownToLine,
  ArrowUpFromLine, FileCheck, Palette, Gamepad2, LogOut, Home, Sun, Moon,
  Image, UserCheck, ChevronRight
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
  { icon: Image, label: "Banners", path: "/rei/banners" },
  { icon: UserCheck, label: "Afiliados", path: "/rei/affiliates" },
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

  const currentLabel = links.find(l => l.path === location.pathname)?.label || "Dashboard";

  return (
    <div className={cn("flex min-h-screen", light ? "bg-slate-50 text-slate-900" : "bg-[#0a0e17] text-slate-100")}>
      {/* Sidebar */}
      <aside className={cn(
        "w-64 h-screen sticky top-0 flex flex-col",
        light
          ? "bg-white border-r border-slate-200/80 shadow-sm"
          : "bg-[#0f1520] border-r border-white/[0.06]"
      )}>
        {/* Brand */}
        <div className={cn("h-16 flex items-center justify-between px-5 border-b", light ? "border-slate-200/80" : "border-white/[0.06]")}>
          <div className="flex items-center gap-2">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black", light ? "bg-blue-600 text-white" : "bg-emerald-500 text-white")}>
              S
            </div>
            <span className={cn("text-base font-bold tracking-tight", light ? "text-slate-900" : "text-white")}>Santiago</span>
          </div>
          <button onClick={() => setLight(!light)} className={cn("p-1.5 rounded-lg transition-colors", light ? "hover:bg-slate-100 text-slate-400" : "hover:bg-white/[0.06] text-slate-500")}>
            {light ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          <p className={cn("text-[10px] font-semibold uppercase tracking-widest px-3 mb-2", light ? "text-slate-400" : "text-slate-600")}>Menu</p>
          {links.map(({ icon: Icon, label, path }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all group",
                  active
                    ? light
                      ? "bg-blue-50 text-blue-700 shadow-sm shadow-blue-500/10"
                      : "bg-emerald-500/10 text-emerald-400"
                    : light
                      ? "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", active ? "" : "opacity-60 group-hover:opacity-100")} />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight className="h-3.5 w-3.5 opacity-40" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={cn("px-3 py-3 border-t space-y-0.5", light ? "border-slate-200/80" : "border-white/[0.06]")}>
          <Link to="/" className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium", light ? "text-slate-500 hover:bg-slate-50 hover:text-slate-900" : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200")}>
            <Home className="h-4 w-4 opacity-60" />
            <span>Voltar ao site</span>
          </Link>
          <button onClick={signOut} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium", light ? "text-red-500 hover:bg-red-50" : "text-red-400 hover:bg-red-500/10")}>
            <LogOut className="h-4 w-4 opacity-60" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className={cn(
          "sticky top-0 z-30 h-14 flex items-center px-6 border-b backdrop-blur-xl",
          light ? "bg-white/80 border-slate-200/80" : "bg-[#0a0e17]/80 border-white/[0.06]"
        )}>
          <div className="flex items-center gap-2">
            <h1 className={cn("text-sm font-semibold", light ? "text-slate-900" : "text-white")}>{currentLabel}</h1>
          </div>
        </header>
        <main className={cn("flex-1 p-6 overflow-y-auto", light ? "bg-slate-50" : "bg-[#0a0e17]")}>
          <Outlet context={{ light }} />
        </main>
      </div>
    </div>
  );
}
