import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, CalendarClock, X, Ticket, CheckCircle, Loader2, MapPin } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { SportsHeroBanner } from "@/components/casino/SportsHeroBanner";
import { BottomNavBar } from "@/components/casino/BottomNavBar";
import { getTeamBadge } from "@/lib/team-badges";

type League = {
  id: string;
  name: string;
  country: string;
  apiId: string;
};

type Match = {
  id: string;
  league: string;
  leagueId: string;
  home: string;
  away: string;
  homeBadge: string;
  awayBadge: string;
  kickoff: string;
  homeScore?: number;
  awayScore?: number;
  status: string;
  venue?: string;
  city?: string;
  odds: { home: number; draw: number; away: number };
};

const LEAGUES: League[] = [
  { id: "brasileirao", name: "Brasileirão Série A", country: "🇧🇷", apiId: "4351" },
  { id: "brasileirao-b", name: "Brasileirão Série B", country: "🇧🇷", apiId: "4404" },
  { id: "copa-brasil", name: "Copa do Brasil", country: "🇧🇷", apiId: "4405" },
  { id: "libertadores", name: "Copa Libertadores", country: "🌎", apiId: "4480" },
  { id: "sulamericana", name: "Copa Sul-Americana", country: "🌎", apiId: "4481" },
  { id: "premier", name: "Premier League", country: "🏴", apiId: "4328" },
  { id: "laliga", name: "La Liga", country: "🇪🇸", apiId: "4335" },
  { id: "seriea", name: "Serie A (Itália)", country: "🇮🇹", apiId: "4332" },
  { id: "bundesliga", name: "Bundesliga", country: "🇩🇪", apiId: "4331" },
  { id: "ligue1", name: "Ligue 1", country: "🇫🇷", apiId: "4334" },
  { id: "champions", name: "Champions League", country: "🇪🇺", apiId: "4480" },
  { id: "europa", name: "Europa League", country: "🇪🇺", apiId: "4481" },
];

function deterministicOdds(home: string, away: string) {
  const seed = `${home}-${away}`.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return {
    home: Number((1.7 + (seed % 95) / 100).toFixed(2)),
    draw: Number((2.8 + (seed % 55) / 100).toFixed(2)),
    away: Number((1.8 + ((seed * 3) % 95) / 100).toFixed(2)),
  };
}

