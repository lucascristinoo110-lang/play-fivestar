import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useOutletContext } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Upload, Trash2, Plus, GripVertical, Megaphone, Save, Image } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableBannerItem({ banner, light, onToggle, onDelete }: {
  banner: any;
  light: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: banner.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("flex items-center gap-4 p-4", light ? "hover:bg-gray-50" : "hover:bg-surface-hover")}
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none">
        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>
      <img src={banner.image_url} alt={banner.title} className="h-14 w-24 object-cover rounded-lg shrink-0" />
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium truncate", light ? "text-gray-900" : "text-foreground")}>{banner.title}</p>
        <p className={cn("text-[10px] truncate", light ? "text-gray-400" : "text-muted-foreground")}>{banner.link_url || "Sem link"}</p>
      </div>
      <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2" onClick={onToggle}>
        {banner.is_active ? "Desativar" : "Ativar"}
      </Button>
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={onDelete}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export default function AdminBannersPage() {
  const { light } = useOutletContext<{ light: boolean }>();
  const [banners, setBanners] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [placement, setPlacement] = useState("home");
  const [activePlacement, setActivePlacement] = useState("home");

  const [promoMsg, setPromoMsg] = useState("");
  const [promoActive, setPromoActive] = useState(false);
  const [settingsId, setSettingsId] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    loadBanners();
    loadSettings();
  }, [activePlacement]);

  async function loadBanners() {
    const { data } = await supabase.from("promo_banners").select("*").eq("placement", activePlacement).order("sort_order");
    setBanners(data || []);
  }

  async function loadSettings() {
    const { data } = await supabase.from("site_settings").select("id, promo_message, promo_message_active").limit(1).single();
    if (data) {
      setSettingsId(data.id);
      setPromoMsg(data.promo_message || "");
      setPromoActive(data.promo_message_active || false);
    }
  }

  async function addBanner() {
    if (!file || !title) return;
    setUploading(true);

    const ext = file.name.split(".").pop() || "jpg";
    const path = `banner-${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("site-assets").upload(path, file, { upsert: true });
    if (uploadErr) {
      toast({ title: "Erro no upload", description: uploadErr.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("site-assets").getPublicUrl(path);

    await supabase.from("promo_banners").insert({
      title,
      image_url: publicUrl,
      link_url: linkUrl || null,
      sort_order: banners.length,
      placement,
    });

    toast({ title: "Banner adicionado!" });
    setTitle("");
    setLinkUrl("");
    setFile(null);
    setUploading(false);
    loadBanners();
  }

  async function deleteBanner(id: string) {
    await supabase.from("promo_banners").delete().eq("id", id);
    toast({ title: "Banner removido" });
    loadBanners();
  }

  async function toggleBanner(banner: any) {
    await supabase.from("promo_banners").update({ is_active: !banner.is_active }).eq("id", banner.id);
    loadBanners();
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = banners.findIndex((b) => b.id === active.id);
    const newIndex = banners.findIndex((b) => b.id === over.id);
    const reordered = arrayMove(banners, oldIndex, newIndex);
    setBanners(reordered);

    // Persist new order
    await Promise.all(
      reordered.map((b, i) =>
        supabase.from("promo_banners").update({ sort_order: i }).eq("id", b.id)
      )
    );
    toast({ title: "Ordem atualizada!" });
  }

  async function savePromo() {
    if (!settingsId) return;
    await supabase.from("site_settings").update({
      promo_message: promoMsg,
      promo_message_active: promoActive,
    }).eq("id", settingsId);
    toast({ title: "Faixa promocional salva!" });
  }

  const sectionClass = cn("rounded-xl border p-6 space-y-4", light ? "bg-white border-gray-200 shadow-sm" : "bg-card border-border/40 card-shadow");

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Promo Message */}
      <div className={sectionClass}>
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-primary" />
          <h2 className={cn("text-sm font-semibold", light ? "text-gray-900" : "text-foreground")}>Faixa Promocional (Topo do Site)</h2>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Mensagem</Label>
            <Input value={promoMsg} onChange={e => setPromoMsg(e.target.value)} placeholder="🎁 Bônus de 100% no primeiro depósito!" className={cn("h-9 text-sm", light ? "bg-gray-50 border-gray-200" : "bg-secondary border-border/40")} />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" checked={promoActive} onChange={e => setPromoActive(e.target.checked)} className="rounded" />
            <Label className="text-xs">Ativar faixa promocional</Label>
          </div>
          <Button size="sm" onClick={savePromo} className="bg-primary text-primary-foreground text-xs">
            <Save className="h-3.5 w-3.5 mr-1.5" /> Salvar
          </Button>
        </div>
      </div>

      {/* Placement Tabs */}
      <div className="flex gap-2">
        {[
          { key: "home", label: "🏠 Home (Cassino)" },
          { key: "sports", label: "⚽ Esportes (Carrossel)" },
          { key: "sports_side", label: "📐 Esportes (Lateral)" },
        ].map(p => (
          <button
            key={p.key}
            onClick={() => setActivePlacement(p.key)}
            className={cn("px-4 py-2 rounded-lg text-xs font-semibold transition-all",
              activePlacement === p.key
                ? light ? "bg-blue-600 text-white" : "bg-primary text-primary-foreground"
                : light ? "bg-gray-100 text-gray-500" : "bg-secondary text-muted-foreground"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Add Banner */}
      <div className={sectionClass}>
        <h2 className={cn("text-sm font-semibold", light ? "text-gray-900" : "text-foreground")}>Adicionar Banner Rotativo</h2>
        <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-[11px]", light ? "bg-blue-50 text-blue-700" : "bg-primary/10 text-primary")}>
          <span>📐</span>
          <span><strong>Tamanho ideal:</strong> 1280 × 400 px (proporção 16:5) — Use imagens nessa dimensão para melhor exibição no carrossel.</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Título</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Promoção de Natal" className={cn("h-9 text-sm", light ? "bg-gray-50 border-gray-200" : "bg-secondary border-border/40")} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Link (opcional)</Label>
            <Input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." className={cn("h-9 text-sm", light ? "bg-gray-50 border-gray-200" : "bg-secondary border-border/40")} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Imagem</Label>
            <Input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} className={cn("h-9 text-sm", light ? "bg-gray-50 border-gray-200" : "bg-secondary border-border/40")} />
          </div>
        </div>
        <Button size="sm" onClick={addBanner} disabled={uploading || !file || !title} className="bg-primary text-primary-foreground text-xs">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> {uploading ? "Enviando..." : "Adicionar Banner"}
        </Button>
      </div>

      {/* Banner List with Drag & Drop */}
      <div className={cn("rounded-xl border overflow-hidden", light ? "bg-white border-gray-200 shadow-sm" : "bg-card border-border/40 card-shadow")}>
        <div className={cn("p-4 border-b", light ? "border-gray-200" : "border-border/40")}>
          <h2 className={cn("text-sm font-semibold", light ? "text-gray-900" : "text-foreground")}>Banners ({banners.length}) — Arraste para reordenar</h2>
        </div>
        {banners.length === 0 ? (
          <p className={cn("p-6 text-center text-sm", light ? "text-gray-400" : "text-muted-foreground")}>Nenhum banner cadastrado.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={banners.map(b => b.id)} strategy={verticalListSortingStrategy}>
              <div className="divide-y divide-border/20">
                {banners.map(b => (
                  <SortableBannerItem
                    key={b.id}
                    banner={b}
                    light={light}
                    onToggle={() => toggleBanner(b)}
                    onDelete={() => deleteBanner(b.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
