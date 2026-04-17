import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  BadgeCheck, Shield, MapPin, Plus, Trash2, Eye, EyeOff,
  Building2, FileText, LogOut, Globe, AlertTriangle, Pencil,
  Clock, CheckCircle2, Upload, Image as ImageIcon, Video,
  Instagram, Youtube, Facebook, Twitter, Users, Settings,
  Film, X, ExternalLink, Link2, Key
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import type { Novedad } from "@/components/feed/NovedadCard";
import { apiUrl, resolveMediaUrl } from "@/lib/apiBase";

// ─── TYPES ────────────────────────────────────────────────────────────────────

type PublicEntity = {
  id: string; name: string; entityType: string;
  logo?: string | null; banner?: string | null; description?: string | null;
  provinciaId?: string | null; municipioName?: string | null; address?: string | null;
  responsibleName?: string | null; responsibleTitle?: string | null;
  verificationStatus: string; institutionalEmail?: string | null;
  website?: string | null; phone?: string | null;
  facebook?: string | null; instagram?: string | null; twitter?: string | null;
  tiktok?: string | null; youtube?: string | null;
};

type Secretaria = {
  id: string; entityId: string; name: string; area?: string | null;
  description?: string | null; logo?: string | null; userId?: string | null; isActive: boolean;
};

type NovedadRich = Omit<import("@/components/feed/NovedadCard").Novedad, "secretariaId"> & {
  secretariaId?: string | null;
  secretariaName?: string | null;
};

type OfficialMe = {
  user: { id: string; email: string; username: string; role: string };
  entity: PublicEntity;
  secretaria: Secretaria | null;
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  health: "Salud", tourism: "Turismo", culture: "Cultura", events: "Eventos",
  education: "Educación", environment: "Ambiente", fashion: "Moda",
  launch: "Lanzamiento", promo: "Promoción", news: "Noticias", campaign: "Campaña", other: "Otro",
};
const ENTITY_TYPE_LABELS: Record<string, string> = {
  municipality: "Municipalidad", province: "Provincia", ministry: "Ministerio",
  secretaria: "Secretaría", organism: "Organismo",
};
const CONTENT_TYPE_LABELS: Record<string, string> = {
  card: "Tarjeta", campaign: "Campaña", event: "Evento", tourism: "Turismo",
  news: "Noticia", season: "Temporada", launch: "Lanzamiento",
};
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  active:   { label: "Activa",    color: "bg-green-100 text-green-700 border-green-200",  icon: <CheckCircle2 className="h-3 w-3" /> },
  draft:    { label: "Borrador",  color: "bg-zinc-100 text-zinc-600 border-zinc-200",     icon: <FileText className="h-3 w-3" /> },
  archived: { label: "Archivada", color: "bg-gray-100 text-gray-600 border-gray-200",     icon: <EyeOff className="h-3 w-3" /> },
  expired:  { label: "Expirada",  color: "bg-red-100 text-red-600 border-red-200",        icon: <Clock className="h-3 w-3" /> },
};
const VERIFICATION_BADGE: Record<string, { label: string; color: string }> = {
  verified:        { label: "Verificado ✓",  color: "text-blue-600 bg-blue-50 border-blue-200" },
  pending:         { label: "En revisión",   color: "text-yellow-700 bg-yellow-50 border-yellow-200" },
  rejected:        { label: "Rechazado",     color: "text-red-600 bg-red-50 border-red-200" },
  suspended:       { label: "Suspendido",    color: "text-orange-700 bg-orange-50 border-orange-200" },
  renewal_pending: { label: "Renovar",       color: "text-blue-700 bg-blue-50 border-blue-200" },
};

const EMPTY_FORM = {
  title: "", summary: "", description: "", image: "", videoUrl: "",
  category: "news", contentType: "card", link: "",
  provinciaId: "", municipioName: "", status: "active" as const, isFeatured: false,
};

type Tab = "novedades" | "reels" | "config" | "secretarias";

// ─── FILE UPLOADER HOOK ────────────────────────────────────────────────────────

function useFileUpload() {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const upload = useCallback(async (file: File): Promise<{ url: string; type: "image" | "video" } | null> => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(apiUrl("/api/oficial/upload"), { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Error al subir archivo");
      }
      const data = await res.json();
      return { url: data.url, type: data.type };
    } catch (err: any) {
      toast({ title: err.message ?? "Error al subir", variant: "destructive" });
      return null;
    } finally {
      setUploading(false);
    }
  }, [toast]);

  return { upload, uploading };
}

// ─── DROPZONE COMPONENT ────────────────────────────────────────────────────────