function TeamBadge({ src, name, size = "sm" }: { src: string; name: string; size?: "sm" | "md" }) {
  const cls = size === "md" ? "w-10 h-10" : "w-7 h-7";
  if (src) return <img src={src} alt={name} className={`${cls} object-contain rounded-full bg-secondary/50`} loading="lazy" />;
  return (
    <div className={`${cls} rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-foreground border border-border/30`}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

type BetSelection = {
  match: Match;
  type: "home" | "draw" | "away";
  odds: number;
};

// ── Fallback data for Brazilian leagues when API doesn't return correct data ──
function getBrazilianFallbackMatches(league: League): Match[] {
  const teams: Record<string, string[][]> = {
    "4351": [
      ["Flamengo", "Palmeiras"], ["Corinthians", "São Paulo"], ["Atlético-MG", "Cruzeiro"],
      ["Grêmio", "Internacional"], ["Botafogo", "Fluminense"], ["Santos", "Bahia"],
      ["Fortaleza", "Vasco da Gama"], ["Athletico-PR", "Coritiba"],
    ],
    "4404": [
      ["Sport", "Ceará"], ["Guarani", "Ponte Preta"], ["Vila Nova", "Goiás"],
      ["Avaí", "Chapecoense"], ["Operário-PR", "CRB"], ["Novorizontino", "Mirassol"],
    ],
    "4405": [
      ["Flamengo", "Cruzeiro"], ["Palmeiras", "Grêmio"], ["São Paulo", "Atlético-MG"],
      ["Corinthians", "Internacional"], ["Botafogo", "Fortaleza"], ["Santos", "Bahia"],
    ],
    "4480": [
      ["Flamengo", "River Plate"], ["Palmeiras", "Boca Juniors"], ["Atlético-MG", "Peñarol"],
      ["São Paulo", "Nacional"], ["Grêmio", "Cerro Porteño"], ["Internacional", "Olimpia"],
    ],
    "4481": [
      ["Fortaleza", "Independiente"], ["Athletico-PR", "LDU Quito"], ["Cruzeiro", "Racing"],
      ["Vasco", "Defensa y Justicia"], ["Bahia", "Talleres"], ["Santos", "Colón"],
    ],
  };

  const leagueTeams = teams[league.apiId] || teams["4351"];
  const now = Date.now();
  return leagueTeams.map(([home, away], i) => ({
    id: `fb-${league.apiId}-${i}`,
    league: league.name,
    leagueId: league.apiId,
    home,
    away,
    homeBadge: "",
    awayBadge: "",
    kickoff: new Date(now + (i + 1) * 86400000 + i * 7200000).toISOString(),
    status: "upcoming",
    venue: "",
    city: "",
    odds: deterministicOdds(home, away),
  }));
}

export default function Football() {
  const { settings } = useSiteSettings();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeLeague, setActiveLeague] = useState("brasileirao");
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewTab, setViewTab] = useState<"proximos" | "encerrados">("proximos");

  const [selection, setSelection] = useState<BetSelection | null>(null);
  const [betAmount, setBetAmount] = useState("");
  const [placing, setPlacing] = useState(false);
  const [betSuccess, setBetSuccess] = useState<{ ticket: string; potentialWin: number } | null>(null);

  const loadMatches = useCallback(async (leagueId: string) => {
    setLoading(true);
    const league = LEAGUES.find(l => l.id === leagueId);
    if (!league) return;

    try {
      const [nextRes, pastRes] = await Promise.allSettled([
        fetch(`https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=${league.apiId}`),
        fetch(`https://www.thesportsdb.com/api/v1/json/3/eventspastleague.php?id=${league.apiId}`),
      ]);

      const nextData = nextRes.status === "fulfilled" && nextRes.value.ok ? await nextRes.value.json() : null;
      const pastData = pastRes.status === "fulfilled" && pastRes.value.ok ? await pastRes.value.json() : null;

      const allEvents = [
        ...(Array.isArray(nextData?.events) ? nextData.events : []),
        ...(Array.isArray(pastData?.events) ? pastData.events : []),
      ];

      // CRITICAL: Filter by actual idLeague to avoid showing wrong league data
      const correctEvents = allEvents.filter((e: any) =>
        e?.strHomeTeam && e?.strAwayTeam && String(e?.idLeague) === league.apiId
      );

      const seen = new Set<string>();
      const unique = correctEvents.filter((e: any) => {
        const id = String(e?.idEvent || "");
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      });

      const mapped: Match[] = unique.map((e: any) => ({
        id: String(e.idEvent),
        league: e.strLeague || league.name,
        leagueId: String(e.idLeague),
        home: e.strHomeTeam,
        away: e.strAwayTeam,
        homeBadge: e.strHomeTeamBadge || "",
        awayBadge: e.strAwayTeamBadge || "",
        kickoff: e.strTimestamp || e.dateEvent,
        homeScore: e.intHomeScore != null ? Number(e.intHomeScore) : undefined,
        awayScore: e.intAwayScore != null ? Number(e.intAwayScore) : undefined,
        status: e.intHomeScore != null ? "finished" : "upcoming",
        venue: e.strVenue || "",
        city: e.strCity || "",
        odds: deterministicOdds(e.strHomeTeam, e.strAwayTeam),
      }));

      mapped.sort((a, b) => {
        if (a.status === "upcoming" && b.status === "finished") return -1;
        if (a.status === "finished" && b.status === "upcoming") return 1;
        if (a.status === "upcoming") return new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime();
        return new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime();
      });

      // Use fallback if API returned no matching events
      if (mapped.length === 0) {
        setMatches(getBrazilianFallbackMatches(league));
      } else {
        setMatches(mapped);
      }
    } catch {
      const league2 = LEAGUES.find(l => l.id === leagueId)!;
      setMatches(getBrazilianFallbackMatches(league2));
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadMatches(activeLeague); }, [activeLeague, loadMatches]);
  useEffect(() => {
    const iv = setInterval(() => loadMatches(activeLeague), 60000);
    return () => clearInterval(iv);
  }, [activeLeague, loadMatches]);

  const upcomingMatches = matches.filter(m => m.status === "upcoming");
  const finishedMatches = matches.filter(m => m.status === "finished");
  const displayedMatches = viewTab === "proximos" ? upcomingMatches : finishedMatches;

  function selectOdd(match: Match, type: "home" | "draw" | "away") {
    if (!user) {
      toast({ title: "Faça login", description: "Você precisa estar logado para apostar.", variant: "destructive" });
      return;
    }
    const odds = type === "home" ? match.odds.home : type === "draw" ? match.odds.draw : match.odds.away;
    setSelection({ match, type, odds });
    setBetAmount("");
    setBetSuccess(null);
  }

  const potentialWin = selection && betAmount ? (parseFloat(betAmount) * selection.odds) : 0;
  const balance = profile?.balance ?? 0;

  async function placeBet() {
    if (!selection || !betAmount || !user) return;
    const amt = parseFloat(betAmount);
    if (amt <= 0) return;
    if (amt > balance) {
      toast({ title: "Saldo insuficiente", description: "Você não tem saldo suficiente para essa aposta.", variant: "destructive" });
      return;
    }

    setPlacing(true);
    try {
      const { error: balErr } = await supabase.from("profiles").update({ balance: balance - amt }).eq("user_id", user.id);
      if (balErr) throw balErr;

      const { data: bet, error: betErr } = await supabase.from("bets").insert({
        user_id: user.id, ticket_number: "temp", match_id: selection.match.id,
        match_data: { home: selection.match.home, away: selection.match.away, homeBadge: selection.match.homeBadge, awayBadge: selection.match.awayBadge, league: selection.match.league, kickoff: selection.match.kickoff, venue: selection.match.venue, city: selection.match.city, odds: selection.match.odds },
        bet_type: selection.type, odds: selection.odds, amount: amt, potential_win: Number(potentialWin.toFixed(2)),
      }).select().single();

      if (betErr) throw betErr;
      setBetSuccess({ ticket: bet.ticket_number, potentialWin: Number(potentialWin.toFixed(2)) });
      toast({ title: "Aposta realizada!", description: `Bilhete ${bet.ticket_number} criado com sucesso.` });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setPlacing(false);
    }
  }

  const betTypeLabel = (t: string) => t === "home" ? "Casa" : t === "draw" ? "Empate" : "Fora";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 h-14 flex items-center gap-3 px-4 border-b border-border/40 bg-background/80 backdrop-blur-xl shrink-0">
        <Link to="/" className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        {settings?.logo_url && (
          <Link to="/">
            <img src={settings.logo_url} alt="" className="h-7 w-auto object-contain" />
          </Link>
        )}
        <h1 className="text-sm font-bold flex items-center gap-2 flex-1">
          <Trophy className="h-4 w-4 text-primary" /> Futebol
        </h1>
        {user && (
          <button onClick={() => navigate("/tickets")} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary text-xs font-semibold text-foreground">
            <Ticket className="h-3.5 w-3.5 text-primary" /> Meus Bilhetes
          </button>
        )}
      </header>

      {/* Main scrollable content */}
      <main className={`flex-1 overflow-y-auto ${isMobile ? "pb-24" : ""}`}>
        <div className="max-w-4xl mx-auto p-3 sm:p-6 space-y-4">
          <SportsHeroBanner />

          {/* League Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-3 px-3">
            {LEAGUES.map(l => (
              <button
                key={l.id}
                onClick={() => setActiveLeague(l.id)}
                className={`shrink-0 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                  activeLeague === l.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:bg-surface-hover"
                }`}
              >
                {l.country} {l.name}
              </button>
            ))}
          </div>

          {/* View tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewTab("proximos")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                viewTab === "proximos"
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "bg-secondary text-muted-foreground border border-border/30"
              }`}
            >
              ⚽ Próximos ({upcomingMatches.length})
            </button>
            <button
              onClick={() => setViewTab("encerrados")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                viewTab === "encerrados"
                  ? "bg-muted text-foreground border border-border/50"
                  : "bg-secondary text-muted-foreground border border-border/30"
              }`}
            >
              🏁 Encerrados ({finishedMatches.length})
            </button>
          </div>

          {/* Matches */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-28 rounded-xl shimmer" />
              ))}
            </div>
          ) : displayedMatches.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground text-sm">
              {viewTab === "proximos"
                ? "Nenhum jogo próximo encontrado para esta liga."
                : "Nenhum jogo encerrado encontrado para esta liga."}
            </div>
          ) : (
            <div className="space-y-3">
              {displayedMatches.map(m => (
                <div key={m.id} className="rounded-xl border border-border/40 bg-card card-shadow p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{m.league}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                        m.status === "finished" ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary"
                      }`}>
                        {m.status === "finished" ? "Encerrado" : "Próximo"}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" />
                        {new Date(m.kickoff).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <TeamBadge src={m.homeBadge} name={m.home} />
                      <div>
                        <p className="text-sm font-bold text-foreground truncate">{m.home}</p>
                        {m.homeScore != null && <span className="text-lg font-black text-primary">{m.homeScore}</span>}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground px-2">VS</span>
                    <div className="flex items-center gap-2 flex-1 min-w-0 justify-end text-right">
                      <div>
                        <p className="text-sm font-bold text-foreground truncate">{m.away}</p>
                        {m.awayScore != null && <span className="text-lg font-black text-primary">{m.awayScore}</span>}
                      </div>
                      <TeamBadge src={m.awayBadge} name={m.away} />
                    </div>
                  </div>

                  {m.venue && (
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{m.venue}{m.city ? ` • ${m.city}` : ""}</span>
                    </div>
                  )}

                  {m.status === "upcoming" && (
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {(["home", "draw", "away"] as const).map(type => {
                        const val = type === "home" ? m.odds.home : type === "draw" ? m.odds.draw : m.odds.away;
                        const isSelected = selection?.match.id === m.id && selection?.type === type;
                        return (
                          <button
                            key={type}
                            onClick={() => selectOdd(m, type)}
                            className={`rounded-lg border p-2 text-center transition-all ${
                              isSelected
                                ? "bg-primary/20 border-primary text-primary shadow-sm shadow-primary/20"
                                : "bg-secondary border-border/30 hover:bg-primary/10 hover:border-primary/30"
                            }`}
                          >
                            <p className="text-[9px] text-muted-foreground">{betTypeLabel(type)}</p>
                            <p className="text-sm font-bold text-primary">{val.toFixed(2)}</p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Bottom nav for mobile */}
      {isMobile && <BottomNavBar onDeposit={() => {}} />}

      {/* Betslip */}
      {selection && !betSuccess && (
        <div className={`fixed ${isMobile ? "bottom-16" : "bottom-0"} left-0 right-0 z-50 bg-card border-t border-border/40 shadow-2xl rounded-t-2xl p-4 space-y-3 safe-area-bottom`}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Ticket className="h-4 w-4 text-primary" /> Bilhete de Aposta
            </h3>
            <button onClick={() => setSelection(null)} className="p-1 rounded-md hover:bg-secondary text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="bg-secondary/50 rounded-lg p-3 space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase">{selection.match.league}</p>
            <p className="text-xs font-semibold text-foreground">{selection.match.home} vs {selection.match.away}</p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded bg-primary/15 text-primary font-semibold">
                {betTypeLabel(selection.type)} @ {selection.odds.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] text-muted-foreground">Valor da aposta (Saldo: R$ {Number(balance).toFixed(2)})</label>
              <Input
                type="number"
                value={betAmount}
                onChange={e => setBetAmount(e.target.value)}
                placeholder="R$ 0,00"
                min={1}
                max={balance}
                className="bg-secondary border-border/40 h-10 text-sm"
              />
            </div>
            <div className="text-right space-y-0.5 pb-0.5">
              <p className="text-[10px] text-muted-foreground">Retorno potencial</p>
              <p className="text-base font-black text-primary">R$ {potentialWin.toFixed(2)}</p>
            </div>
          </div>

          <div className="flex gap-1.5">
            {[10, 25, 50, 100].map(v => (
              <button
                key={v}
                onClick={() => setBetAmount(String(v))}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  betAmount === String(v) ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border/30 text-foreground"
                }`}
              >
                R${v}
              </button>
            ))}
          </div>

          <Button
            onClick={placeBet}
            disabled={placing || !betAmount || parseFloat(betAmount) <= 0 || parseFloat(betAmount) > balance}
            className="w-full bg-primary text-primary-foreground font-bold h-11 shadow-lg shadow-primary/25"
          >
            {placing ? <Loader2 className="h-4 w-4 animate-spin" /> : `Apostar R$ ${betAmount || "0,00"}`}
          </Button>
        </div>
      )}

      {/* Bet success */}
      {betSuccess && (
        <div className={`fixed ${isMobile ? "bottom-16" : "bottom-0"} left-0 right-0 z-50 bg-card border-t border-border/40 shadow-2xl rounded-t-2xl p-5 space-y-3 safe-area-bottom text-center`}>
          <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
            <CheckCircle className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-base font-bold text-foreground">Aposta Realizada!</h3>
          <div className="bg-secondary/50 rounded-lg p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Número do bilhete</p>
            <p className="text-lg font-black text-primary font-mono">{betSuccess.ticket}</p>
            <p className="text-xs text-muted-foreground">Retorno potencial: <strong className="text-foreground">R$ {betSuccess.potentialWin.toFixed(2)}</strong></p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => { setBetSuccess(null); setSelection(null); }}>
              Continuar Apostando
            </Button>
            <Button className="flex-1 bg-primary text-primary-foreground" onClick={() => navigate("/tickets")}>
              Ver Bilhetes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
