import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  BadgeCheck, Shield, MapPin, Plus, Trash2, Eye, EyeOff,
  Star, Building2, ChevronRight, FileText, LogOut, Globe,
  AlertTriangle, Pencil, Clock, CheckCircle2
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

type PublicEntity = {
  id: string;
  name: string;
  entityType: string;
  logo?: string | null;
  banner?: string | null;
  provinciaId?: string | null;
  municipioName?: string | null;
  responsibleName?: string | null;
  responsibleTitle?: string | null;
  verificationStatus: string;
  institutionalEmail?: string | null;
  website?: string | null;
};

type OfficialMe = { user: { id: string; email: string; username: string; role: string }; entity: PublicEntity };

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
  verified:         { label: "Verificado ✓",   color: "text-blue-600 bg-blue-50 border-blue-200" },
  pending:          { label: "En revisión",     color: "text-yellow-700 bg-yellow-50 border-yellow-200" },
  rejected:         { label: "Rechazado",       color: "text-red-600 bg-red-50 border-red-200" },
  suspended:        { label: "Suspendido",      color: "text-orange-700 bg-orange-50 border-orange-200" },
  renewal_pending:  { label: "Renovar acceso",  color: "text-blue-700 bg-blue-50 border-blue-200" },
};

const EMPTY_FORM = {
  title: "", summary: "", description: "", image: "",
  category: "news", contentType: "card", link: "",
  provinciaId: "", municipioName: "", status: "active" as const, isFeatured: false,
};

