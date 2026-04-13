import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  BadgeCheck, Building2, Shield, Store, Plus, Trash2, Eye, EyeOff,
  MapPin, Star, MoreVertical, X, Filter, Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Novedad } from "@/components/feed/NovedadCard";
import { apiUrl, resolveMediaUrl } from "@/lib/apiBase";

type PublicEntity = {
  id: string;
  name: string;
  entityType: string;
  logo?: string | null;
  provinciaId?: string | null;
  municipioName?: string | null;
  responsibleName?: string | null;
  responsibleTitle?: string | null;
  verificationStatus: string;
  institutionalEmail?: string | null;
  isActive: boolean;
  createdAt?: string | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  health: "Salud", tourism: "Turismo", culture: "Cultura", events: "Eventos",
  education: "Educación", environment: "Ambiente", fashion: "Moda",
  launch: "Lanzamiento", promo: "Promoción", news: "Noticias", campaign: "Campaña", other: "Otro",
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  municipality: "Municipalidad", province: "Provincia", ministry: "Ministerio",
  secretaria: "Secretaría", organism: "Organismo",
};

const VERIFICATION_CONFIG: Record<string, { label: string; color: string }> = {
  pending:          { label: "Pendiente",    color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  verified:         { label: "Verificado",   color: "bg-green-100 text-green-800 border-green-200" },
  rejected:         { label: "Rechazado",    color: "bg-red-100 text-red-800 border-red-200" },
  suspended:        { label: "Suspendido",   color: "bg-orange-100 text-orange-800 border-orange-200" },
  renewal_pending:  { label: "Renovación",  color: "bg-blue-100 text-blue-800 border-blue-200" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft:    { label: "Borrador",  color: "bg-zinc-100 text-zinc-700" },
  active:   { label: "Activo",    color: "bg-green-100 text-green-700" },
  archived: { label: "Archivado", color: "bg-gray-100 text-gray-600" },
  expired:  { label: "Expirado",  color: "bg-red-100 text-red-700" },
};

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
      <BadgeCheck className="h-10 w-10 mb-3 opacity-30" />
      <p>{msg}</p>
    </div>
  );
}

// ─── NOVEDADES TAB ─────────────────────────────────────────────────────────────

