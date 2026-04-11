import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Play, Plus, Edit, Trash2, Eye, CheckCircle, Clock, XCircle,
  Upload, Video, BarChart3, Tag, Store, Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ShoppableVideo } from "@shared/schema";

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  draft: { label: "Borrador", color: "bg-zinc-500", icon: Edit },
  pending: { label: "Pendiente revisión", color: "bg-yellow-500", icon: Clock },
  approved: { label: "Aprobado", color: "bg-blue-500", icon: CheckCircle },
  published: { label: "Publicado", color: "bg-green-500", icon: CheckCircle },
  rejected: { label: "Rechazado", color: "bg-red-500", icon: XCircle },
};

interface VideoWithProduct extends ShoppableVideo {
  product?: { id: string; name: string } | null;
}

interface MerchantProduct {
  id: string;
  name: string;
}

const defaultForm = {
  title: "",
  description: "",
  tags: "",
  videoUrl: "",
  thumbnailUrl: "",
  productId: "",
  contentType: "product" as const,
  targetProvince: "",
  targetCity: "",
};

export function MerchantVideosTab() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoWithProduct | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const { data: videos, isLoading } = useQuery<VideoWithProduct[]>({
    queryKey: ["/api/merchant/videos"],
  });

  const { data: products } = useQuery<MerchantProduct[]>({
    queryKey: ["/api/merchant/products"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await apiRequest("POST", "/api/merchant/videos", {
        ...data,
        productId: data.productId || null,
        targetProvince: data.targetProvince || null,
        targetCity: data.targetCity || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/videos"] });
      setShowDialog(false);
      setForm(defaultForm);
      toast({ title: "Video enviado para revisión", description: "El equipo de PachaPay revisará tu video antes de publicarlo." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof form> }) => {
      const res = await apiRequest("PATCH", `/api/merchant/videos/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/videos"] });
      setShowDialog(false);
      setEditingVideo(null);
      setForm(defaultForm);
      toast({ title: "Video actualizado" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/merchant/videos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/videos"] });
      toast({ title: "Video eliminado" });
    },
    onError: () => toast({ title: "Error al eliminar", variant: "destructive" }),
  });

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    try {
      const formData = new FormData();
      formData.append("video", file);
      const res = await fetch("/api/merchant/videos/upload-video", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Error al subir el video");
      const { url } = await res.json();
      setForm((f) => ({ ...f, videoUrl: url }));
      toast({ title: "Video subido correctamente" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setUploadingVideo(false);
    }
  };

  const openCreate = () => {
    setEditingVideo(null);
    setForm(defaultForm);
    setShowDialog(true);
  };

  const openEdit = (video: VideoWithProduct) => {
    setEditingVideo(video);
    setForm({
      title: video.title,
      description: video.description ?? "",
      tags: video.tags ?? "",
      videoUrl: video.videoUrl,
      thumbnailUrl: video.thumbnailUrl ?? "",
      productId: video.productId ?? "",
      contentType: video.contentType,
      targetProvince: video.targetProvince ?? "",
      targetCity: video.targetCity ?? "",
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!form.title.trim()) return toast({ title: "El título es requerido", variant: "destructive" });
    if (!form.videoUrl.trim()) return toast({ title: "La URL del video es requerida", variant: "destructive" });
    if (editingVideo) {
      updateMutation.mutate({ id: editingVideo.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const stats = videos
    ? {
        total: videos.length,
        published: videos.filter((v) => v.status === "published").length,
        pending: videos.filter((v) => v.status === "pending").length,
        totalViews: videos.reduce((acc, v) => acc + v.viewsCount, 0),
        totalAddToCart: videos.reduce((acc, v) => acc + v.addToCartCount, 0),
      }
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Reels de productos
          </h2>
          <p className="text-muted-foreground text-sm">
            Cada Reel se asocia a un producto. Aparece en la ficha del producto y en el feed ReelMark.
          </p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openCreate} data-testid="button-new-video">
              <Plus className="h-4 w-4" />
              Nuevo Reel
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingVideo ? "Editar Reel" : "Nuevo Reel de producto"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Título *</Label>
                <Input
                  placeholder="Ej: Nuevo lanzamiento de verano con 30% OFF"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  data-testid="input-video-title"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Descripción</Label>
                <Textarea
                  placeholder="Describí tu producto o promoción..."
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  data-testid="input-video-description"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Video</Label>
                {form.videoUrl ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-muted-foreground truncate">{form.videoUrl}</span>
                    <Button variant="ghost" size="sm" onClick={() => setForm((f) => ({ ...f, videoUrl: "" }))}>
                      Cambiar
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
                      <label className="cursor-pointer">
                        <input type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={handleVideoUpload} />
                        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm font-medium">
                          {uploadingVideo ? "Subiendo..." : "Subir video (MP4, WEBM, MOV)"}
                        </p>
                        <p className="text-xs text-muted-foreground">Máximo 100MB</p>
                      </label>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center"><div className="border-t w-full" /></div>
                      <div className="relative flex justify-center"><span className="bg-background px-2 text-xs text-muted-foreground">o pegá una URL</span></div>
                    </div>
                    <Input
                      placeholder="https://ejemplo.com/video.mp4"
                      value={form.videoUrl}
                      onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))}
                      data-testid="input-video-url"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Tipo de contenido</Label>
                <Select value={form.contentType} onValueChange={(v) => setForm((f) => ({ ...f, contentType: v as any }))}>
                  <SelectTrigger data-testid="select-content-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product">Producto</SelectItem>
                    <SelectItem value="store">Tienda</SelectItem>
                    <SelectItem value="promo">Promoción</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {products && products.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-primary" />
                    Producto del Reel *
                  </Label>
                  <p className="text-xs text-muted-foreground -mt-1">
                    El Reel aparecerá en la galería de este producto y en ReelMark.
                  </p>
                  <Select value={form.productId || "none"} onValueChange={(v) => setForm((f) => ({ ...f, productId: v === "none" ? "" : v }))}>
                    <SelectTrigger data-testid="select-product">
                      <SelectValue placeholder="Elegí el producto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin producto vinculado</SelectItem>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Tags (separados por coma)</Label>
                <Input
                  placeholder="Ej: oferta,verano,moda"
                  value={form.tags}
                  onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                  data-testid="input-video-tags"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Provincia objetivo (opcional)</Label>
                  <Input
                    placeholder="Ej: buenos-aires"
                    value={form.targetProvince}
                    onChange={(e) => setForm((f) => ({ ...f, targetProvince: e.target.value }))}
                    data-testid="input-video-province"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Ciudad objetivo (opcional)</Label>
                  <Input
                    placeholder="Ej: caba"
                    value={form.targetCity}
                    onChange={(e) => setForm((f) => ({ ...f, targetCity: e.target.value }))}
                    data-testid="input-video-city"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-submit-video"
              >
                {editingVideo ? "Guardar cambios" : "Enviar para revisión"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: "Total videos", value: stats.total, icon: Video },
            { label: "Publicados", value: stats.published, icon: CheckCircle },
            { label: "Pendientes", value: stats.pending, icon: Clock },
            { label: "Reproducciones", value: stats.totalViews, icon: Eye },
            { label: "Agregados al carrito", value: stats.totalAddToCart, icon: ShoppingCart_icon },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="p-3 text-center">
                <Icon className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-xl font-bold">{value.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Video list */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      )}

      {!isLoading && (!videos || videos.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Video className="h-12 w-12 text-muted-foreground mb-4 opacity-40" />
            <h3 className="font-semibold mb-1">Todavía no tenés Reels</h3>
            <p className="text-muted-foreground text-sm max-w-xs mb-4">
              Asociá un Reel a cada producto. Aparecerá en la galería del producto y en el feed ReelMark.
            </p>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Crear primer Reel
            </Button>
          </CardContent>
        </Card>
      )}

      {videos && videos.length > 0 && (
        <div className="space-y-3">
          {videos.map((video) => {
            const status = statusConfig[video.status] ?? statusConfig.draft;
            const StatusIcon = status.icon;
            return (
              <Card key={video.id} data-testid={`video-row-${video.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Thumbnail preview */}
                    <div className="w-16 h-16 bg-zinc-900 rounded-lg flex items-center justify-center flex-none overflow-hidden">
                      {video.thumbnailUrl ? (
                        <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Play className="h-6 w-6 text-zinc-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-sm leading-tight line-clamp-1">{video.title}</h4>
                          {video.product && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Package className="h-3 w-3" />
                              {video.product.name}
                            </p>
                          )}
                        </div>
                        <Badge className={`${status.color} text-white text-xs flex-none`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{video.viewsCount} vistas</span>
                        <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" />{video.clicksCount} clics</span>
                        <span className="flex items-center gap-1"><ShoppingCart_icon className="h-3 w-3" />{video.addToCartCount} carritos</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-none">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(video)} data-testid={`button-edit-video-${video.id}`}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(video.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-video-${video.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ShoppingCart_icon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}
