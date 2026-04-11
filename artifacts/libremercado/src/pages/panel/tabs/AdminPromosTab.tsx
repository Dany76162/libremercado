import { useState } from "react";
import { Megaphone, Plus, Sparkles, Image, Video, Edit, Trash2, Calendar, RefreshCw, CheckCircle, LayoutTemplate } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePromoBanners, usePromoNotices } from "@/hooks/use-marketplace";
import type { Promo } from "@shared/schema";

const COMMERCIAL_STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Activa", variant: "default" },
  paused: { label: "Pausada", variant: "secondary" },
  draft: { label: "Borrador", variant: "outline" },
  completed: { label: "Completada", variant: "secondary" },
  expired: { label: "Expirada", variant: "destructive" },
};

const PLACEMENT_LABELS: Record<string, string> = {
  hero_home: "Hero Home",
  secondary_home: "Secundario Home",
  explore_top: "Explore Top",
  store_featured: "Tienda Destacada",
  search_highlight: "Búsqueda",
};

interface AIGeneratedContent {
  title: string;
  description: string;
  discount: string;
  callToAction: string;
  suggestedDuration: string;
  generatedByAi: boolean;
  suggestedStartDate: string;
  suggestedEndDate: string;
}

export function AdminPromosTab() {
  const { toast } = useToast();
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [aiContent, setAiContent] = useState<AIGeneratedContent | null>(null);
  const [aiParams, setAiParams] = useState({ type: "banner", targetAudience: "", productCategory: "", tone: "profesional", duration: "7 dias" });

  const { data: banners } = usePromoBanners();
  const { data: notices } = usePromoNotices();

  const { data: expiredPromos } = useQuery<Promo[]>({ queryKey: ["/api/admin/promos/expired"] });

  const generateAiMutation = useMutation({
    mutationFn: async (params: typeof aiParams) => {
      const res = await apiRequest("POST", "/api/admin/promos/generate-ai", params);
      return res.json();
    },
    onSuccess: (data: AIGeneratedContent) => {
      setAiContent(data);
      toast({ title: "Contenido generado", description: "La IA ha creado contenido publicitario" });
    },
    onError: (err: any) => {
      const msg = err?.message || "No se pudo generar el contenido con IA";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const createFromAiMutation = useMutation({
    mutationFn: async (content: { title: string; description: string; discount: string; type: string; startDate: string; endDate: string }) => {
      const res = await apiRequest("POST", "/api/admin/promos/create-from-ai", content);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/promos/banners"] });
      queryClient.invalidateQueries({ queryKey: ["/api/promos/notices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promos/expired"] });
      toast({ title: "Publicidad creada", description: "La publicidad generada por IA fue guardada" });
      setShowAiDialog(false);
      setAiContent(null);
    },
    onError: () => toast({ title: "Error", description: "No se pudo crear la publicidad", variant: "destructive" }),
  });

  const cleanupExpiredMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/promos/cleanup-expired", {});
      return res.json();
    },
    onSuccess: (data: { deactivated: number; message: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/promos/banners"] });
      queryClient.invalidateQueries({ queryKey: ["/api/promos/notices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promos/expired"] });
      toast({ title: "Limpieza completada", description: data.message });
    },
    onError: () => toast({ title: "Error", description: "No se pudo limpiar las promociones expiradas", variant: "destructive" }),
  });

  const updateCommercialStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/admin/promos/${id}/commercial-status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/promos/banners"] });
      queryClient.invalidateQueries({ queryKey: ["/api/promos/notices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
      toast({ title: "Estado de campaña actualizado" });
    },
    onError: () => toast({ title: "Error al actualizar estado", variant: "destructive" }),
  });

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                Gestion de Publicidad
              </CardTitle>
              <CardDescription>Crea y administra banners, promociones y anuncios de la plataforma</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowAiDialog(true)} data-testid="button-generate-ai-promo">
                <Sparkles className="h-4 w-4 mr-2" />Generar con IA
              </Button>
              <Button size="sm" data-testid="button-add-promo">
                <Plus className="h-4 w-4 mr-2" />Crear Publicidad
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Metric cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                { icon: <Image className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />, label: "Banners", value: (banners ?? []).length },
                { icon: <Video className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />, label: "Videos", value: (banners ?? []).filter(b => b.mediaType === 'video').length },
                { icon: <Megaphone className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />, label: "Avisos", value: (notices ?? []).length },
              ].map(({ icon, label, value }) => (
                <Card key={label} className="border-dashed">
                  <CardContent className="p-4 text-center">
                    {icon}
                    <p className="font-medium">{label}</p>
                    <p className="text-2xl font-bold">{value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Banners */}
            <h3 className="font-semibold mb-3">Banners Activos</h3>
            {(banners ?? []).length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No hay banners</p>
            ) : (
              <div className="space-y-3 mb-6">
                {(banners ?? []).map((banner) => {
                  const cStatus = (banner as any).commercialStatus ?? "active";
                  const statusConf = COMMERCIAL_STATUS_LABELS[cStatus] ?? COMMERCIAL_STATUS_LABELS.active;
                  const placementLabel = (banner as any).placement ? (PLACEMENT_LABELS[(banner as any).placement] ?? (banner as any).placement) : null;
                  return (
                    <div key={banner.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border rounded-md" data-testid={`promo-banner-${banner.id}`}>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-16 h-10 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                          {banner.mediaType === 'video' ? <Video className="h-5 w-5 text-muted-foreground" /> : <Image className="h-5 w-5 text-muted-foreground" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{banner.title}</p>
                          <p className="text-sm text-muted-foreground truncate">{banner.advertiser} - {banner.discount || 'Sin descuento'}</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">{banner.impressions || 0} impresiones</span>
                            <span className="text-xs text-muted-foreground">{banner.clicks || 0} clicks</span>
                            {placementLabel && (
                              <span className="text-xs flex items-center gap-1 text-muted-foreground">
                                <LayoutTemplate className="h-3 w-3" />{placementLabel}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={statusConf.variant} className="text-xs" data-testid={`badge-promo-status-${banner.id}`}>
                          {statusConf.label}
                        </Badge>
                        <Select
                          defaultValue={cStatus}
                          onValueChange={(val) => updateCommercialStatus.mutate({ id: banner.id, status: val })}
                        >
                          <SelectTrigger className="h-7 text-xs w-28" data-testid={`select-promo-status-${banner.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Borrador</SelectItem>
                            <SelectItem value="active">Activar</SelectItem>
                            <SelectItem value="paused">Pausar</SelectItem>
                            <SelectItem value="completed">Completar</SelectItem>
                            <SelectItem value="expired">Expirar</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="outline" size="icon" data-testid={`button-edit-banner-${banner.id}`}><Edit className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon" data-testid={`button-delete-banner-${banner.id}`}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Notices */}
            <h3 className="font-semibold mb-3">Avisos y Novedades</h3>
            {(notices ?? []).length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No hay avisos</p>
            ) : (
              <div className="space-y-3">
                {(notices ?? []).map((notice) => (
                  <div key={notice.id} className="flex items-center justify-between p-3 border rounded-md" data-testid={`promo-notice-${notice.id}`}>
                    <div>
                      <p className="font-medium">{notice.title}</p>
                      <p className="text-sm text-muted-foreground">{notice.advertiser} - {notice.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={notice.isActive ? "default" : "secondary"}>{notice.isActive ? "Activo" : "Inactivo"}</Badge>
                      <Button variant="outline" size="icon" data-testid={`button-edit-notice-${notice.id}`}><Edit className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Expired Promos */}
            {(expiredPromos ?? []).length > 0 && (
              <>
                <div className="flex items-center justify-between mt-6 mb-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-orange-500" />
                    Promociones Expiradas ({(expiredPromos ?? []).length})
                  </h3>
                  <Button size="sm" variant="outline" onClick={() => cleanupExpiredMutation.mutate()} disabled={cleanupExpiredMutation.isPending} data-testid="button-cleanup-expired">
                    <RefreshCw className={`h-4 w-4 mr-2 ${cleanupExpiredMutation.isPending ? "animate-spin" : ""}`} />
                    Limpiar Expiradas
                  </Button>
                </div>
                <div className="space-y-2">
                  {(expiredPromos ?? []).slice(0, 5).map((promo) => (
                    <div key={promo.id} className="flex items-center justify-between p-2 border rounded-md bg-muted/50" data-testid={`promo-expired-${promo.id}`}>
                      <div>
                        <p className="text-sm font-medium">{promo.title}</p>
                        <p className="text-xs text-muted-foreground">Expiro: {promo.endDate ? new Date(promo.endDate).toLocaleDateString() : "N/A"}</p>
                      </div>
                      <Badge variant="secondary">Expirada</Badge>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Dialog */}
      <Dialog open={showAiDialog} onOpenChange={setShowAiDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Generar Publicidad con IA
            </DialogTitle>
            <DialogDescription>Usa inteligencia artificial para crear contenido publicitario atractivo</DialogDescription>
          </DialogHeader>

          {!aiContent ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de anuncio</Label>
                <Select value={aiParams.type} onValueChange={(v) => setAiParams(p => ({ ...p, type: v }))}>
                  <SelectTrigger data-testid="select-ai-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="banner">Banner promocional</SelectItem>
                    <SelectItem value="notice">Aviso informativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Audiencia objetivo</Label>
                <Input placeholder="Ej: jovenes, familias, profesionales..." value={aiParams.targetAudience} onChange={(e) => setAiParams(p => ({ ...p, targetAudience: e.target.value }))} data-testid="input-ai-audience" />
              </div>
              <div className="space-y-2">
                <Label>Categoria de producto</Label>
                <Input placeholder="Ej: electronicos, ropa, alimentos..." value={aiParams.productCategory} onChange={(e) => setAiParams(p => ({ ...p, productCategory: e.target.value }))} data-testid="input-ai-category" />
              </div>
              <div className="space-y-2">
                <Label>Tono del mensaje</Label>
                <Select value={aiParams.tone} onValueChange={(v) => setAiParams(p => ({ ...p, tone: v }))}>
                  <SelectTrigger data-testid="select-ai-tone"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="profesional">Profesional</SelectItem>
                    <SelectItem value="casual">Casual y amigable</SelectItem>
                    <SelectItem value="urgente">Urgente / Oferta limitada</SelectItem>
                    <SelectItem value="premium">Premium / Exclusivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duracion de la campana</Label>
                <Select value={aiParams.duration} onValueChange={(v) => setAiParams(p => ({ ...p, duration: v }))}>
                  <SelectTrigger data-testid="select-ai-duration"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3 dias">3 dias</SelectItem>
                    <SelectItem value="7 dias">1 semana</SelectItem>
                    <SelectItem value="14 dias">2 semanas</SelectItem>
                    <SelectItem value="30 dias">1 mes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Card className="border-accent bg-accent/10 dark:bg-accent/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-accent-foreground" />
                    <span className="text-xs text-accent-foreground font-medium">Generado por IA</span>
                  </div>
                  <h3 className="font-bold text-lg mb-1" data-testid="text-ai-title">{aiContent.title}</h3>
                  <p className="text-muted-foreground mb-2" data-testid="text-ai-description">{aiContent.description}</p>
                  <div className="flex items-center gap-2">
                    <Badge data-testid="badge-ai-discount">{aiContent.discount}</Badge>
                    <Badge variant="outline" data-testid="badge-ai-cta">{aiContent.callToAction}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2" data-testid="text-ai-duration">Duracion sugerida: {aiContent.suggestedDuration} dias</p>
                </CardContent>
              </Card>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setAiContent(null)} data-testid="button-ai-regenerate">
                  <RefreshCw className="h-4 w-4 mr-2" />Regenerar
                </Button>
                <Button className="flex-1" onClick={() => aiContent && createFromAiMutation.mutate({ title: aiContent.title, description: aiContent.description, discount: aiContent.discount, type: aiParams.type, startDate: aiContent.suggestedStartDate, endDate: aiContent.suggestedEndDate })} disabled={createFromAiMutation.isPending} data-testid="button-ai-save">
                  <CheckCircle className="h-4 w-4 mr-2" />Guardar Publicidad
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            {!aiContent && (
              <Button onClick={() => generateAiMutation.mutate(aiParams)} disabled={generateAiMutation.isPending} data-testid="button-ai-generate">
                {generateAiMutation.isPending ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Generando...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" />Generar con IA</>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
