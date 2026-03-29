import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Search, UserPlus, Trash2, Eye, Shield } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function AdminAdministratorsPage() {
  const { light } = useOutletContext<{ light: boolean }>();
  const [viewers, setViewers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadViewers();
    loadUsers();
  }, []);

  async function loadViewers() {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("*")
      .eq("role", "viewer" as any);
    if (!roles) return setViewers([]);

    const userIds = roles.map((r: any) => r.user_id);
    if (userIds.length === 0) return setViewers([]);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("user_id", userIds);

    setViewers(
      roles.map((r: any) => ({
        ...r,
        profile: profiles?.find((p: any) => p.user_id === r.user_id),
      }))
    );
  }

  async function loadUsers() {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setAllUsers(data || []);
  }

  async function addViewer(userId: string) {
    setLoading(true);
    const { error } = await supabase.from("user_roles").insert({
      user_id: userId,
      role: "viewer" as any,
    });
    setLoading(false);
    if (error) {
      if (error.code === "23505") toast({ title: "Usuário já é visualizador", variant: "destructive" });
      else toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Visualizador adicionado!" });
      loadViewers();
    }
  }

  async function removeViewer(roleId: string) {
    const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Acesso removido!" });
      loadViewers();
    }
  }

  const viewerUserIds = viewers.map((v: any) => v.user_id);
  const filteredUsers = allUsers.filter(
    (u: any) =>
      !viewerUserIds.includes(u.user_id) &&
      (u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.cpf?.includes(search))
  );

  return (
    <div className="space-y-6">
      {/* Current viewers */}
      <div className={cn("rounded-xl border p-6 space-y-4", light ? "bg-white border-slate-200/60" : "bg-[#1a2236] border-slate-700/40")}>
        <h2 className={cn("text-sm font-semibold flex items-center gap-2", light ? "text-slate-800" : "text-white")}>
          <Eye className="h-4 w-4 text-primary" />
          Visualizadores Ativos
        </h2>
        <p className={cn("text-xs", light ? "text-slate-500" : "text-slate-400")}>
          Esses usuários podem acessar o painel admin apenas para visualização. O Gateway BSPAY fica totalmente bloqueado.
        </p>

        {viewers.length === 0 ? (
          <p className={cn("text-sm py-4", light ? "text-slate-400" : "text-slate-500")}>Nenhum visualizador adicionado.</p>
        ) : (
          <div className="space-y-2">
            {viewers.map((v: any) => (
              <div
                key={v.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border",
                  light ? "bg-slate-50 border-slate-200/60" : "bg-slate-800/50 border-slate-700/40"
                )}
              >
                <div>
                  <p className={cn("text-sm font-medium", light ? "text-slate-800" : "text-white")}>
                    {v.profile?.display_name || "Sem nome"}
                  </p>
                  <p className={cn("text-xs", light ? "text-slate-500" : "text-slate-400")}>
                    {v.profile?.email || "—"} · CPF: {v.profile?.cpf || "—"}
                  </p>
                </div>
                <Button size="sm" variant="destructive" onClick={() => removeViewer(v.id)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Remover
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add viewer */}
      <div className={cn("rounded-xl border p-6 space-y-4", light ? "bg-white border-slate-200/60" : "bg-[#1a2236] border-slate-700/40")}>
        <h2 className={cn("text-sm font-semibold flex items-center gap-2", light ? "text-slate-800" : "text-white")}>
          <UserPlus className="h-4 w-4 text-primary" />
          Adicionar Visualizador
        </h2>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por email, nome ou CPF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn("pl-9 h-9 text-sm", light ? "bg-slate-50 border-slate-200" : "bg-secondary border-border/40")}
          />
        </div>

        {search.length >= 2 && (
          <div className="max-h-60 overflow-y-auto space-y-1">
            {filteredUsers.slice(0, 20).map((u: any) => (
              <div
                key={u.id}
                className={cn(
                  "flex items-center justify-between p-2.5 rounded-lg border",
                  light ? "bg-slate-50 border-slate-100 hover:bg-slate-100" : "bg-slate-800/30 border-slate-700/30 hover:bg-slate-700/40"
                )}
              >
                <div>
                  <p className={cn("text-sm", light ? "text-slate-800" : "text-white")}>{u.display_name || "Sem nome"}</p>
                  <p className={cn("text-xs", light ? "text-slate-500" : "text-slate-400")}>{u.email}</p>
                </div>
                <Button size="sm" disabled={loading} onClick={() => addViewer(u.user_id)}>
                  <UserPlus className="h-3.5 w-3.5 mr-1" />
                  Adicionar
                </Button>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <p className={cn("text-xs py-2", light ? "text-slate-400" : "text-slate-500")}>Nenhum usuário encontrado.</p>
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className={cn("rounded-xl border p-4 text-xs space-y-1", light ? "bg-blue-50 border-blue-100 text-blue-700" : "bg-blue-500/10 border-blue-500/20 text-blue-300")}>
        <p className="font-semibold flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Permissões do Visualizador</p>
        <ul className="list-disc list-inside space-y-0.5 opacity-80">
          <li>Pode acessar todas as abas do painel admin</li>
          <li>Pode visualizar dados, relatórios e estatísticas</li>
          <li>NÃO pode editar, salvar ou alterar nenhuma configuração</li>
          <li>Gateway BSPAY fica totalmente BLOQUEADO (sem visualização)</li>
        </ul>
      </div>
    </div>
  );
}