function FileDropzone({
  accept, label, value, onChange, uploading, className = ""
}: {
  accept: string; label: string; value?: string | null;
  onChange: (url: string, type: "image" | "video") => void;
  uploading?: boolean; className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading: localUploading } = useFileUpload();
  const busy = uploading || localUploading;

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files[0]) return;
    const result = await upload(files[0]);
    if (result) onChange(result.url, result.type);
  };

  const isVideo = value && (value.endsWith(".mp4") || value.endsWith(".webm") || value.endsWith(".mov") || value.includes("video"));

  return (
    <div className={`relative ${className}`}>
      {value ? (
        <div className="relative rounded-lg overflow-hidden border border-border bg-muted">
          {isVideo ? (
            <video src={resolveMediaUrl(value) ?? value} className="w-full max-h-48 object-cover" controls />
          ) : (
            <img src={resolveMediaUrl(value) ?? value} alt="" className="w-full max-h-48 object-cover" />
          )}
          <button
            type="button"
            onClick={() => onChange("", "image")}
            className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => !busy && inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
          className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
        >
          {busy ? (
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-muted-foreground">Subiendo...</p>
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Arrastrá o hacé click — JPG, PNG, MP4, MOV</p>
            </>
          )}
        </div>
      )}
      <input
        ref={inputRef} type="file" accept={accept} className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}

// ─── SECRETARIA BADGE ─────────────────────────────────────────────────────────

const SEC_AREA_COLORS: Record<string, string> = {
  salud: "bg-red-100 text-red-700 border-red-200",
  educación: "bg-blue-100 text-blue-700 border-blue-200",
  obras: "bg-orange-100 text-orange-700 border-orange-200",
  cultura: "bg-purple-100 text-purple-700 border-purple-200",
  turismo: "bg-green-100 text-green-700 border-green-200",
  hacienda: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

function SecBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-indigo-50 text-indigo-700 border-indigo-200">
      <Users className="h-2.5 w-2.5" />{name}
    </span>
  );
}

// ─── NOVEDADES TAB ────────────────────────────────────────────────────────────