function NovedadesSection() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [officialFilter, setOfficialFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    emitterType: "store", emitterName: "", emitterLogo: "",
    isOfficial: false, title: "", summary: "", description: "",
    image: "", category: "news", contentType: "card",
    link: "", provinciaId: "", municipioName: "",
    status: "active", isFeatured: false, priority: 0,
  });

  const { data: novedades, isLoading } = useQuery<Novedad[]>({
    queryKey: ["/api/admin/novedades"],
    queryFn: () => fetch(apiUrl("/api/admin/novedades")).then((r) => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/admin/novedades", data).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/novedades"] });
      toast({ title: "Novedad creada" });
      setShowCreate(false);
    },
    onError: () => toast({ title: "Error al crear novedad", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Novedad> }) =>
      apiRequest("PATCH", `/api/admin/novedades/${id}`, data).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/novedades"] });
      toast({ title: "Novedad actualizada" });
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/novedades/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/novedades"] });
      toast({ title: "Novedad eliminada" });
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const filtered = (novedades ?? []).filter((n) => {
    if (statusFilter !== "all" && n.status !== statusFilter) return false;
    if (officialFilter === "official" && !n.isOfficial) return false;
    if (officialFilter === "commercial" && n.isOfficial) return false;
    return true;
  });

  return (
    <div>
      {/* FILTERS */}
      <div className="flex flex-wrap gap-2 mb-4 items-center justify-between">
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={officialFilter} onValueChange={setOfficialFilter}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="official">Solo oficiales</SelectItem>
              <SelectItem value="commercial">Solo comerciales</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nueva Novedad
        </Button>
      </div>

      {/* LIST */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState msg="No se encontraron novedades con estos filtros" />
      ) : (
        <div className="space-y-3">
          {filtered.map((nov) => {
            const cat = CATEGORY_LABELS[nov.category] ?? nov.category;
            const st = STATUS_CONFIG[nov.status] ?? STATUS_CONFIG.active;
            return (
              <Card key={nov.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex gap-0">
                    {nov.image && (
                      <div className="w-24 h-24 shrink-0">
                        <img src={resolveMediaUrl(nov.image) ?? nov.image} alt={nov.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.color}`}>
                              {st.label}
                            </span>
                            {nov.isOfficial && (
                              <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                                <BadgeCheck className="h-3 w-3" /> Oficial
                              </span>
                            )}
                            {nov.isFeatured && (
                              <span className="text-[10px] font-semibold text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-full px-2 py-0.5">
                                ⭐ Destacado
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground border rounded-full px-2 py-0.5">
                              {cat}
                            </span>
                          </div>
                          <p className="font-semibold text-sm line-clamp-1">{nov.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {nov.emitterName}
                            {nov.municipioName && ` · ${nov.municipioName}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7"
                            title={nov.status === "active" ? "Archivar" : "Activar"}
                            onClick={() => updateMutation.mutate({ id: nov.id, data: { status: nov.status === "active" ? "archived" : "active" } })}
                          >
                            {nov.status === "active" ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7"
                            title={nov.isFeatured ? "Quitar destacado" : "Destacar"}
                            onClick={() => updateMutation.mutate({ id: nov.id, data: { isFeatured: !nov.isFeatured } })}
                          >
                            <Star className={`h-3.5 w-3.5 ${nov.isFeatured ? "fill-yellow-400 text-yellow-400" : ""}`} />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => { if (confirm("¿Eliminar esta novedad?")) deleteMutation.mutate(nov.id); }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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

      {/* CREATE DIALOG */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Novedad</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tipo emisor</Label>
                <Select value={form.emitterType} onValueChange={(v) => setForm((f) => ({ ...f, emitterType: v }))}>
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="municipality">Municipalidad</SelectItem>
                    <SelectItem value="province">Provincia</SelectItem>
                    <SelectItem value="ministry">Ministerio</SelectItem>
                    <SelectItem value="secretaria">Secretaría</SelectItem>
                    <SelectItem value="organism">Organismo</SelectItem>
                    <SelectItem value="store">Tienda</SelectItem>
                    <SelectItem value="brand">Marca</SelectItem>
                    <SelectItem value="company">Empresa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Categoría</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Nombre del emisor *</Label>
              <Input className="h-8 mt-1 text-xs" value={form.emitterName} onChange={(e) => setForm((f) => ({ ...f, emitterName: e.target.value }))} placeholder="Ej: Municipalidad de Salta" />
            </div>
            <div>
              <Label className="text-xs">Logo del emisor (URL)</Label>
              <Input className="h-8 mt-1 text-xs" value={form.emitterLogo} onChange={(e) => setForm((f) => ({ ...f, emitterLogo: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.isOfficial} onCheckedChange={(v) => setForm((f) => ({ ...f, isOfficial: v }))} id="is-official" />
              <Label htmlFor="is-official" className="text-xs cursor-pointer">Cuenta Oficial verificada</Label>
            </div>
            <div>
              <Label className="text-xs">Título *</Label>
              <Input className="h-8 mt-1 text-xs" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ej: Jornada de vacunación gratuita" />
            </div>
            <div>
              <Label className="text-xs">Resumen</Label>
              <Input className="h-8 mt-1 text-xs" value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} placeholder="Subtítulo breve" />
            </div>
            <div>
              <Label className="text-xs">Descripción</Label>
              <Textarea className="mt-1 text-xs" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Descripción completa..." />
            </div>
            <div>
              <Label className="text-xs">Imagen (URL)</Label>
              <Input className="h-8 mt-1 text-xs" value={form.image} onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))} placeholder="https://..." />
            </div>
            <div>
              <Label className="text-xs">Link (opcional)</Label>
              <Input className="h-8 mt-1 text-xs" value={form.link} onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))} placeholder="/explore o https://..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Provincia</Label>
                <Input className="h-8 mt-1 text-xs" value={form.provinciaId} onChange={(e) => setForm((f) => ({ ...f, provinciaId: e.target.value }))} placeholder="salta" />
              </div>
              <div>
                <Label className="text-xs">Municipio</Label>
                <Input className="h-8 mt-1 text-xs" value={form.municipioName} onChange={(e) => setForm((f) => ({ ...f, municipioName: e.target.value }))} placeholder="Salta Capital" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={form.isFeatured} onCheckedChange={(v) => setForm((f) => ({ ...f, isFeatured: v }))} id="is-featured" />
                <Label htmlFor="is-featured" className="text-xs cursor-pointer">Destacado</Label>
              </div>
              <div>
                <Label className="text-xs">Prioridad</Label>
                <Input className="h-8 mt-1 text-xs w-20" type="number" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button disabled={!form.emitterName || !form.title || createMutation.isPending} onClick={() => createMutation.mutate(form)}>
              {createMutation.isPending ? "Creando..." : "Crear Novedad"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── PUBLIC ENTITIES SECTION ──────────────────────────────────────────────────

function PublicEntitiesSection() {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [accountEntityId, setAccountEntityId] = useState<string | null>(null);
  const [accountForm, setAccountForm] = useState({ email: "", username: "", password: "" });
  const [form, setForm] = useState({
    name: "", entityType: "municipality", provinciaId: "", municipioName: "",
    institutionalEmail: "", responsibleName: "", responsibleTitle: "",
    logo: "", verificationStatus: "pending",
  });

  const { data: entities, isLoading } = useQuery<PublicEntity[]>({
    queryKey: ["/api/admin/public-entities"],
    queryFn: () => fetch(apiUrl("/api/admin/public-entities")).then((r) => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/admin/public-entities", data).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/public-entities"] });
      toast({ title: "Entidad creada" });
      setShowCreate(false);
    },
    onError: () => toast({ title: "Error al crear entidad", variant: "destructive" }),
  });

  const createAccountMutation = useMutation({
    mutationFn: ({ entityId, data }: { entityId: string; data: typeof accountForm }) =>
      apiRequest("POST", `/api/admin/public-entities/${entityId}/create-account`, data).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/public-entities"] });
      toast({ title: "Cuenta oficial creada. El municipio ya puede iniciar sesión." });
      setShowCreateAccount(false);
      setAccountForm({ email: "", username: "", password: "" });
    },
    onError: (err: any) => toast({ title: err?.message ?? "Error al crear cuenta", variant: "destructive" }),
  });

  const verifyMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/admin/public-entities/${id}`, { verificationStatus: status }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/public-entities"] });
      toast({ title: "Estado de verificación actualizado" });
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">
          {entities?.length ?? 0} entidades registradas
        </p>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nueva Entidad
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : (entities?.length ?? 0) === 0 ? (
        <EmptyState msg="No hay entidades registradas" />
      ) : (
        <div className="space-y-3">
          {(entities ?? []).map((entity) => {
            const vCfg = VERIFICATION_CONFIG[entity.verificationStatus] ?? VERIFICATION_CONFIG.pending;
            return (
              <Card key={entity.id}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    {entity.logo ? (
                      <div className="w-10 h-10 rounded-full overflow-hidden border shrink-0">
                        <img src={resolveMediaUrl(entity.logo) ?? entity.logo} alt={entity.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="font-semibold text-sm truncate">{entity.name}</p>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${vCfg.color}`}>
                          {vCfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {ENTITY_TYPE_LABELS[entity.entityType] ?? entity.entityType}
                        {entity.provinciaId && ` · ${entity.provinciaId}`}
                        {entity.responsibleName && ` · ${entity.responsibleName}`}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                      {entity.verificationStatus !== "verified" && (
                        <Button
                          variant="outline" size="sm" className="h-7 text-xs text-green-700 border-green-200 hover:bg-green-50"
                          onClick={() => verifyMutation.mutate({ id: entity.id, status: "verified" })}
                        >
                          <BadgeCheck className="h-3.5 w-3.5 mr-1" /> Verificar
                        </Button>
                      )}
                      {entity.verificationStatus === "verified" && (
                        <Button
                          variant="outline" size="sm" className="h-7 text-xs text-orange-700 border-orange-200 hover:bg-orange-50"
                          onClick={() => verifyMutation.mutate({ id: entity.id, status: "suspended" })}
                        >
                          Suspender
                        </Button>
                      )}
                      <Button
                        variant="outline" size="sm" className="h-7 text-xs text-blue-700 border-blue-200 hover:bg-blue-50"
                        onClick={() => { setAccountEntityId(entity.id); setShowCreateAccount(true); }}
                      >
                        + Cuenta Oficial
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* CREATE DIALOG */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Entidad Pública</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Nombre de la entidad *</Label>
              <Input className="h-8 mt-1 text-xs" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ej: Municipalidad de Salta" />
            </div>
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={form.entityType} onValueChange={(v) => setForm((f) => ({ ...f, entityType: v }))}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ENTITY_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Provincia</Label>
                <Input className="h-8 mt-1 text-xs" value={form.provinciaId} onChange={(e) => setForm((f) => ({ ...f, provinciaId: e.target.value }))} placeholder="salta" />
              </div>
              <div>
                <Label className="text-xs">Municipio</Label>
                <Input className="h-8 mt-1 text-xs" value={form.municipioName} onChange={(e) => setForm((f) => ({ ...f, municipioName: e.target.value }))} placeholder="Salta Capital" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Email institucional</Label>
              <Input className="h-8 mt-1 text-xs" value={form.institutionalEmail} onChange={(e) => setForm((f) => ({ ...f, institutionalEmail: e.target.value }))} placeholder="comunicacion@organismo.gob.ar" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nombre responsable</Label>
                <Input className="h-8 mt-1 text-xs" value={form.responsibleName} onChange={(e) => setForm((f) => ({ ...f, responsibleName: e.target.value }))} placeholder="Lic. Ana Gómez" />
              </div>
              <div>
                <Label className="text-xs">Cargo</Label>
                <Input className="h-8 mt-1 text-xs" value={form.responsibleTitle} onChange={(e) => setForm((f) => ({ ...f, responsibleTitle: e.target.value }))} placeholder="Dir. de Comunicación" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Logo (URL)</Label>
              <Input className="h-8 mt-1 text-xs" value={form.logo} onChange={(e) => setForm((f) => ({ ...f, logo: e.target.value }))} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button disabled={!form.name || createMutation.isPending} onClick={() => createMutation.mutate(form)}>
              {createMutation.isPending ? "Creando..." : "Crear Entidad"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREAR CUENTA OFICIAL DIALOG */}
      <Dialog open={showCreateAccount} onOpenChange={(o) => { if (!o) { setShowCreateAccount(false); setAccountForm({ email: "", username: "", password: "" }); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-blue-500" />
              Crear Cuenta Oficial
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Creá las credenciales de acceso para que el organismo pueda iniciar sesión en el Panel Institucional.
            </p>
            <div>
              <Label className="text-xs">Email *</Label>
              <Input className="h-8 mt-1 text-xs" type="email" value={accountForm.email} onChange={(e) => setAccountForm((f) => ({ ...f, email: e.target.value }))} placeholder="comunicacion@municipio.gob.ar" />
            </div>
            <div>
              <Label className="text-xs">Usuario *</Label>
              <Input className="h-8 mt-1 text-xs" value={accountForm.username} onChange={(e) => setAccountForm((f) => ({ ...f, username: e.target.value }))} placeholder="municipio-salta" />
            </div>
            <div>
              <Label className="text-xs">Contraseña temporal *</Label>
              <Input className="h-8 mt-1 text-xs" type="password" value={accountForm.password} onChange={(e) => setAccountForm((f) => ({ ...f, password: e.target.value }))} placeholder="Mínimo 8 caracteres" />
            </div>
            <p className="text-xs text-muted-foreground bg-blue-50 border border-blue-100 rounded-lg p-2">
              Compartí estas credenciales con el responsable del organismo. Se recomienda que cambien la contraseña al primer ingreso.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateAccount(false)}>Cancelar</Button>
            <Button
              disabled={!accountForm.email || !accountForm.username || !accountForm.password || createAccountMutation.isPending}
              onClick={() => accountEntityId && createAccountMutation.mutate({ entityId: accountEntityId, data: accountForm })}
            >
              {createAccountMutation.isPending ? "Creando..." : "Crear acceso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────

type SubTab = "novedades" | "entities";

export function AdminNovedadesTab() {
  const [subTab, setSubTab] = useState<SubTab>("novedades");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold mb-1">Novedades Verificadas</h2>
        <p className="text-sm text-muted-foreground">Gestioná las novedades de organismos oficiales y comercios verificados.</p>
      </div>

      {/* SUB-TABS */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1 w-fit">
        <button
          onClick={() => setSubTab("novedades")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${subTab === "novedades" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Novedades
        </button>
        <button
          onClick={() => setSubTab("entities")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${subTab === "entities" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Entidades Públicas
        </button>
      </div>

      {subTab === "novedades" ? <NovedadesSection /> : <PublicEntitiesSection />}
    </div>
  );
}
