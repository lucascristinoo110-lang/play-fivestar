import { cn } from "@/lib/utils";
import { Flame, Sparkles, Gamepad2, Tv, Dice5, Rocket, LayoutGrid } from "lucide-react";

export type CategoryFilter = "all" | "hot" | "new" | "slots" | "live" | "table" | "crash";

const tabs: { id: CategoryFilter; label: string; icon: any }[] = [
  { id: "all", label: "Todos", icon: LayoutGrid },
  { id: "hot", label: "Populares", icon: Flame },
  { id: "new", label: "Novos", icon: Sparkles },
  { id: "slots", label: "Slots", icon: Gamepad2 },
  { id: "live", label: "Ao Vivo", icon: Tv },
  { id: "table", label: "Mesa", icon: Dice5 },
  { id: "crash", label: "Crash", icon: Rocket },
];

export function CategoryTabs({
  active,
  onChange,
}: {
  active: CategoryFilter;
  onChange: (f: CategoryFilter) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150",
            active === tab.id
              ? "bg-primary/15 text-primary border border-primary/30"
              : "bg-secondary text-muted-foreground hover:bg-surface-hover border border-transparent"
          )}
        >
          <tab.icon className="h-3.5 w-3.5" />
          {tab.label}
        </button>
      ))}
    </div>
  );
}
