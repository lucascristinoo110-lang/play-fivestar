import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Trophy, Trash2, Loader2, CheckCircle, AlertCircle, Star, Edit3, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Match = {
  id: string;
  external_id: string | null;
  league_name: string;
  league_api_id: string;
  home_team: string;
  away_team: string;
  home_badge: string | null;
  away_badge: string | null;
  kickoff: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  updated_at: string;
  featured_home: boolean;
  featured_sports: boolean;
  custom_odds_home: number | null;
  custom_odds_draw: number | null;
  custom_odds_away: number | null;
};

export default function AdminSportsPage() {
  const { light } = useOutletContext<{ light: boolean }>();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "upcoming" | "finished">("upcoming");
  const [editingOdds, setEditingOdds] = useState<string | null>(null);
  const [oddsForm, setOddsForm] = useState({ home: "", draw: "", away: "" });

  async function loadMatches() {
    setLoading(true);
    const { data } = await supabase
      .from("sports_matches")
      .select("*")
      .order("kickoff", { ascending: true })
      .limit(500);
    if (data) {
      setMatches(data as Match[]);
      const latest = data.reduce((max: string | null, m: any) => {
        if (!max || (m.updated_at && m.updated_at > max)) return m.updated_at;
        return max;
      }, null);
      setLastUpdate(latest);
    }
    setLoading(false);
  }

  useEffect(() => { loadMatches(); }, []);

  async function handleReload() {
    setReloading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Faça login primeiro"); return; }
      const res = await supabase.functions.invoke("reload-sports", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.error) throw new Error(res.error.message);
      const body = res.data;
      if (body?.error) throw new Error(body.error);
      toast.success(`✅ ${body.matches_processed} jogos atualizados!`);
      await loadMatches();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setReloading(false);
    }
  }

  async function handleDeleteOld() {
    const { error } = await supabase.from("sports_matches").delete().eq("status", "finished");
    if (error) { toast.error("Erro ao limpar"); return; }
    toast.success("Jogos encerrados removidos");
    await loadMatches();
  }

  async function toggleFeatured(matchId: string, field: "featured_home" | "featured_sports", current: boolean) {
    const { error } = await supabase.from("sports_matches").update({ [field]: !current }).eq("id", matchId);
    if (error) { toast.error("Erro ao atualizar"); return; }
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, [field]: !current } : m));
    toast.success(!current ? "Destaque ativado" : "Destaque removido");
  }

  function startEditOdds(m: Match) {
    setEditingOdds(m.id);
    setOddsForm({
      home: m.custom_odds_home?.toString() || "",
      draw: m.custom_odds_draw?.toString() || "",
      away: m.custom_odds_away?.toString() || "",
    });
  }

  async function saveOdds(matchId: string) {
    const home = oddsForm.home ? parseFloat(oddsForm.home) : null;
    const draw = oddsForm.draw ? parseFloat(oddsForm.draw) : null;
    const away = oddsForm.away ? parseFloat(oddsForm.away) : null;

    const { error } = await supabase.from("sports_matches").update({
      custom_odds_home: home,
      custom_odds_draw: draw,
      custom_odds_away: away,
    }).eq("id", matchId);

    if (error) { toast.error("Erro ao salvar odds"); return; }
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, custom_odds_home: home, custom_odds_draw: draw, custom_odds_away: away } : m));
    setEditingOdds(null);
    toast.success("Super Odds salvas!");
  }

  const filtered = matches.filter(m => filter === "all" || m.status === filter);
  const leagues = [...new Set(filtered.map(m => m.league_name))];

  const featuredHomeCount = matches.filter(m => m.featured_home).length;
  const featuredSportsCount = matches.filter(m => m.featured_sports).length;
  const customOddsCount = matches.filter(m => m.custom_odds_home != null).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className={cn("text-xl font-bold", light ? "text-slate-800" : "text-white")}>
            <Trophy className="inline h-5 w-5 mr-2 text-primary" />
            Gerenciar Esportes
          </h2>
          <p className={cn("text-sm mt-1", light ? "text-slate-500" : "text-slate-400")}>
            {lastUpdate ? `Última atualização: ${new Date(lastUpdate).toLocaleString("pt-BR")}` : "Nenhuma atualização ainda"}
            {" • "}Atualização automática diária às 06:00
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleDeleteOld} variant="outline" size="sm" className={cn(light ? "border-slate-200" : "border-slate-700")}>
            <Trash2 className="h-4 w-4 mr-1" /> Limpar encerrados
          </Button>
          <Button onClick={handleReload} disabled={reloading} size="sm" className="bg-primary text-primary-foreground">
            {reloading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            {reloading ? "Recarregando..." : "Recarregar Jogos"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { label: "Total", value: matches.length, color: "text-primary" },
          { label: "Próximos", value: matches.filter(m => m.status === "upcoming").length, color: "text-emerald-500" },
          { label: "Encerrados", value: matches.filter(m => m.status === "finished").length, color: "text-muted-foreground" },
          { label: "Home ⭐", value: featuredHomeCount, color: "text-amber-500" },
          { label: "Esportes ⭐", value: featuredSportsCount, color: "text-blue-500" },
          { label: "Super Odds", value: customOddsCount, color: "text-purple-500" },
        ].map(s => (
          <div key={s.label} className={cn("rounded-xl p-4 text-center", light ? "bg-white border border-slate-200" : "bg-slate-800/50 border border-slate-700/40")}>
            <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
            <p className={cn("text-xs", light ? "text-slate-500" : "text-slate-400")}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(["upcoming", "finished", "all"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
            filter === f ? "bg-primary text-primary-foreground" : light ? "bg-slate-100 text-slate-600" : "bg-slate-800 text-slate-400"
          )}>
            {f === "upcoming" ? "Próximos" : f === "finished" ? "Encerrados" : "Todos"}
          </button>
        ))}
      </div>

      {/* Matches by league */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className={cn("text-center py-20 rounded-xl border", light ? "bg-white border-slate-200 text-slate-500" : "bg-slate-800/50 border-slate-700/40 text-slate-400")}>
          <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium">Nenhum jogo encontrado</p>
          <p className="text-xs mt-1">Clique em "Recarregar Jogos" para buscar as partidas</p>
        </div>
      ) : (
        <div className="space-y-6">
          {leagues.map(league => {
            const leagueMatches = filtered.filter(m => m.league_name === league);
            return (
              <div key={league}>
                <h3 className={cn("text-sm font-bold mb-2 flex items-center gap-2", light ? "text-slate-700" : "text-slate-200")}>
                  ⚽ {league}
                  <span className={cn("text-xs font-normal px-2 py-0.5 rounded-full", light ? "bg-slate-100 text-slate-500" : "bg-slate-700 text-slate-400")}>
                    {leagueMatches.length} jogos
                  </span>
                </h3>
                <div className={cn("rounded-xl border overflow-hidden", light ? "bg-white border-slate-200" : "bg-slate-800/50 border-slate-700/40")}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={cn("text-xs", light ? "bg-slate-50 text-slate-500" : "bg-slate-900/40 text-slate-500")}>
                          <th className="text-left px-3 py-2">Partida</th>
                          <th className="text-center px-3 py-2">Data/Hora</th>
                          <th className="text-center px-3 py-2">Placar</th>
                          <th className="text-center px-3 py-2">Status</th>
                          <th className="text-center px-2 py-2">Home</th>
                          <th className="text-center px-2 py-2">Esportes</th>
                          <th className="text-center px-3 py-2">Super Odds</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leagueMatches.map(m => (
                          <tr key={m.id} className={cn("border-t", light ? "border-slate-100" : "border-slate-700/30")}>
                            <td className="px-3 py-2.5">
                              <span className={cn("font-medium", light ? "text-slate-800" : "text-white")}>{m.home_team}</span>
                              <span className="text-muted-foreground mx-1">vs</span>
                              <span className={cn("font-medium", light ? "text-slate-800" : "text-white")}>{m.away_team}</span>
                            </td>
                            <td className="px-3 py-2.5 text-center text-xs text-muted-foreground">
                              {new Date(m.kickoff).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            </td>
                            <td className="px-3 py-2.5 text-center text-xs font-bold">
                              {m.home_score != null ? `${m.home_score} x ${m.away_score}` : "-"}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {m.status === "upcoming" ? (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold">
                                  <CheckCircle className="h-3 w-3" /> Próximo
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 font-semibold">Encerrado</span>
                              )}
                            </td>
                            <td className="px-2 py-2.5 text-center">
                              <button onClick={() => toggleFeatured(m.id, "featured_home", m.featured_home)} title="Destaque na Home">
                                <Star className={cn("h-4 w-4 transition-colors", m.featured_home ? "fill-amber-500 text-amber-500" : "text-slate-500 hover:text-amber-400")} />
                              </button>
                            </td>
                            <td className="px-2 py-2.5 text-center">
                              <button onClick={() => toggleFeatured(m.id, "featured_sports", m.featured_sports)} title="Destaque nos Esportes">
                                <Star className={cn("h-4 w-4 transition-colors", m.featured_sports ? "fill-blue-500 text-blue-500" : "text-slate-500 hover:text-blue-400")} />
                              </button>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {editingOdds === m.id ? (
                                <div className="flex items-center gap-1">
                                  <Input value={oddsForm.home} onChange={e => setOddsForm(p => ({ ...p, home: e.target.value }))} placeholder="Casa" className="w-16 h-7 text-xs text-center" />
                                  <Input value={oddsForm.draw} onChange={e => setOddsForm(p => ({ ...p, draw: e.target.value }))} placeholder="Emp" className="w-16 h-7 text-xs text-center" />
                                  <Input value={oddsForm.away} onChange={e => setOddsForm(p => ({ ...p, away: e.target.value }))} placeholder="Fora" className="w-16 h-7 text-xs text-center" />
                                  <button onClick={() => saveOdds(m.id)} className="text-emerald-500 hover:text-emerald-400"><Save className="h-4 w-4" /></button>
                                  <button onClick={() => setEditingOdds(null)} className="text-slate-500 hover:text-slate-400"><X className="h-4 w-4" /></button>
                                </div>
                              ) : (
                                <button onClick={() => startEditOdds(m)} className="inline-flex items-center gap-1 text-xs" title="Editar Super Odds">
                                  {m.custom_odds_home != null ? (
                                    <span className="text-purple-400 font-semibold">
                                      {m.custom_odds_home} / {m.custom_odds_draw} / {m.custom_odds_away}
                                    </span>
                                  ) : (
                                    <span className="text-slate-500">—</span>
                                  )}
                                  <Edit3 className="h-3 w-3 text-slate-500 hover:text-primary" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
