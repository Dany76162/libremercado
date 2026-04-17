import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart3, TrendingUp, MousePointerClick, Eye, DollarSign,
  Play, Pause, CheckCircle, FileText, Clock, Plus, Megaphone
} from "lucide-react";

interface Campaign {
  id: string;
  title: string;
  advertiser: string;
  placement: string;
  targetType: string;
  commercialStatus: string;
  pricingModel: string;
  budget: number;
  spentAmount: number;
  remainingBudget: number;
  impressions: number;
  clicks: number;
  ctr: string;
  maxImpressions: number | null;
  maxClicks: number | null;
  startDate: string | null;
  endDate: string | null;
  priority: number;
  isActive: boolean;
  generatedByAi: boolean;
  createdAt: string;
}

interface CampaignSummary {
  total: number;
  active: number;
  paused: number;
  completed: number;
  draft: number;
  totalBudget: number;
  totalSpent: number;
  totalClicks: number;
  totalImpressions: number;
  globalCtr: string;
  estimatedRevenue: number;
}

interface CampaignsResponse {
  campaigns: Campaign[];
  summary: CampaignSummary;
}

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
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

const PRICING_LABELS: Record<string, string> = {
  flat: "Tarifa plana",
  cpc: "Por click (CPC)",
  cpm: "Por mil impresiones (CPM)",
};

function formatARS(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(n);
}

const STATUS_ICON: Record<string, typeof Play> = {
  active: Play,
  paused: Pause,
  draft: FileText,
  completed: CheckCircle,
  expired: Clock,
};

const DEFAULT_FORM = {
  title: "",
  advertiser: "",
  type: "banner",
  placement: "hero_home",
  targetType: "global",
  pricingModel: "flat",
  budget: "",
  maxImpressions: "",
  maxClicks: "",
  startDate: "",
  endDate: "",
  priority: "1",
  description: "",
  link: "",
};

function CreateCampaignDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState(DEFAULT_FORM);

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const createMutation = useMutation({
    mutationFn: async () => {
      const body = {
        title: form.title,
        advertiser: form.advertiser || "PachaPay",
        description: form.description || null,
        type: form.type,
        placement: form.placement,
        targetType: form.targetType,
        pricingModel: form.pricingModel,
        budget: form.budget ? String(parseFloat(form.budget)) : null,
        maxImpressions: form.maxImpressions ? parseInt(form.maxImpressions) : null,
        maxClicks: form.maxClicks ? parseInt(form.maxClicks) : null,
        startDate: form.startDate ? new Date(form.startDate) : null,
        endDate: form.endDate ? new Date(form.endDate) : null,
        priority: parseInt(form.priority) || 1,
        link: form.link || "/explore",
        isActive: true,
        commercialStatus: "active",
        mediaType: "image",
        image: null,
        videoUrl: null,
        spentAmount: "0",
        discount: null,
        generatedByAi: false,
        targetProvince: null,
        targetCity: null,
        targetLat: null,
        targetLng: null,
        targetRadiusKm: null,
      };
      const res = await apiRequest("POST", "/api/promos", body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/promos/banners"] });
      toast({ title: "Campaña creada correctamente" });
      setForm(DEFAULT_FORM);
      onClose();
    },
    onError: () => toast({ title: "Error al crear campaña", variant: "destructive" }),
  });

  const isValid = form.title.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Nueva Campaña Publicitaria
          </DialogTitle>
          <DialogDescription>
            Configura los parámetros comerciales de la campaña.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Título de la campaña *</Label>
              <Input
                placeholder="Ej: Promo verano 2026"
                value={form.title}
                onChange={f("title")}
                data-testid="input-campaign-title"
              />
            </div>
            <div className="space-y-2">
              <Label>Anunciante</Label>
              <Input
                placeholder="Ej: PachaPay"
                value={form.advertiser}
                onChange={f("advertiser")}
                data-testid="input-campaign-advertiser"
              />
            </div>
            <div className="space-y-2">
              <Label>URL de destino</Label>
              <Input
                placeholder="/explore"
                value={form.link}
                onChange={f("link")}
                data-testid="input-campaign-link"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                <SelectTrigger data-testid="select-campaign-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="banner">Banner</SelectItem>
                  <SelectItem value="notice">Aviso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ubicación del anuncio</Label>
              <Select value={form.placement} onValueChange={(v) => setForm((p) => ({ ...p, placement: v }))}>
                <SelectTrigger data-testid="select-campaign-placement"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hero_home">Hero Home</SelectItem>
                  <SelectItem value="secondary_home">Secundario Home</SelectItem>
                  <SelectItem value="explore_top">Explore (arriba)</SelectItem>
                  <SelectItem value="store_featured">Tienda Destacada</SelectItem>
                  <SelectItem value="search_highlight">Búsqueda</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Segmentación geográfica</Label>
              <Select value={form.targetType} onValueChange={(v) => setForm((p) => ({ ...p, targetType: v }))}>
                <SelectTrigger data-testid="select-campaign-target"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global</SelectItem>
                  <SelectItem value="province">Por provincia</SelectItem>
                  <SelectItem value="city">Por ciudad</SelectItem>
                  <SelectItem value="radius">Por radio GPS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Modelo de precios</Label>
              <Select value={form.pricingModel} onValueChange={(v) => setForm((p) => ({ ...p, pricingModel: v }))}>
                <SelectTrigger data-testid="select-campaign-pricing"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Tarifa plana</SelectItem>
                  <SelectItem value="cpc">Por click (CPC)</SelectItem>
                  <SelectItem value="cpm">Por 1000 impresiones (CPM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Presupuesto (ARS)</Label>
              <Input
                type="number"
                placeholder="0"
                value={form.budget}
                onChange={f("budget")}
                data-testid="input-campaign-budget"
              />
            </div>
            <div className="space-y-2">
              <Label>Máx. impresiones</Label>
              <Input
                type="number"
                placeholder="Sin límite"
                value={form.maxImpressions}
                onChange={f("maxImpressions")}
                data-testid="input-campaign-max-impressions"
              />
            </div>
            <div className="space-y-2">
              <Label>Máx. clicks</Label>
              <Input
                type="number"
                placeholder="Sin límite"
                value={form.maxClicks}
                onChange={f("maxClicks")}
                data-testid="input-campaign-max-clicks"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha inicio</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={f("startDate")}
                data-testid="input-campaign-start-date"
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha fin</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={f("endDate")}
                data-testid="input-campaign-end-date"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Prioridad (1 = baja, 10 = alta)</Label>
            <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}>
              <SelectTrigger data-testid="select-campaign-priority"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-campaign">
            Cancelar
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!isValid || createMutation.isPending}
            data-testid="button-create-campaign"
          >
            <Plus className="h-4 w-4 mr-2" />
            {createMutation.isPending ? "Creando..." : "Crear campaña"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AdminCampaignsTab() {
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery<CampaignsResponse>({
    queryKey: ["/api/admin/campaigns"],
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/admin/promos/${id}/commercial-status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promos"] });
      toast({ title: "Estado actualizado" });
    },
    onError: () => {
      toast({ title: "Error al actualizar estado", variant: "destructive" });
    },
  });

  const campaigns = (data?.campaigns ?? []).filter(
    (c) => filterStatus === "all" || c.commercialStatus === filterStatus
  );
  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold" data-testid="text-campaigns-title">Gestión de Campañas</h2>
          <p className="text-muted-foreground text-sm">Monitor de rendimiento y control de campañas publicitarias</p>
        </div>
        <Button onClick={() => setShowCreate(true)} data-testid="button-new-campaign">
          <Plus className="h-4 w-4 mr-2" />
          Nueva campaña
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card data-testid="card-campaigns-total">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground mb-1">Total campañas</p>
              <p className="text-2xl font-bold">{summary.total}</p>
            </CardContent>
          </Card>
          <Card data-testid="card-campaigns-active">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground mb-1">Activas</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.active}</p>
            </CardContent>
          </Card>
          <Card data-testid="card-campaigns-impressions">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Eye className="h-3 w-3" /> Impresiones
              </div>
              <p className="text-2xl font-bold">{summary.totalImpressions.toLocaleString("es-AR")}</p>
            </CardContent>
          </Card>
          <Card data-testid="card-campaigns-clicks">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <MousePointerClick className="h-3 w-3" /> Clicks
              </div>
              <p className="text-2xl font-bold">{summary.totalClicks.toLocaleString("es-AR")}</p>
            </CardContent>
          </Card>
          <Card data-testid="card-campaigns-ctr">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <TrendingUp className="h-3 w-3" /> CTR Global
              </div>
              <p className="text-2xl font-bold">{summary.globalCtr}%</p>
            </CardContent>
          </Card>
          <Card data-testid="card-campaigns-revenue">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <DollarSign className="h-3 w-3" /> Ingresos
              </div>
              <p className="text-lg font-bold">{formatARS(summary.estimatedRevenue)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Campañas
            </CardTitle>
            <CardDescription>
              {isLoading ? "Cargando..." : `${campaigns.length} campaña${campaigns.length !== 1 ? "s" : ""}`}
            </CardDescription>
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus} data-testid="select-filter-status">
            <SelectTrigger className="w-40" data-testid="trigger-filter-status">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activas</SelectItem>
              <SelectItem value="paused">Pausadas</SelectItem>
              <SelectItem value="draft">Borrador</SelectItem>
              <SelectItem value="completed">Completadas</SelectItem>
              <SelectItem value="expired">Expiradas</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground" data-testid="text-no-campaigns">
              No hay campañas con el filtro seleccionado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaña</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead className="text-right">Presupuesto</TableHead>
                    <TableHead className="text-right">Gastado</TableHead>
                    <TableHead className="text-right">Imp.</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((c) => {
                    const statusConf = STATUS_LABELS[c.commercialStatus] ?? STATUS_LABELS.draft;
                    const StatusIcon = STATUS_ICON[c.commercialStatus] ?? FileText;
                    const budgetPct = c.budget > 0 ? Math.min(100, (c.spentAmount / c.budget) * 100) : 0;
                    return (
                      <TableRow key={c.id} data-testid={`row-campaign-${c.id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm line-clamp-1">{c.title}</p>
                            <p className="text-xs text-muted-foreground">{c.advertiser}</p>
                            {c.generatedByAi && (
                              <Badge variant="outline" className="text-xs mt-0.5">IA</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            <p className="font-medium">{PLACEMENT_LABELS[c.placement] ?? c.placement}</p>
                            <p className="text-muted-foreground capitalize">{c.targetType}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {PRICING_LABELS[c.pricingModel] ?? c.pricingModel}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="text-xs">
                            <p>{c.budget > 0 ? formatARS(c.budget) : "—"}</p>
                            {c.budget > 0 && (
                              <div className="mt-1 h-1 rounded bg-muted w-16 ml-auto overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded"
                                  style={{ width: `${budgetPct}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {c.spentAmount > 0 ? formatARS(c.spentAmount) : "—"}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {c.impressions.toLocaleString("es-AR")}
                          {c.maxImpressions && (
                            <span className="text-muted-foreground">/{c.maxImpressions.toLocaleString("es-AR")}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {c.clicks.toLocaleString("es-AR")}
                          {c.maxClicks && (
                            <span className="text-muted-foreground">/{c.maxClicks.toLocaleString("es-AR")}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium">
                          {c.ctr}%
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConf.variant} className="flex items-center gap-1 w-fit text-xs">
                            <StatusIcon className="h-3 w-3" />
                            {statusConf.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            defaultValue={c.commercialStatus}
                            onValueChange={(val) => updateStatus.mutate({ id: c.id, status: val })}
                          >
                            <SelectTrigger
                              className="h-7 text-xs w-28"
                              data-testid={`select-campaign-status-${c.id}`}
                            >
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
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateCampaignDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
