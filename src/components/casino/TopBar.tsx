import { Search, Bell, User, Wallet, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

export function TopBar({ onSearch }: { onSearch: (q: string) => void }) {
  const { user, profile } = useAuth();
  const balance = profile?.balance ?? 0;

  return (
    <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-6 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar jogos..."
          className="pl-10 bg-secondary border-border/40 text-sm h-9 focus-visible:ring-primary/30"
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-3">
        {user ? (
          <>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary border border-border/40">
              <Wallet className="h-4 w-4 text-primary" />
              <span className="font-mono text-sm font-semibold text-foreground">
                R$ {Number(balance).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs h-9 px-4" asChild>
              <Link to="/deposit">Depositar</Link>
            </Button>
            <button className="relative p-2 rounded-lg hover:bg-secondary text-muted-foreground">
              <Bell className="h-4 w-4" />
            </button>
            <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
              <User className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <Button size="sm" variant="ghost" className="text-xs" asChild>
              <Link to="/login"><LogIn className="h-4 w-4 mr-1" /> Entrar</Link>
            </Button>
            <Button size="sm" className="bg-primary text-primary-foreground text-xs" asChild>
              <Link to="/register">Cadastrar</Link>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
