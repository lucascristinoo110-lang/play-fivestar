import { Tv, Trophy, Gamepad2, Ticket, Wallet } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

type BottomNavBarProps = {
  onDeposit: () => void;
};

const navItems = [
  { icon: Tv, label: "Ao Vivo", path: "/?category=live" },
  { icon: Trophy, label: "Esportes", path: "/football" },
  { icon: null, label: "", path: "" }, // center placeholder
  { icon: Gamepad2, label: "Cassino", path: "/" },
  { icon: Ticket, label: "Bilhetes", path: "/profile" },
];

export function BottomNavBar({ onDeposit, onOpenAuth }: BottomNavBarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const currentPath = location.pathname + location.search;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border/40 safe-area-bottom">
      <div className="flex items-end justify-around px-1 h-16">
        {navItems.map((item, idx) => {
          if (idx === 2) {
            // Center button: Deposit if logged in, Login if guest
            if (user) {
              return (
                <button
                  key="deposit"
                  onClick={onDeposit}
                  className="relative -mt-5 flex flex-col items-center"
                >
                  <div className="relative">
                    <span className="absolute inset-0 rounded-full animate-pulse bg-primary/40 scale-125" />
                    <div className="relative w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                      <Wallet className="h-6 w-6 text-primary-foreground" />
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-primary mt-1">Depositar</span>
                </button>
              );
            }
            return (
              <button
                key="login"
                onClick={() => onOpenAuth?.("login")}
                className="relative -mt-5 flex flex-col items-center"
              >
                <div className="relative">
                  <span className="absolute inset-0 rounded-full animate-pulse bg-primary/40 scale-125" />
                  <div className="relative w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                    <LogIn className="h-6 w-6 text-primary-foreground" />
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-primary mt-1">Entrar</span>
              </button>
            );
          }

          const Icon = item.icon!;
          const isActive = item.path === "/" 
            ? currentPath === "/" 
            : currentPath.startsWith(item.path);

          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center justify-center py-2 px-3 min-w-[56px]"
            >
              <Icon className={cn(
                "h-5 w-5 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )} />
              <span className={cn(
                "text-[10px] mt-1 font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
