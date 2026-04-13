import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Play, CheckCircle, XCircle, Clock, Eye, Star, BarChart3,
  Video, Store, Package, Filter, AlertTriangle, Sparkles, ShoppingCart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ShoppableVideo } from "@shared/schema";
import { apiUrl, resolveMediaUrl } from "@/lib/apiBase";

interface AdminVideo extends ShoppableVideo {
  store?: { id: string; name: string };
  product?: { id: string; name: string };
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Borrador", color: "bg-zinc-500" },
  pending: { label: "Pendiente", color: "bg-yellow-500" },
  approved: { label: "Aprobado", color: "bg-blue-500" },
  published: { label: "Publicado", color: "bg-green-500" },
  rejected: { label: "Rechazado", color: "bg-red-500" },
};

export function AdminVideosTab() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: videos, isLoading } = useQuery<AdminVideo[]>({
    queryKey: ["/api/admin/videos", statusFilter],
    queryFn: async () => {
      const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const res = await fetch(apiUrl(`/api/admin/videos${params}`));
      return res.json();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/videos/${id}/status`, { status });
      return res.json();
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/videos"] });
      const labels: Record<string, string> = { published: "publicado", rejected: "rechazado", pending: "enviado a pendiente" };
      toast({ title: `Video ${labels[status] ?? "actualizado"}` });
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/admin/videos/${id}/featured`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/videos"] });
      toast({ title: "Estado destacado actualizado" });
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const toggleSponsoredMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/admin/videos/${id}/sponsored`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/videos"] });
      toast({ title: "Estado patrocinado actualizado" });
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const filteredVideos = videos ?? [];
  const pendingCount = videos?.filter((v) => v.status === "pending").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Moderación de Videos
            {pendingCount > 0 && (
              <Badge variant="destructive">{pendingCount} pendiente{pendingCount > 1 ? "s" : ""}</Badge>
            )}
          </h2>
          <p className="text-muted-foreground text-sm">Revisá, aprobá o rechazá el contenido enviado por los comerciantes</p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44" data-testid="select-video-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="published">Publicados</SelectItem>
              <SelectItem value="approved">Aprobados</SelectItem>
              <SelectItem value="rejected">Rechazados</SelectItem>
              <SelectItem value="draft">Borradores</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary stats */}
      {videos && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Total", value: videos.length },
            { label: "Publicados", value: videos.filter((v) => v.status === "published").length },
            { label: "Pendientes", value: videos.filter((v) => v.status === "pending").length },
            { label: "Total vistas", value: videos.reduce((a, v) => a + (v.viewsCount ?? 0), 0) },
            { label: "Total ventas", value: videos.reduce((a, v) => a + (v.purchasesCount ?? 0), 0) },
          ].map(({ label, value }) => (
            <Card key={label}>
              <CardContent className="p-3 text-center">
                <p className="text-xl font-bold">{value.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      )}

      {!isLoading && filteredVideos.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Video className="h-12 w-12 text-muted-foreground mb-3 opacity-40" />
            <h3 className="font-semibold">No hay videos con este filtro</h3>
          </CardContent>
        </Card>
      )}

      {filteredVideos.map((video) => {
        const status = statusConfig[video.status ?? "draft"] ?? statusConfig.draft;
        return (
          <Card key={video.id} data-testid={`admin-video-${video.id}`}>
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Video preview */}
                <div className="w-full lg:w-40 h-32 lg:h-28 bg-zinc-900 rounded-lg overflow-hidden flex-none relative group cursor-pointer"
                  onClick={() => setPreviewUrl(previewUrl === video.videoUrl ? null : video.videoUrl)}>
                  {previewUrl === video.videoUrl ? (
                    <video src={resolveMediaUrl(video.videoUrl) ?? video.videoUrl} className="w-full h-full object-cover" autoPlay muted controls />
                  ) : (
                    <>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-black/60 rounded-full p-3 group-hover:bg-primary/80 transition-colors">
                          <Play className="h-6 w-6 text-white fill-white" />
                        </div>
                      </div>
                      <div className="absolute bottom-1 left-1 right-1">
                        <Badge className={`${status.color} text-white text-xs w-full justify-center`}>
                          {status.label}
                        </Badge>
                      </div>
                    </>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start gap-2 mb-2">
                    <h4 className="font-semibold text-sm line-clamp-2 flex-1">{video.title}</h4>
                    <div className="flex gap-1 flex-wrap">
                      {video.isFeatured && <Badge className="bg-yellow-500 text-black text-xs"><Sparkles className="h-3 w-3 mr-1" />Destacado</Badge>}
                      {video.isSponsored && <Badge className="bg-primary text-white text-xs">Patrocinado</Badge>}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                    {video.store && (
                      <span className="flex items-center gap-1"><Store className="h-3 w-3" />{video.store.name}</span>
                    )}
                    {video.product && (
                      <span className="flex items-center gap-1"><Package className="h-3 w-3" />{video.product.name}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{(video.viewsCount ?? 0).toLocaleString()} vistas</span>
                    <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" />{(video.clicksCount ?? 0).toLocaleString()} clics</span>
                    <span className="flex items-center gap-1"><ShoppingCart className="h-3 w-3" />{(video.addToCartCount ?? 0).toLocaleString()} carritos</span>
                    <span className="flex items-center gap-1"><Star className="h-3 w-3" />{(video.purchasesCount ?? 0).toLocaleString()} ventas</span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2">
                    {video.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          className="gap-1 bg-green-600 hover:bg-green-700"
                          onClick={() => updateStatusMutation.mutate({ id: video.id, status: "published" })}
                          disabled={updateStatusMutation.isPending}
                          data-testid={`button-approve-${video.id}`}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Aprobar y publicar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950"
                          onClick={() => updateStatusMutation.mutate({ id: video.id, status: "rejected" })}
                          disabled={updateStatusMutation.isPending}
                          data-testid={`button-reject-${video.id}`}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Rechazar
                        </Button>
                      </>
                    )}

                    {video.status === "published" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-yellow-600"
                        onClick={() => updateStatusMutation.mutate({ id: video.id, status: "pending" })}
                        disabled={updateStatusMutation.isPending}
                        data-testid={`button-unpublish-${video.id}`}
                      >
                        <Clock className="h-3.5 w-3.5" />
                        Retirar
                      </Button>
                    )}

                    {video.status === "rejected" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-green-600"
                        onClick={() => updateStatusMutation.mutate({ id: video.id, status: "published" })}
                        disabled={updateStatusMutation.isPending}
                        data-testid={`button-republish-${video.id}`}
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Publicar igual
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      className={`gap-1 ${video.isFeatured ? "text-yellow-600 border-yellow-300" : ""}`}
                      onClick={() => toggleFeaturedMutation.mutate(video.id)}
                      disabled={toggleFeaturedMutation.isPending}
                      data-testid={`button-feature-${video.id}`}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {video.isFeatured ? "Quitar destacado" : "Destacar"}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className={`gap-1 ${video.isSponsored ? "text-primary border-primary/30" : ""}`}
                      onClick={() => toggleSponsoredMutation.mutate(video.id)}
                      disabled={toggleSponsoredMutation.isPending}
                      data-testid={`button-sponsor-${video.id}`}
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {video.isSponsored ? "Quitar patrocinio" : "Patrocinar"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