export default function PanelInstitucional() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const { data: me, isLoading: meLoading } = useQuery<OfficialMe>({
    queryKey: ["/api/oficial/me"],
    queryFn: () => fetch("/api/oficial/me").then((r) => r.json()),
    enabled: !!user,
  });

  const { data: novedades, isLoading: novsLoading } = useQuery<Novedad[]>({
    queryKey: ["/api/oficial/novedades"],
    queryFn: () => fetch("/api/oficial/novedades").then((r) => r.json()),
    enabled: !!me,
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/oficial/novedades", data).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/oficial/novedades"] });
      queryClient.invalidateQueries({ queryKey: ["/api/novedades"] });
      toast({ title: "Novedad publicada correctamente" });
      setShowCreate(false);
      setForm({ ...EMPTY_FORM });
    },
    onError: (err: any) => toast({ title: err?.message ?? "Error al publicar", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof form> }) =>
      apiRequest("PATCH", `/api/oficial/novedades/${id}`, data).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/oficial/novedades"] });
      queryClient.invalidateQueries({ queryKey: ["/api/novedades"] });
      toast({ title: "Novedad actualizada" });
      setEditId(null);
      setForm({ ...EMPTY_FORM });
    },
    onError: () => toast({ title: "Error al actualizar", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/oficial/novedades/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/oficial/novedades"] });
      queryClient.invalidateQueries({ queryKey: ["/api/novedades"] });
      toast({ title: "Novedad eliminada" });
    },
    onError: () => toast({ title: "Error al eliminar", variant: "destructive" }),
  });

  const handleEdit = (nov: Novedad) => {
    setForm({
      title: nov.title,
      summary: nov.summary ?? "",
      description: nov.description ?? "",
      image: nov.image ?? "",
      category: nov.category,
      contentType: nov.contentType,
      link: nov.link ?? "",
      provinciaId: nov.provinciaId ?? "",
      municipioName: nov.municipioName ?? "",
      status: nov.status as any,
      isFeatured: nov.isFeatured,
    });
    setEditId(nov.id);
    setShowCreate(true);
  };

  const handleSubmit = () => {
    if (editId) {
      updateMutation.mutate({ id: editId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleCancel = () => {
    setShowCreate(false);
    setEditId(null);
    setForm({ ...EMPTY_FORM });
  };

  // Auth guard
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-sm w-full mx-4">
          <CardContent className="pt-6 text-center space-y-4">
            <Shield className="h-10 w-10 text-blue-500 mx-auto" />
            <h2 className="font-bold text-lg">Acceso restringido</h2>
            <p className="text-sm text-muted-foreground">Necesitás iniciar sesión con una cuenta institucional para acceder a este panel.</p>
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
  const vBadge = entity ? (VERIFICATION_BADGE[entity.verificationStatus] ?? VERIFICATION_BADGE.pending) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/40 via-background to-background">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <span className="font-bold text-lg">Panel Institucional</span>
            </div>
            {entity && (
              <span className="text-sm text-muted-foreground hidden sm:inline">
                · {entity.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-sm">
              Ir al inicio
            </Button>
            <Button variant="ghost" size="icon" onClick={() => logout()} title="Cerrar sesión">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* ENTITY CARD */}
        {meLoading ? (
          <Skeleton className="h-36 w-full rounded-2xl" />
        ) : entity ? (
          <Card className="overflow-hidden border-0 shadow-md">
            {entity.banner && (
              <div className="h-24 bg-gradient-to-r from-blue-600 to-blue-400 relative overflow-hidden">
                <img src={entity.banner} alt="" className="w-full h-full object-cover opacity-40" />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-700/60 to-blue-500/30" />
              </div>
            )}
            {!entity.banner && (
              <div className="h-20 bg-gradient-to-r from-blue-600 to-blue-500" />
            )}
            <CardContent className="p-4 -mt-6 relative">
              <div className="flex items-end gap-4">
                <div className="w-16 h-16 rounded-xl bg-white border-2 border-white shadow-md overflow-hidden shrink-0">
                  {entity.logo ? (
                    <img src={entity.logo} alt={entity.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                      <Building2 className="h-8 w-8 text-blue-600" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="font-bold text-lg leading-tight">{entity.name}</h1>
                    <BadgeCheck className="h-5 w-5 text-blue-500 shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mt-1">
                    <span className="text-sm text-muted-foreground">
                      {ENTITY_TYPE_LABELS[entity.entityType] ?? entity.entityType}
                    </span>
                    {(entity.municipioName || entity.provinciaId) && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {[entity.municipioName, entity.provinciaId && entity.provinciaId.charAt(0).toUpperCase() + entity.provinciaId.slice(1)].filter(Boolean).join(", ")}
                      </span>
                    )}
                    {vBadge && (
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${vBadge.color}`}>
                        {vBadge.label}
                      </span>
                    )}
                  </div>
                  {entity.responsibleName && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {entity.responsibleTitle ? `${entity.responsibleTitle}: ` : ""}{entity.responsibleName}
                    </p>
                  )}
                </div>
              </div>

              {entity.verificationStatus !== "verified" && (
                <div className="mt-3 flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>Tu entidad está pendiente de verificación. Las novedades que publiques no aparecerán con el badge oficial hasta que se apruebe tu cuenta. Contactá a soporte: <strong>institucional@pachapay.com</strong></span>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4 flex items-center gap-3 text-orange-800">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p className="text-sm">Tu cuenta no tiene ninguna entidad pública vinculada. Contactá al administrador de PachaPay para vincular tu organismo.</p>
            </CardContent>
          </Card>
        )}

        {/* STATS ROW */}
        {!novsLoading && novedades && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total publicadas", value: novedades.length, color: "text-blue-600" },
              { label: "Activas ahora", value: novedades.filter((n) => n.status === "active").length, color: "text-green-600" },
              { label: "Destacadas", value: novedades.filter((n) => n.isFeatured).length, color: "text-yellow-600" },
            ].map((stat) => (
              <Card key={stat.label} className="border-0 shadow-sm">
                <CardContent className="p-3 text-center">
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* NOVEDADES SECTION */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">Mis Novedades</h2>
            <Button onClick={() => { setEditId(null); setForm({ ...EMPTY_FORM }); setShowCreate(true); }} disabled={!entity}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Novedad
            </Button>
          </div>

          {novsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : !novedades || novedades.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="py-12 text-center space-y-3">
                <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                <p className="text-muted-foreground font-medium">Todavía no publicaste ninguna novedad</p>
                <p className="text-sm text-muted-foreground">Creá tu primera novedad para que aparezca en la sección "Novedades Verificadas" del inicio.</p>
                <Button variant="outline" onClick={() => setShowCreate(true)} disabled={!entity}>
                  <Plus className="h-4 w-4 mr-2" /> Publicar primera novedad
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {novedades.map((nov) => {
                const st = STATUS_CONFIG[nov.status] ?? STATUS_CONFIG.active;
                return (
                  <Card key={nov.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-0">
                      <div className="flex">
                        {nov.image && (
                          <div className="w-24 h-24 shrink-0">
                            <img src={nov.image} alt={nov.title} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex-1 p-3 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${st.color}`}>
                                  {st.icon} {st.label}
                                </span>
                                {nov.isFeatured && (
                                  <span className="text-[10px] font-semibold text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-full px-2 py-0.5">
                                    ⭐ Destacada
                                  </span>
                                )}
                                <span className="text-[10px] text-muted-foreground border border-border rounded-full px-2 py-0.5">
                                  {CATEGORY_LABELS[nov.category] ?? nov.category}
                                </span>
                              </div>
                              <p className="font-semibold text-sm line-clamp-1">{nov.title}</p>
                              {nov.summary && (
                                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{nov.summary}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7"
                                title="Editar"
                                onClick={() => handleEdit(nov)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7"
                                title={nov.status === "active" ? "Archivar" : "Activar"}
                                onClick={() => updateMutation.mutate({ id: nov.id, data: { status: nov.status === "active" ? "archived" : "active" } })}
                              >
                                {nov.status === "active" ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
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
        </div>

        {/* HELP NOTE */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <p className="text-sm text-blue-800 font-medium mb-1">¿Necesitás ayuda?</p>
            <p className="text-xs text-blue-700">
              Para modificar los datos de tu entidad, verificar tu cuenta o reportar algún problema,
              contactá al equipo de PachaPay en <strong>institucional@pachapay.com</strong>
            </p>
          </CardContent>
        </Card>
      </main>

      {/* CREATE / EDIT DIALOG */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) handleCancel(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Novedad" : "Nueva Novedad"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Categoría</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Tipo de contenido</Label>
                <Select value={form.contentType} onValueChange={(v) => setForm((f) => ({ ...f, contentType: v }))}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONTENT_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Título *</Label>
              <Input
                className="h-8 mt-1 text-xs"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Ej: Jornada de vacunación gratuita"
              />
            </div>

            <div>
              <Label className="text-xs">Resumen (subtítulo)</Label>
              <Input
                className="h-8 mt-1 text-xs"
                value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                placeholder="Descripción breve para la tarjeta"
              />
            </div>

            <div>
              <Label className="text-xs">Descripción completa</Label>
              <Textarea
                className="mt-1 text-xs resize-none"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Todos los detalles de la novedad..."
              />
            </div>

            <div>
              <Label className="text-xs">Imagen (URL)</Label>
              <Input
                className="h-8 mt-1 text-xs"
                value={form.image}
                onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
                placeholder="https://... (recomendado 600×340)"
              />
            </div>

            <div>
              <Label className="text-xs">Link (opcional)</Label>
              <Input
                className="h-8 mt-1 text-xs"
                value={form.link}
                onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
                placeholder="/explore o https://..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Provincia</Label>
                <Input
                  className="h-8 mt-1 text-xs"
                  value={form.provinciaId}
                  onChange={(e) => setForm((f) => ({ ...f, provinciaId: e.target.value }))}
                  placeholder="salta"
                />
              </div>
              <div>
                <Label className="text-xs">Municipio</Label>
                <Input
                  className="h-8 mt-1 text-xs"
                  value={form.municipioName}
                  onChange={(e) => setForm((f) => ({ ...f, municipioName: e.target.value }))}
                  placeholder="Salta Capital"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div>
                <Label className="text-xs">Estado</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as any }))}>
                  <SelectTrigger className="h-8 text-xs mt-1 w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activa</SelectItem>
                    <SelectItem value="draft">Borrador</SelectItem>
                    <SelectItem value="archived">Archivada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Switch
                  checked={form.isFeatured}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isFeatured: v }))}
                  id="featured-switch"
                />
                <Label htmlFor="featured-switch" className="text-xs cursor-pointer">Destacada</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
            <Button
              disabled={!form.title || createMutation.isPending || updateMutation.isPending}
              onClick={handleSubmit}
            >
              {(createMutation.isPending || updateMutation.isPending)
                ? "Guardando..."
                : editId ? "Guardar cambios" : "Publicar novedad"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
