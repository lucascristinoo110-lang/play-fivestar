import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Edit2, Trash2, Save, Loader2 } from "lucide-react";
import GamePickerForSection from "./GamePickerForSection";

type HomeSection = {
  id: string;
  title: string;
  subtitle: string;
  section_type: string;
  filter_category: string | null;
  filter_is_hot: boolean;
  filter_is_new: boolean;
  curated_game_codes: string[];
  sort_order: number;
  is_active: boolean;
  max_games: number;
};

const CATEGORIES = [
  { value: "slots", label: "Slots" },
  { value: "crash", label: "Crash" },
  { value: "live", label: "Cassino ao Vivo" },
  { value: "table", label: "Mesa" },
  { value: "roulette", label: "Roletas" },
  { value: "fish", label: "Fish" },
  { value: "arcade", label: "Arcade" },
  { value: "virtual", label: "Virtual" },
  { value: "bingo", label: "Bingo" },
  { value: "pgsoft", label: "PG Soft" },
  { value: "evolution", label: "Evolution" },
];

function SortableRow({ section, light, onEdit, onDelete, onToggle }: {
  section: HomeSection;
  light: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (active: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 border-b transition-colors",
        light ? "border-gray-100 hover:bg-gray-50" : "border-border/20 hover:bg-secondary/30",
        !section.is_active && "opacity-50"
      )}
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 touch-none">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-semibold truncate", light ? "text-gray-900" : "text-foreground")}>{section.title}</p>
        <p className={cn("text-[11px] truncate", light ? "text-gray-400" : "text-muted-foreground")}>
          {section.section_type === "curated"
            ? `Curadoria · ${section.curated_game_codes?.length || 0} jogos`
            : `Filtro · ${section.filter_category || (section.filter_is_hot ? "Hot" : section.filter_is_new ? "Novos" : "Todos")}`}
          {" · Máx: "}{section.max_games}
        </p>
      </div>

      <Switch checked={section.is_active} onCheckedChange={onToggle} />

      <button onClick={onEdit} className={cn("p-1.5 rounded", light ? "hover:bg-gray-100" : "hover:bg-secondary")}>
        <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      <button onClick={onDelete} className="p-1.5 rounded hover:bg-destructive/10">
        <Trash2 className="h-3.5 w-3.5 text-destructive" />
      </button>
    </div>
  );
}

