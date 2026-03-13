import { cn } from "@/lib/utils";

export type ProviderFilter = "all" | "playfiver" | "igamewin";

const providers: { id: ProviderFilter; label: string }[] = [
  { id: "all", label: "Todos Provedores" },
  { id: "playfiver", label: "Playfiver" },
  { id: "igamewin", label: "iGameWin" },
];

export function ProviderTabs({
  active,
  onChange,
}: {
  active: ProviderFilter;
  onChange: (f: ProviderFilter) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {providers.map((p) => (
        <button
          key={p.id}
          onClick={() => onChange(p.id)}
          className={cn(
            "px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150",
            active === p.id
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
