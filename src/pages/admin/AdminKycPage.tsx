import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, ExternalLink, Eye, X } from "lucide-react";

export default function AdminKycPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => { fetchDocs(); }, []);

  async function fetchDocs() {
    const { data } = await supabase.from("kyc_documents").select("*").order("created_at", { ascending: false });
    const docs = data || [];
    if (docs.length > 0) {
      const userIds = [...new Set(docs.map(d => d.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, email").in("user_id", userIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
      docs.forEach((d: any) => { d.profiles = profileMap[d.user_id] || null; });
    }
    setDocs(docs);
    if (data && data.length > 0) {
      const urls: Record<string, string> = {};
      for (const doc of data) {
        const path = doc.file_url;
        if (path.startsWith("http")) {
          urls[doc.id] = path;
        } else {
          const { data: signedData } = await supabase.storage.from("kyc-documents").createSignedUrl(path, 3600);
          if (signedData?.signedUrl) urls[doc.id] = signedData.signedUrl;
        }
      }
      setSignedUrls(urls);
    }
  }

  async function updateDoc(id: string, status: string, userId?: string) {
    await supabase.from("kyc_documents").update({ status }).eq("id", id);
    if (status === "approved" && userId) {
      await supabase.from("profiles").update({ kyc_verified: true }).eq("user_id", userId);
    }
    toast({ title: `Documento ${status === "approved" ? "aprovado" : "rejeitado"}` });
    fetchDocs();
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground">Verificação de Documentos (KYC)</h2>
      <div className="rounded-xl bg-card border border-border/40 card-shadow overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/40 text-muted-foreground">
              <th className="text-left p-3 font-medium">Usuário</th>
              <th className="text-left p-3 font-medium">Tipo</th>
              <th className="text-left p-3 font-medium">Documento</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Data</th>
              <th className="text-left p-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {docs.map(d => (
              <tr key={d.id} className="border-b border-border/20 hover:bg-surface-hover transition-colors">
                <td className="p-3 text-foreground">{(d as any).profiles?.display_name || "—"}</td>
                <td className="p-3 text-foreground uppercase font-mono">{d.document_type}</td>
                <td className="p-3">
                  {signedUrls[d.id] ? (
                    <img
                      src={signedUrls[d.id]}
                      alt="Documento"
                      className="h-12 w-16 object-cover rounded border border-border/40 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setPreviewUrl(signedUrls[d.id])}
                    />
                  ) : (
                    <span className="text-muted-foreground text-[10px]">Carregando...</span>
                  )}
                </td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${d.status === "approved" ? "bg-primary/15 text-primary" : d.status === "rejected" ? "bg-destructive/15 text-destructive" : "bg-accent/15 text-accent"}`}>
                    {d.status}
                  </span>
                </td>
                <td className="p-3 text-muted-foreground">{new Date(d.created_at).toLocaleString("pt-BR")}</td>
                <td className="p-3 flex gap-1">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => signedUrls[d.id] && setPreviewUrl(signedUrls[d.id])} disabled={!signedUrls[d.id]}>
                    <Eye className="h-3 w-3" />
                  </Button>
                  <a href={signedUrls[d.id] || "#"} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={!signedUrls[d.id]}><ExternalLink className="h-3 w-3" /></Button>
                  </a>
                  {d.status === "pending" && (
                    <>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => updateDoc(d.id, "approved", d.user_id)}>
                        <CheckCircle className="h-3 w-3 text-primary" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => updateDoc(d.id, "rejected")}>
                        <XCircle className="h-3 w-3 text-destructive" />
                      </Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {docs.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Nenhum documento encontrado.</p>}
      </div>

      {/* Fullscreen preview modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={e => e.stopPropagation()}>
            <Button
              size="sm"
              variant="ghost"
              className="absolute -top-10 right-0 text-white hover:text-white/80"
              onClick={() => setPreviewUrl(null)}
            >
              <X className="h-5 w-5" /> Fechar
            </Button>
            <img src={previewUrl} alt="Documento" className="w-full h-full object-contain rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
}