function NovedadesTab({ entity, isEntityAdmin }: { entity?: PublicEntity; isEntityAdmin: boolean }) {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [filterSec, setFilterSec] = useState<string>("all");

  const { data: novedades, isLoading } = useQuery<NovedadRich[]>({
    queryKey: ["/api/oficial/novedades"],
    queryFn: () => fetch(apiUrl("/api/oficial/novedades")).then((r) => r.json()),
    enabled: !!entity,
  });

  // Derive secretaria name list from novedades (for admin filter)
  const secNames = isEntityAdmin
    ? [...new Set((novedades ?? []).filter(n => n.secretariaName).map(n => n.secretariaName as string))]
    : [];

  const filtered = (novedades ?? []).filter(n => {
    if (filterSec === "all") return true;
    if (filterSec === "entity") return !n.secretariaId;
    return n.secretariaName === filterSec;
  });

  // Stats
  const fromSecretarias = (novedades ?? []).filter(n => !!n.secretariaId).length;

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/oficial/novedades", data).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/oficial/novedades"] });
      queryClient.invalidateQueries({ queryKey: ["/api/novedades"] });
      toast({ title: "Novedad publicada" }); setShowCreate(false); setForm({ ...EMPTY_FORM });
    },
    onError: (err: any) => toast({ title: err?.message ?? "Error", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/oficial/novedades/${id}`, data).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/oficial/novedades"] });
      queryClient.invalidateQueries({ queryKey: ["/api/novedades"] });
      toast({ title: "Novedad actualizada" }); setEditId(null); setForm({ ...EMPTY_FORM }); setShowCreate(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/oficial/novedades/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/oficial/novedades"] });
      queryClient.invalidateQueries({ queryKey: ["/api/novedades"] });
    },
  });

  const handleEdit = (nov: NovedadRich) => {
    setForm({
      title: nov.title, summary: nov.summary ?? "", description: nov.description ?? "",
      image: nov.image ?? "", videoUrl: (nov as any).videoUrl ?? "",
      category: nov.category, contentType: nov.contentType,
      link: nov.link ?? "", provinciaId: nov.provinciaId ?? "", municipioName: nov.municipioName ?? "",
      status: nov.status as any, isFeatured: nov.isFeatured,
    });
    setEditId(nov.id); setShowCreate(true);
  };

  const handleCancel = () => { setShowCreate(false); setEditId(null); setForm({ ...EMPTY_FORM }); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg">Novedades</h2>
          {isEntityAdmin && fromSecretarias > 0 && (
            <p className="text-xs text-muted-foreground">{fromSecretarias} publicada{fromSecretarias !== 1 ? "s" : ""} por secretarías</p>
          )}
        </div>
        <Button onClick={() => { setEditId(null); setForm({ ...EMPTY_FORM }); setShowCreate(true); }} disabled={!entity} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Nueva
        </Button>
      </div>

      {/* FILTER BAR — only for entity admin when there are secretaria novedades */}
      {isEntityAdmin && secNames.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium">Filtrar:</span>
          {[
            { id: "all", label: "Todo el organismo" },
            { id: "entity", label: "Solo organismo" },
            ...secNames.map(n => ({ id: n, label: n })),
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterSec(f.id)}
              className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                filterSec === f.id
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-background text-muted-foreground border-border hover:border-indigo-300 hover:text-indigo-700"
              }`}
            >{f.label}</button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : !filtered.length ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-12 text-center space-y-3">
            <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground font-medium">
              {filterSec !== "all" ? "Sin novedades en este filtro" : "Todavía no hay novedades publicadas"}
            </p>
            {filterSec === "all" && <Button variant="outline" onClick={() => setShowCreate(true)} disabled={!entity}><Plus className="h-4 w-4 mr-1" /> Publicar primera</Button>}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((nov) => {
            const st = STATUS_CONFIG[nov.status] ?? STATUS_CONFIG.active;
            const canEdit = !isEntityAdmin ? true : true; // entity admin can edit all
            return (
              <Card key={nov.id} className={`overflow-hidden hover:shadow-md transition-shadow ${nov.secretariaId ? "border-l-4 border-l-indigo-300" : ""}`}>
                <CardContent className="p-0">
                  <div className="flex">
                    {nov.image && <div className="w-20 h-20 shrink-0"><img src={resolveMediaUrl(nov.image) ?? nov.image} alt={nov.title} className="w-full h-full object-cover" /></div>}
                    <div className="flex-1 p-3 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${st.color}`}>{st.icon} {st.label}</span>
                            {nov.secretariaName && <SecBadge name={nov.secretariaName} />}
                            {nov.isFeatured && <span className="text-[10px] text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-full px-2 py-0.5">⭐ Destacada</span>}
                            <span className="text-[10px] text-muted-foreground border border-border rounded-full px-2 py-0.5">{CATEGORY_LABELS[nov.category] ?? nov.category}</span>
                          </div>
                          <p className="font-semibold text-sm line-clamp-1">{nov.title}</p>
                          {nov.summary && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{nov.summary}</p>}
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(nov)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateMutation.mutate({ id: nov.id, data: { status: nov.status === "active" ? "archived" : "active" } })}>
                            {nov.status === "active" ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { if (confirm("¿Eliminar?")) deleteMutation.mutate(nov.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* CREATE/EDIT DIALOG */}
      <Dialog open={showCreate} onOpenChange={(o) => { if (!o) handleCancel(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Editar Novedad" : "Nueva Novedad"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Categoría</Label>
                <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={form.contentType} onValueChange={(v) => setForm(f => ({ ...f, contentType: v }))}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(CONTENT_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Título *</Label>
              <Input className="h-8 mt-1 text-xs" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ej: Jornada de vacunación gratuita" />
            </div>
            <div>
              <Label className="text-xs">Resumen</Label>
              <Input className="h-8 mt-1 text-xs" value={form.summary} onChange={(e) => setForm(f => ({ ...f, summary: e.target.value }))} placeholder="Descripción breve para la tarjeta" />
            </div>
            <div>
              <Label className="text-xs">Descripción completa</Label>
              <Textarea className="mt-1 text-xs resize-none" rows={3} value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Todos los detalles..." />
            </div>

            {/* IMAGE UPLOAD */}
            <div>
              <Label className="text-xs mb-1 block">Imagen</Label>
              <FileDropzone
                accept="image/*"
                label="Subí una imagen"
                value={form.image}
                onChange={(url) => setForm(f => ({ ...f, image: url }))}
              />
              {!form.image && (
                <Input className="h-8 mt-2 text-xs" value={form.image} onChange={(e) => setForm(f => ({ ...f, image: e.target.value }))} placeholder="O pegá una URL de imagen..." />
              )}
            </div>

            <div>
              <Label className="text-xs">Link (opcional)</Label>
              <Input className="h-8 mt-1 text-xs" value={form.link} onChange={(e) => setForm(f => ({ ...f, link: e.target.value }))} placeholder="https://... o /ruta" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Provincia</Label>
                <Input className="h-8 mt-1 text-xs" value={form.provinciaId} onChange={(e) => setForm(f => ({ ...f, provinciaId: e.target.value }))} placeholder="salta" />
              </div>
              <div>
                <Label className="text-xs">Municipio</Label>
                <Input className="h-8 mt-1 text-xs" value={form.municipioName} onChange={(e) => setForm(f => ({ ...f, municipioName: e.target.value }))} placeholder="Salta Capital" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Estado</Label>
              <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v as any }))}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activa</SelectItem>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="archived">Archivada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.isFeatured} onCheckedChange={(v) => setForm(f => ({ ...f, isFeatured: v }))} />
              <Label className="text-sm cursor-pointer">Marcar como destacada</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
            <Button disabled={!form.title || createMutation.isPending || updateMutation.isPending} onClick={() => editId ? updateMutation.mutate({ id: editId, data: form }) : createMutation.mutate(form)}>
              {(createMutation.isPending || updateMutation.isPending) ? "Guardando..." : editId ? "Actualizar" : "Publicar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── REELS TAB ────────────────────────────────────────────────────────────────

function ReelsTab({ entity }: { entity?: PublicEntity }) {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", summary: "", videoUrl: "", image: "", category: "news", status: "active" as const });

  const { data: allNovedades } = useQuery<Novedad[]>({
    queryKey: ["/api/oficial/novedades"],
    queryFn: () => fetch(apiUrl("/api/oficial/novedades")).then(r => r.json()),
    enabled: !!entity,
  });
  const reels = allNovedades?.filter(n => n.contentType === "reel") ?? [];

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/oficial/novedades", { ...data, contentType: "reel", isFeatured: true }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/oficial/novedades"] });
      queryClient.invalidateQueries({ queryKey: ["/api/novedades"] });
      toast({ title: "Reel publicado en ReelMark" });
      setShowCreate(false); setForm({ title: "", summary: "", videoUrl: "", image: "", category: "news", status: "active" });
    },
    onError: (err: any) => toast({ title: err?.message ?? "Error", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/oficial/novedades/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/oficial/novedades"] }); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg">Reels</h2>
        <Button onClick={() => setShowCreate(true)} disabled={!entity} size="sm">
          <Film className="h-4 w-4 mr-1" /> Subir Reel
        </Button>
      </div>

      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardContent className="p-4 flex items-center gap-3">
          <Film className="h-8 w-8 text-purple-500 shrink-0" />
          <div>
            <p className="font-semibold text-sm text-purple-900">Publicá en ReelMark</p>
            <p className="text-xs text-purple-700">Los reels que subas aparecerán en el feed de videos de la app.</p>
          </div>
        </CardContent>
      </Card>

      {!reels.length ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-10 text-center space-y-3">
            <Video className="h-10 w-10 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground font-medium">Todavía no subiste ningún reel</p>
            <Button variant="outline" onClick={() => setShowCreate(true)} disabled={!entity}><Film className="h-4 w-4 mr-1" /> Subir primer reel</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {reels.map(r => (
            <Card key={r.id} className="overflow-hidden group relative">
              <div className="aspect-[9/16] bg-black relative overflow-hidden">
                {r.image && <img src={resolveMediaUrl(r.image) ?? r.image} alt={r.title} className="w-full h-full object-cover opacity-80" />}
                {!(r as any).image && <div className="w-full h-full flex items-center justify-center"><Film className="h-10 w-10 text-white/30" /></div>}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <p className="text-white text-xs font-semibold line-clamp-2">{r.title}</p>
                </div>
                <button
                  onClick={() => { if (confirm("¿Eliminar este reel?")) deleteMutation.mutate(r.id); }}
                  className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                ><Trash2 className="h-3 w-3" /></button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Film className="h-5 w-5 text-purple-500" /> Subir Reel</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Título del reel *</Label>
              <Input className="h-8 mt-1 text-xs" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ej: Festival Nacional de Folclore 2026" />
            </div>
            <div>
              <Label className="text-xs">Descripción</Label>
              <Input className="h-8 mt-1 text-xs" value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} placeholder="Breve descripción del video" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Video</Label>
              <FileDropzone
                accept="video/*"
                label="Subí tu video (MP4, MOV, WEBM)"
                value={form.videoUrl}
                onChange={(url, type) => setForm(f => ({ ...f, videoUrl: type === "video" ? url : f.videoUrl, image: type === "image" ? url : f.image }))}
              />
              {!form.videoUrl && (
                <Input className="h-8 mt-2 text-xs" value={form.videoUrl} onChange={e => setForm(f => ({ ...f, videoUrl: e.target.value }))} placeholder="O pegá la URL del video..." />
              )}
            </div>
            <div>
              <Label className="text-xs mb-1 block">Portada (thumbnail)</Label>
              <FileDropzone
                accept="image/*"
                label="Imagen de portada"
                value={form.image}
                onChange={(url) => setForm(f => ({ ...f, image: url }))}
              />
              {!form.image && (
                <Input className="h-8 mt-2 text-xs" value={form.image} onChange={e => setForm(f => ({ ...f, image: e.target.value }))} placeholder="O pegá la URL de la imagen..." />
              )}
            </div>
            <div>
              <Label className="text-xs">Categoría</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button disabled={!form.title || createMutation.isPending} onClick={() => createMutation.mutate(form)}>
              {createMutation.isPending ? "Publicando..." : "Publicar en ReelMark"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── CONFIG TAB ───────────────────────────────────────────────────────────────

function ConfigTab({ entity, onUpdated }: { entity?: PublicEntity; onUpdated: () => void }) {
  const { toast } = useToast();
  const [editEntity, setEditEntity] = useState<Partial<PublicEntity> | null>(null);

  const startEdit = () => {
    if (!entity) return;
    setEditEntity({
      name: entity.name, description: entity.description ?? "",
      institutionalEmail: entity.institutionalEmail ?? "", phone: entity.phone ?? "",
      website: entity.website ?? "", address: entity.address ?? "",
      responsibleName: entity.responsibleName ?? "", responsibleTitle: entity.responsibleTitle ?? "",
      facebook: entity.facebook ?? "", instagram: entity.instagram ?? "",
      twitter: entity.twitter ?? "", tiktok: entity.tiktok ?? "", youtube: entity.youtube ?? "",
      logo: entity.logo ?? "", banner: entity.banner ?? "",
    });
  };

  const saveMutation = useMutation({
    mutationFn: (data: Partial<PublicEntity>) => apiRequest("PATCH", "/api/oficial/entity", data).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Información actualizada" });
      setEditEntity(null);
      onUpdated();
    },
    onError: (err: any) => toast({ title: err?.message ?? "Error al guardar", variant: "destructive" }),
  });

  if (!entity) return null;

  const socials = [
    { key: "instagram", label: "Instagram", icon: <Instagram className="h-4 w-4 text-pink-500" />, placeholder: "https://instagram.com/municipio" },
    { key: "facebook", label: "Facebook", icon: <Facebook className="h-4 w-4 text-blue-600" />, placeholder: "https://facebook.com/municipio" },
    { key: "youtube", label: "YouTube", icon: <Youtube className="h-4 w-4 text-red-500" />, placeholder: "https://youtube.com/@municipio" },
    { key: "twitter", label: "Twitter / X", icon: <Twitter className="h-4 w-4 text-sky-500" />, placeholder: "https://x.com/municipio" },
    { key: "tiktok", label: "TikTok", icon: <Film className="h-4 w-4 text-zinc-800" />, placeholder: "https://tiktok.com/@municipio" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg">Configuración</h2>
        <Button variant="outline" size="sm" onClick={startEdit}><Pencil className="h-4 w-4 mr-1" /> Editar info</Button>
      </div>

      {/* INFO CARD */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4" /> Información de la entidad</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-2">
            {entity.institutionalEmail && <div><span className="text-xs text-muted-foreground block">Email</span><span className="text-sm">{entity.institutionalEmail}</span></div>}
            {entity.phone && <div><span className="text-xs text-muted-foreground block">Teléfono</span><span className="text-sm">{entity.phone}</span></div>}
            {entity.website && <div><span className="text-xs text-muted-foreground block">Sitio web</span><a href={entity.website} target="_blank" rel="noreferrer" className="text-sm text-blue-600 flex items-center gap-1">{entity.website}<ExternalLink className="h-3 w-3" /></a></div>}
            {entity.address && <div><span className="text-xs text-muted-foreground block">Dirección</span><span className="text-sm">{entity.address}</span></div>}
          </div>
          {entity.description && <p className="text-sm text-muted-foreground border-t pt-2 mt-2">{entity.description}</p>}
        </CardContent>
      </Card>

      {/* SOCIAL LINKS */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-2"><Link2 className="h-4 w-4" /> Redes sociales</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {socials.map(s => {
            const val = entity[s.key as keyof PublicEntity] as string | null;
            return (
              <div key={s.key} className="flex items-center gap-3">
                {s.icon}
                {val ? (
                  <a href={val} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1 min-w-0 truncate">
                    {val}<ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground italic">No configurado</span>
                )}
              </div>
            );
          })}
          <Button variant="outline" size="sm" className="mt-2" onClick={startEdit}><Plus className="h-3.5 w-3.5 mr-1" /> Agregar redes</Button>
        </CardContent>
      </Card>

      {/* EDIT DIALOG */}
      <Dialog open={!!editEntity} onOpenChange={(o) => { if (!o) setEditEntity(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar información del organismo</DialogTitle></DialogHeader>
          {editEntity && (
            <div className="space-y-4 py-2">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Identidad visual</p>
                <Label className="text-xs mb-1 block">Logo del organismo</Label>
                <FileDropzone
                  accept="image/*"
                  label="Subí el logo"
                  value={editEntity.logo}
                  onChange={(url) => setEditEntity(e => ({ ...e!, logo: url }))}
                />
                {!editEntity.logo && (
                  <Input className="h-8 mt-2 text-xs" value={editEntity.logo ?? ""} onChange={e => setEditEntity(f => ({ ...f!, logo: e.target.value }))} placeholder="O pegá la URL del logo..." />
                )}
              </div>
              <div>
                <Label className="text-xs mb-1 block">Banner / Foto de portada</Label>
                <FileDropzone
                  accept="image/*"
                  label="Subí un banner"
                  value={editEntity.banner}
                  onChange={(url) => setEditEntity(e => ({ ...e!, banner: url }))}
                />
                {!editEntity.banner && (
                  <Input className="h-8 mt-2 text-xs" value={editEntity.banner ?? ""} onChange={e => setEditEntity(f => ({ ...f!, banner: e.target.value }))} placeholder="O pegá la URL del banner..." />
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Información general</p>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Nombre del organismo</Label>
                    <Input className="h-8 mt-1 text-xs" value={editEntity.name ?? ""} onChange={e => setEditEntity(f => ({ ...f!, name: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Descripción institucional</Label>
                    <Textarea className="mt-1 text-xs resize-none" rows={3} value={editEntity.description ?? ""} onChange={e => setEditEntity(f => ({ ...f!, description: e.target.value }))} placeholder="Breve descripción del organismo..." />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Email institucional</Label>
                      <Input className="h-8 mt-1 text-xs" type="email" value={editEntity.institutionalEmail ?? ""} onChange={e => setEditEntity(f => ({ ...f!, institutionalEmail: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-xs">Teléfono</Label>
                      <Input className="h-8 mt-1 text-xs" value={editEntity.phone ?? ""} onChange={e => setEditEntity(f => ({ ...f!, phone: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Sitio web</Label>
                    <Input className="h-8 mt-1 text-xs" value={editEntity.website ?? ""} onChange={e => setEditEntity(f => ({ ...f!, website: e.target.value }))} placeholder="https://municipio.gob.ar" />
                  </div>
                  <div>
                    <Label className="text-xs">Dirección</Label>
                    <Input className="h-8 mt-1 text-xs" value={editEntity.address ?? ""} onChange={e => setEditEntity(f => ({ ...f!, address: e.target.value }))} placeholder="Av. Belgrano 1234, Salta" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Nombre del responsable</Label>
                      <Input className="h-8 mt-1 text-xs" value={editEntity.responsibleName ?? ""} onChange={e => setEditEntity(f => ({ ...f!, responsibleName: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-xs">Cargo</Label>
                      <Input className="h-8 mt-1 text-xs" value={editEntity.responsibleTitle ?? ""} onChange={e => setEditEntity(f => ({ ...f!, responsibleTitle: e.target.value }))} />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Redes sociales</p>
                <div className="space-y-2">
                  {socials.map(s => (
                    <div key={s.key} className="flex items-center gap-2">
                      <div className="shrink-0">{s.icon}</div>
                      <Input
                        className="h-8 text-xs"
                        value={(editEntity as any)[s.key] ?? ""}
                        onChange={e => setEditEntity(f => ({ ...f!, [s.key]: e.target.value }))}
                        placeholder={s.placeholder}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEntity(null)}>Cancelar</Button>
            <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate(editEntity!)}>
              {saveMutation.isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── SECRETARÍAS TAB ──────────────────────────────────────────────────────────

function SecretariasTab({ entity }: { entity?: PublicEntity }) {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [showAccount, setShowAccount] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", area: "", description: "", logo: "" });
  const [accForm, setAccForm] = useState({ email: "", username: "", password: "" });

  const { data: secretarias, isLoading } = useQuery<Secretaria[]>({
    queryKey: ["/api/oficial/secretarias"],
    queryFn: () => fetch(apiUrl("/api/oficial/secretarias")).then(r => r.json()),
    enabled: !!entity,
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/oficial/secretarias", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/oficial/secretarias"] });
      toast({ title: "Secretaría creada" }); setShowCreate(false); setForm({ name: "", area: "", description: "", logo: "" });
    },
    onError: (err: any) => toast({ title: err?.message ?? "Error", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/oficial/secretarias/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/oficial/secretarias"] }),
  });

  const createAccountMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof accForm }) =>
      apiRequest("POST", `/api/oficial/secretarias/${id}/create-account`, data).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Acceso creado para la secretaría" });
      setShowAccount(null); setAccForm({ email: "", username: "", password: "" });
    },
    onError: (err: any) => toast({ title: err?.message ?? "Error", variant: "destructive" }),
  });

  const AREA_COLORS: Record<string, string> = {
    salud: "bg-red-100 text-red-700", educación: "bg-blue-100 text-blue-700",
    obras: "bg-orange-100 text-orange-700", cultura: "bg-purple-100 text-purple-700",
    turismo: "bg-green-100 text-green-700", hacienda: "bg-yellow-100 text-yellow-700",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg">Secretarías</h2>
        <Button onClick={() => setShowCreate(true)} disabled={!entity} size="sm"><Plus className="h-4 w-4 mr-1" /> Nueva secretaría</Button>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4 flex items-start gap-3">
          <Users className="h-8 w-8 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-blue-900">Sub-portales por secretaría</p>
            <p className="text-xs text-blue-700">Cada secretaría puede tener su propio acceso al panel y publicar contenido de su área.</p>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : !secretarias?.length ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-10 text-center space-y-3">
            <Users className="h-10 w-10 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground font-medium">No hay secretarías configuradas</p>
            <Button variant="outline" onClick={() => setShowCreate(true)} disabled={!entity}><Plus className="h-4 w-4 mr-1" /> Agregar primera</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {secretarias.map(sec => (
            <Card key={sec.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 overflow-hidden">
                    {sec.logo ? <img src={resolveMediaUrl(sec.logo) ?? sec.logo} alt={sec.name} className="w-full h-full object-cover" /> : <Users className="h-5 w-5 text-blue-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{sec.name}</p>
                      {sec.area && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${AREA_COLORS[sec.area.toLowerCase()] ?? "bg-gray-100 text-gray-600"}`}>
                          {sec.area}
                        </span>
                      )}
                      {sec.userId && <span className="text-[10px] bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-medium">Acceso activo</span>}
                    </div>
                    {sec.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{sec.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!sec.userId && (
                      <Button variant="outline" size="sm" className="h-7 text-xs text-blue-700 border-blue-200 hover:bg-blue-50" onClick={() => setShowAccount(sec.id)}>
                        <Key className="h-3 w-3 mr-1" /> Crear acceso
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { if (confirm("¿Eliminar esta secretaría?")) deleteMutation.mutate(sec.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* CREATE SECRETARIA DIALOG */}
      <Dialog open={showCreate} onOpenChange={(o) => { if (!o) setShowCreate(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nueva Secretaría</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Nombre *</Label>
              <Input className="h-8 mt-1 text-xs" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Secretaría de Salud" />
            </div>
            <div>
              <Label className="text-xs">Área</Label>
              <Input className="h-8 mt-1 text-xs" value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} placeholder="Salud, Educación, Turismo..." />
            </div>
            <div>
              <Label className="text-xs">Descripción</Label>
              <Textarea className="mt-1 text-xs resize-none" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Qué hace esta secretaría..." />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Logo</Label>
              <FileDropzone
                accept="image/*"
                label="Logo de la secretaría"
                value={form.logo}
                onChange={(url) => setForm(f => ({ ...f, logo: url }))}
              />
              {!form.logo && (
                <Input className="h-8 mt-2 text-xs" value={form.logo} onChange={e => setForm(f => ({ ...f, logo: e.target.value }))} placeholder="O pegá la URL del logo..." />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button disabled={!form.name || createMutation.isPending} onClick={() => createMutation.mutate(form)}>
              {createMutation.isPending ? "Creando..." : "Crear secretaría"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREATE ACCOUNT FOR SECRETARIA DIALOG */}
      <Dialog open={!!showAccount} onOpenChange={(o) => { if (!o) { setShowAccount(null); setAccForm({ email: "", username: "", password: "" }); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Key className="h-5 w-5 text-blue-500" /> Crear acceso</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Creá las credenciales para que la secretaría pueda publicar contenido desde su propio panel.</p>
            <div>
              <Label className="text-xs">Email *</Label>
              <Input className="h-8 mt-1 text-xs" type="email" value={accForm.email} onChange={e => setAccForm(f => ({ ...f, email: e.target.value }))} placeholder="secretaria@municipio.gob.ar" />
            </div>
            <div>
              <Label className="text-xs">Usuario *</Label>
              <Input className="h-8 mt-1 text-xs" value={accForm.username} onChange={e => setAccForm(f => ({ ...f, username: e.target.value }))} placeholder="sec-salud-salta" />
            </div>
            <div>
              <Label className="text-xs">Contraseña temporal *</Label>
              <Input className="h-8 mt-1 text-xs" type="password" value={accForm.password} onChange={e => setAccForm(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 8 caracteres" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAccount(null)}>Cancelar</Button>
            <Button
              disabled={!accForm.email || !accForm.username || !accForm.password || createAccountMutation.isPending}
              onClick={() => showAccount && createAccountMutation.mutate({ id: showAccount, data: accForm })}
            >
              {createAccountMutation.isPending ? "Creando..." : "Crear acceso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────

export default function PanelInstitucional() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("novedades");

  const { data: me, isLoading: meLoading, refetch: refetchMe } = useQuery<OfficialMe>({
    queryKey: ["/api/oficial/me"],
    queryFn: () => fetch(apiUrl("/api/oficial/me")).then((r) => r.json()),
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-sm w-full mx-4">
          <CardContent className="pt-6 text-center space-y-4">
            <Shield className="h-10 w-10 text-blue-500 mx-auto" />
            <h2 className="font-bold text-lg">Acceso restringido</h2>
            <p className="text-sm text-muted-foreground">Iniciá sesión con una cuenta institucional.</p>
            <Button onClick={() => navigate("/auth")} className="w-full">Iniciar sesión</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user.role !== "official" && user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-sm w-full mx-4">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertTriangle className="h-10 w-10 text-orange-500 mx-auto" />
            <h2 className="font-bold text-lg">Sin permisos</h2>
            <p className="text-sm text-muted-foreground">Esta sección es exclusiva para cuentas institucionales verificadas.</p>
            <Button variant="outline" onClick={() => navigate("/")} className="w-full">Volver al inicio</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const entity = me?.entity;
  const mySecretaria = me?.secretaria ?? null;
  const isEntityAdmin = !mySecretaria; // true if user is directly the entity admin (not a secretaria member)
  const vBadge = entity ? (VERIFICATION_BADGE[entity.verificationStatus] ?? VERIFICATION_BADGE.pending) : null;

  const ALL_TABS: { id: Tab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { id: "novedades", label: "Novedades", icon: <FileText className="h-4 w-4" /> },
    { id: "reels", label: "Reels", icon: <Film className="h-4 w-4" /> },
    { id: "config", label: "Perfil", icon: <Settings className="h-4 w-4" />, adminOnly: true },
    { id: "secretarias", label: "Secretarías", icon: <Users className="h-4 w-4" />, adminOnly: true },
  ];
  const TABS = ALL_TABS.filter(t => !t.adminOnly || isEntityAdmin);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/40 via-background to-background">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur border-b border-border/50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Shield className="h-5 w-5 text-blue-600 shrink-0" />
            <div className="min-w-0">
              <span className="font-bold text-base sm:text-lg">Panel Institucional</span>
              {entity && (
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {" · "}{entity.name}{mySecretaria ? ` › ${mySecretaria.name}` : ""}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-xs sm:text-sm">Inicio</Button>
            <Button variant="ghost" size="icon" onClick={() => logout()} title="Cerrar sesión"><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
        {/* Secretaria context bar */}
        {mySecretaria && (
          <div className="bg-indigo-600 text-white text-xs text-center py-1 px-4 font-medium">
            Publicando como: <strong>{mySecretaria.name}</strong>
            {mySecretaria.area ? ` · ${mySecretaria.area}` : ""}
          </div>
        )}
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        {/* ENTITY HERO CARD */}
        {meLoading ? (
          <Skeleton className="h-36 w-full rounded-2xl" />
        ) : entity ? (
          <Card className="overflow-hidden border-0 shadow-md">
            <div className="h-20 relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-500">
              {entity.banner && <img src={resolveMediaUrl(entity.banner) ?? entity.banner} alt="" className="w-full h-full object-cover opacity-40" />}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-700/60 to-blue-500/30" />
            </div>
            <CardContent className="p-4 -mt-6 relative">
              <div className="flex items-end gap-3">
                <div className="w-14 h-14 rounded-xl bg-white border-2 border-white shadow-md overflow-hidden shrink-0">
                  {entity.logo ? <img src={resolveMediaUrl(entity.logo) ?? entity.logo} alt={entity.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-blue-100 flex items-center justify-center"><Building2 className="h-7 w-7 text-blue-600" /></div>}
                </div>
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h1 className="font-bold text-base leading-tight">{entity.name}</h1>
                    <BadgeCheck className="h-4 w-4 text-blue-500 shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    <span className="text-xs text-muted-foreground">{ENTITY_TYPE_LABELS[entity.entityType] ?? entity.entityType}</span>
                    {(entity.municipioName || entity.provinciaId) && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {[entity.municipioName, entity.provinciaId && entity.provinciaId.charAt(0).toUpperCase() + entity.provinciaId.slice(1)].filter(Boolean).join(", ")}
                      </span>
                    )}
                    {vBadge && <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${vBadge.color}`}>{vBadge.label}</span>}
                  </div>
                </div>
              </div>
              {entity.verificationStatus !== "verified" && (
                <div className="mt-3 flex items-start gap-2 p-2.5 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>Entidad pendiente de verificación. Contactá a <strong>institucional@pachapay.com</strong></span>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4 flex items-center gap-3 text-orange-800">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p className="text-sm">Tu cuenta no tiene ninguna entidad vinculada. Contactá al administrador de PachaPay.</p>
            </CardContent>
          </Card>
        )}

        {/* TABS */}
        <div className="w-full overflow-x-auto pb-1 border-b border-border">
          <div className="flex w-max min-w-full">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600 bg-blue-50/50"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* TAB CONTENT */}
        {activeTab === "novedades" && <NovedadesTab entity={entity} isEntityAdmin={isEntityAdmin} />}
        {activeTab === "reels" && <ReelsTab entity={entity} />}
        {activeTab === "config" && <ConfigTab entity={entity} onUpdated={() => refetchMe()} />}
        {activeTab === "secretarias" && <SecretariasTab entity={entity} />}
      </main>
    </div>
  );
}
