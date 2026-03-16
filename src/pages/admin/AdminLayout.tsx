import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Outlet, Link, useLocation } from "react-router-dom";
import {
  BarChart3, Users, Settings, Shield, ArrowDownToLine,
  ArrowUpFromLine, FileCheck, Palette, Gamepad2, LogOut, Home, Sun, Moon,
  Image, UserCheck, ChevronRight, Ticket, Menu, X, Megaphone
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const links = [
  { icon: BarChart3, label: "Dashboard", path: "/rei" },
  { icon: Users, label: "Usuários", path: "/rei/users" },
  { icon: ArrowDownToLine, label: "Depósitos", path: "/rei/deposits" },
  { icon: ArrowUpFromLine, label: "Saques", path: "/rei/withdrawals" },
  { icon: Ticket, label: "Bilhetes", path: "/rei/bets" },
  { icon: FileCheck, label: "KYC / Documentos", path: "/rei/kyc" },
  { icon: Gamepad2, label: "Jogos / Provedores", path: "/rei/games" },
  { icon: Image, label: "Banners", path: "/rei/banners" },
  { icon: UserCheck, label: "Afiliados", path: "/rei/affiliates" },
  { icon: Megaphone, label: "Anúncios / Pixel", path: "/rei/ads" },
  { icon: Palette, label: "Aparência", path: "/rei/appearance" },
  { icon: Shield, label: "Gateway BSPAY", path: "/rei/bspay" },
  { icon: Settings, label: "Configurações", path: "/rei/settings" },
];

export default function AdminLayout() {
  const { isAdmin, loading, signOut } = useAuth();
  const location = useLocation();
  const [light, setLight] = useState(() => localStorage.getItem("admin-theme") === "light");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("admin-theme", light ? "light" : "dark");
  }, [light]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  const currentLabel = links.find(l => l.path === location.pathname)?.label || "Dashboard";

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className={cn("h-16 flex items-center justify-between px-5 border-b shrink-0", light ? "border-slate-200/60" : "border-slate-700/40")}>
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shadow-lg",
            light ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-blue-500/25" : "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-emerald-500/25"
          )}>
            S
          </div>
          <div>
            <span className={cn("text-[15px] font-bold tracking-tight block leading-tight", light ? "text-slate-800" : "text-white")}>Santiago</span>
            <span className={cn("text-[10px] font-medium", light ? "text-slate-400" : "text-slate-500")}>Painel Admin</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setLight(!light)} className={cn("p-2 rounded-lg transition-colors", light ? "hover:bg-slate-100 text-slate-400" : "hover:bg-slate-700/50 text-slate-400")}>
            {light ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
          <button onClick={() => setSidebarOpen(false)} className={cn("p-2 rounded-lg lg:hidden", light ? "hover:bg-slate-100 text-slate-400" : "hover:bg-slate-700/50 text-slate-400")}>
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1">
        <p className={cn("text-[10px] font-bold uppercase tracking-[0.15em] px-3 mb-3", light ? "text-slate-400" : "text-slate-600")}>Navegação</p>
        {links.map(({ icon: Icon, label, path }) => {
          const active = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all group relative",
                active
                  ? light
                    ? "bg-blue-50 text-blue-700 shadow-sm shadow-blue-500/10 border border-blue-100"
                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : light
                    ? "text-slate-500 hover:text-slate-800 hover:bg-slate-50/80 border border-transparent"
                    : "text-slate-300 hover:text-white hover:bg-slate-700/40 border border-transparent"
              )}
            >
              <Icon className={cn("h-[18px] w-[18px] shrink-0 transition-all", active ? "" : "opacity-50 group-hover:opacity-80")} />
              <span className="flex-1 truncate">{label}</span>
              {active && <ChevronRight className="h-3.5 w-3.5 opacity-40" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={cn("px-3 py-4 border-t space-y-1 shrink-0", light ? "border-slate-200/60" : "border-slate-700/40")}>
        <Link to="/" className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium border border-transparent", light ? "text-slate-500 hover:bg-slate-50 hover:text-slate-800" : "text-slate-300 hover:bg-slate-700/40 hover:text-white")}>
          <Home className="h-[18px] w-[18px] opacity-50" />
          <span>Voltar ao site</span>
        </Link>
        <button onClick={signOut} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium border border-transparent", light ? "text-red-500 hover:bg-red-50 hover:border-red-100" : "text-red-400 hover:bg-red-500/10 hover:border-red-500/20")}>
          <LogOut className="h-[18px] w-[18px] opacity-50" />
          <span>Sair</span>
        </button>
      </div>
    </>
  );

  return (
    <div className={cn("flex min-h-screen", light ? "bg-slate-50 text-slate-900" : "bg-[#111827] text-slate-100")}>
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:flex w-[260px] h-screen sticky top-0 flex-col shrink-0",
        light
          ? "bg-white/80 backdrop-blur-xl border-r border-slate-200/60"
          : "bg-[#1a2236]/90 backdrop-blur-xl border-r border-slate-700/40"
      )}>
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className={cn(
            "relative w-[280px] h-full flex flex-col",
            light
              ? "bg-white border-r border-slate-200/60"
              : "bg-[#1a2236] border-r border-slate-700/40"
          )}>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className={cn(
          "sticky top-0 z-30 h-14 flex items-center justify-between px-4 lg:px-8 border-b backdrop-blur-xl",
          light ? "bg-white/70 border-slate-200/60" : "bg-[#111827]/80 border-slate-700/40"
        )}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className={cn("p-2 rounded-lg lg:hidden", light ? "hover:bg-slate-100 text-slate-500" : "hover:bg-white/[0.06] text-slate-400")}>
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className={cn("text-base font-bold tracking-tight", light ? "text-slate-800" : "text-white")}>{currentLabel}</h1>
            </div>
          </div>
        </header>
        <main className={cn("flex-1 p-4 lg:p-8 overflow-y-auto", light ? "bg-slate-50" : "bg-[#111827]")}>
          <Outlet context={{ light }} />
        </main>
      </div>
    </div>
  );
}
