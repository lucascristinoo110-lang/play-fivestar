import { Search, Bell, User, Wallet } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TopBar({ onSearch }: { onSearch: (q: string) => void }) {
  const [balance] = useState(2450.00);

  return (
    <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-6 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      {/* Search */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar jogos..."
          className="pl-10 bg-secondary border-border/40 text-sm h-9 focus-visible:ring-primary/30"
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Balance */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary border border-border/40">
          <Wallet className="h-4 w-4 text-primary" />
          <span className="font-mono text-sm font-semibold text-foreground">
            R$ {balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
        </div>

        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs h-9 px-4">
          Depositar
        </Button>

        <button className="relative p-2 rounded-lg hover:bg-secondary text-muted-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full animate-pulse-glow" />
        </button>

        <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
          <User className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