export default function AdminSectionsManager({ light }: { light: boolean }) {
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [allGames, setAllGames] = useState<{ id: string; name: string; image_url: string | null; game_code: string | null; provider: string; category: string; is_active: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editSection, setEditSection] = useState<Partial<HomeSection> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => { loadSections(); }, []);

  async function loadSections() {
    setLoading(true);
    const [{ data }, { data: gamesData }] = await Promise.all([
      supabase.from("home_sections").select("*").order("sort_order"),
      supabase.from("games").select("id, name, image_url, game_code, provider, category, is_active").order("name"),
    ]);
    setSections((data as any[] || []).map((s: any) => ({
      id: s.id,
      title: s.title,
      subtitle: s.subtitle || "",
      section_type: s.section_type || "filter",
      filter_category: s.filter_category,
      filter_is_hot: s.filter_is_hot || false,
      filter_is_new: s.filter_is_new || false,
      curated_game_codes: s.curated_game_codes || [],
      sort_order: s.sort_order || 0,
      is_active: s.is_active ?? true,
      max_games: s.max_games || 12,
    })));
    setAllGames((gamesData as any[]) || []);
    setLoading(false);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(sections, oldIndex, newIndex);

    setSections(reordered);

    // Save new order
    await Promise.all(
      reordered.map((s, i) =>
        supabase.from("home_sections").update({ sort_order: i }).eq("id", s.id)
      )
    );
    toast({ title: "Ordem atualizada!" });
  }

  async function toggleActive(id: string, active: boolean) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, is_active: active } : s)));
    await supabase.from("home_sections").update({ is_active: active }).eq("id", id);
    toast({ title: active ? "Seção ativada" : "Seção desativada" });
  }

  async function saveSection() {
    if (!editSection?.title) return;
    setSaving(true);

    const payload = {
      title: editSection.title,
      subtitle: editSection.subtitle || "",
      section_type: editSection.section_type || "filter",
      filter_category: editSection.section_type === "filter" ? (editSection.filter_category || null) : null,
      filter_is_hot: editSection.section_type === "filter" ? (editSection.filter_is_hot || false) : false,
      filter_is_new: editSection.section_type === "filter" ? (editSection.filter_is_new || false) : false,
      curated_game_codes: editSection.section_type === "curated" ? (editSection.curated_game_codes || []) : [],
      max_games: editSection.max_games || 12,
      is_active: editSection.is_active ?? true,
    };

    if (editSection.id) {
      await supabase.from("home_sections").update(payload).eq("id", editSection.id);
    } else {
      const maxOrder = sections.length > 0 ? Math.max(...sections.map((s) => s.sort_order)) + 1 : 0;
      await supabase.from("home_sections").insert({ ...payload, sort_order: maxOrder });
    }

    setSaving(false);
    setShowForm(false);
    setEditSection(null);
    toast({ title: "Seção salva!" });
    loadSections();
  }

  async function deleteSection(id: string) {
    await supabase.from("home_sections").delete().eq("id", id);
    toast({ title: "Seção removida" });
    loadSections();
  }

  const cardClass = cn("rounded-xl border overflow-hidden", light ? "bg-white border-gray-200 shadow-sm" : "bg-card border-border/40 card-shadow");
  const inputClass = cn("h-9 text-sm", light ? "bg-gray-50 border-gray-200" : "bg-secondary border-border/40");
  const selectClass = cn("h-9 w-full rounded-md border text-sm px-3", light ? "bg-gray-50 border-gray-200 text-gray-900" : "bg-secondary border-border/40 text-foreground");

  if (loading) return <p className="text-sm text-muted-foreground">Carregando seções...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={cn("text-sm font-semibold", light ? "text-gray-900" : "text-foreground")}>Seções da Home</h2>
          <p className={cn("text-[11px]", light ? "text-gray-400" : "text-muted-foreground")}>
            Arraste para reordenar. Use o toggle para ativar/desativar seções.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditSection({ section_type: "filter", is_active: true, max_games: 12 });
            setShowForm(true);
          }}
          className="bg-primary text-primary-foreground text-xs h-8"
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Nova Seção
        </Button>
      </div>

      <div className={cardClass}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            {sections.map((section) => (
              <SortableRow
                key={section.id}
                section={section}
                light={light}
                onEdit={() => { setEditSection(section); setShowForm(true); }}
                onDelete={() => deleteSection(section.id)}
                onToggle={(active) => toggleActive(section.id, active)}
              />
            ))}
          </SortableContext>
        </DndContext>
        {sections.length === 0 && (
          <p className={cn("p-6 text-center text-sm", light ? "text-gray-400" : "text-muted-foreground")}>
            Nenhuma seção criada.
          </p>
        )}
      </div>

      {/* Edit/Add Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); setEditSection(null); } }}>
        <DialogContent className={cn("max-w-lg", light ? "bg-white" : "bg-card border-border/40")}>
          <DialogHeader>
            <DialogTitle className={light ? "text-gray-900" : "text-foreground"}>
              {editSection?.id ? "Editar Seção" : "Nova Seção"}
            </DialogTitle>
          </DialogHeader>
          {editSection && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Título</Label>
                  <Input
                    value={editSection.title || ""}
                    onChange={(e) => setEditSection({ ...editSection, title: e.target.value })}
                    placeholder="Ex: 🔥 Mais Jogados"
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Subtítulo</Label>
                  <Input
                    value={editSection.subtitle || ""}
                    onChange={(e) => setEditSection({ ...editSection, subtitle: e.target.value })}
                    placeholder="Descrição curta"
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tipo</Label>
                  <select
                    value={editSection.section_type || "filter"}
                    onChange={(e) => setEditSection({ ...editSection, section_type: e.target.value })}
                    className={selectClass}
                  >
                    <option value="filter">Filtro automático</option>
                    <option value="curated">Curadoria manual</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Máx. jogos</Label>
                  <Input
                    type="number"
                    value={editSection.max_games ?? 12}
                    onChange={(e) => setEditSection({ ...editSection, max_games: parseInt(e.target.value) || 12 })}
                    className={inputClass}
                  />
                </div>
              </div>

              {editSection.section_type === "filter" && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Filtrar por categoria</Label>
                    <select
                      value={editSection.filter_category || ""}
                      onChange={(e) => setEditSection({ ...editSection, filter_category: e.target.value || null })}
                      className={selectClass}
                    >
                      <option value="">Sem filtro de categoria</option>
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editSection.filter_is_hot || false}
                        onChange={(e) => setEditSection({ ...editSection, filter_is_hot: e.target.checked })}
                      /> 🔥 Apenas Hot
                    </label>
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editSection.filter_is_new || false}
                        onChange={(e) => setEditSection({ ...editSection, filter_is_new: e.target.checked })}
                      /> ✨ Apenas Novos
                    </label>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs">
                  {editSection.section_type === "curated" ? "Jogos da seção" : "Jogos adicionais (além do filtro automático)"}
                </Label>
                <GamePickerForSection
                  allGames={allGames}
                  selectedCodes={editSection.curated_game_codes || []}
                  onCodesChange={(codes) => setEditSection({ ...editSection, curated_game_codes: codes })}
                  light={light}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={editSection.is_active ?? true}
                  onCheckedChange={(checked) => setEditSection({ ...editSection, is_active: checked })}
                />
                <Label className="text-xs">Seção ativa</Label>
              </div>

              <Button onClick={saveSection} disabled={saving} className="w-full bg-primary text-primary-foreground text-sm">
                {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                {editSection.id ? "Salvar Alterações" : "Criar Seção"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
