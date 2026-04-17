import { useState } from "react";
import { Store, Plus, Sparkles, Package, Star, Calendar, X, ShieldCheck, ShieldAlert, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useStores } from "@/hooks/use-marketplace";
import type { Store as StoreType, Product } from "@shared/schema";

function FeaturedDialog({
  store,
  open,
  onClose,
}: {
  store: StoreType;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [featuredDays, setFeaturedDays] = useState("30");
  const [featuredScore, setFeaturedScore] = useState("10");

  const featureMutation = useMutation({
    mutationFn: (data: { isFeatured: boolean; featuredDays?: number; featuredScore?: number }) =>
      apiRequest("PATCH", `/api/admin/stores/${store.id}/featured`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stores/featured"] });
      toast({ title: store.isFeatured ? "Tienda sin destacar" : "Tienda destacada correctamente" });
      onClose();
    },
    onError: () => toast({ title: "Error al actualizar tienda", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {store.isFeatured ? "Quitar destacado" : "Destacar tienda"}
          </DialogTitle>
          <DialogDescription>
            {store.isFeatured
              ? `${store.name} aparece actualmente como destacada.`
              : `${store.name} aparecerá en la sección de tiendas destacadas.`}
          </DialogDescription>
        </DialogHeader>

        {!store.isFeatured && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Duración del destacado</Label>
              <Select value={featuredDays} onValueChange={setFeaturedDays}>
                <SelectTrigger data-testid="select-featured-days">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 días</SelectItem>
                  <SelectItem value="15">15 días</SelectItem>
                  <SelectItem value="30">30 días</SelectItem>
                  <SelectItem value="60">60 días</SelectItem>
                  <SelectItem value="90">90 días</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridad de posición (0–100)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={featuredScore}
                onChange={(e) => setFeaturedScore(e.target.value)}
                placeholder="10"
                data-testid="input-featured-score"
              />
              <p className="text-xs text-muted-foreground">
                Mayor número = aparece primero en la sección destacada.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-featured">
            Cancelar
          </Button>
          {store.isFeatured ? (
            <Button
              variant="destructive"
              onClick={() => featureMutation.mutate({ isFeatured: false })}
              disabled={featureMutation.isPending}
              data-testid="button-unfeature-store"
            >
              <X className="h-4 w-4 mr-2" />
              Quitar destacado
            </Button>
          ) : (
            <Button
              onClick={() =>
                featureMutation.mutate({
                  isFeatured: true,
                  featuredDays: parseInt(featuredDays),
                  featuredScore: parseInt(featuredScore),
                })
              }
              disabled={featureMutation.isPending}
              data-testid="button-feature-store"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Destacar tienda
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SponsoredDialog({
  store,
  open,
  onClose,
}: {
  store: StoreType;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [sponsoredDays, setSponsoredDays] = useState("30");
  const [sponsoredPriority, setSponsoredPriority] = useState("10");

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/stores", store.id, "products"],
  });

  const sponsorMutation = useMutation({
    mutationFn: ({ productId, isSponsored, days, priority }: { productId: string; isSponsored: boolean; days?: number; priority?: number }) =>
      apiRequest("PATCH", `/api/admin/products/${productId}/sponsored`, {
        isSponsored,
        sponsoredDays: days,
        sponsoredPriority: priority,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stores", store.id, "products"] });
      toast({ title: "Producto actualizado" });
    },
    onError: () => toast({ title: "Error al actualizar producto", variant: "destructive" }),
  });

  const sponsored = (products ?? []).filter((p) => p.isSponsored);
  const unsponsored = (products ?? []).filter((p) => !p.isSponsored);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-accent" />
            Productos Patrocinados — {store.name}
          </DialogTitle>
          <DialogDescription>
            Los productos patrocinados aparecen primero en los resultados de búsqueda y listados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-80 overflow-y-auto">
          {productsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (products ?? []).length === 0 ? (
            <p className="text-center text-muted-foreground py-4 text-sm">Esta tienda no tiene productos</p>
          ) : (
            <>
              {sponsored.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Patrocinados activos</p>
                  <div className="space-y-2">
                    {sponsored.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-2 border rounded-md bg-accent/5" data-testid={`row-sponsored-product-${p.id}`}>
                        <div>
                          <p className="text-sm font-medium">{p.name}</p>
                          {p.sponsoredUntil && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              hasta {new Date(p.sponsoredUntil).toLocaleDateString("es-AR")}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => sponsorMutation.mutate({ productId: p.id, isSponsored: false })}
                          disabled={sponsorMutation.isPending}
                          data-testid={`button-unsponsored-${p.id}`}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Quitar
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {unsponsored.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Agregar patrocinio</p>
                  <div className="space-y-3">
                    <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                      <SelectTrigger data-testid="select-product-to-sponsor">
                        <SelectValue placeholder="Seleccionar producto..." />
                      </SelectTrigger>
                      <SelectContent>
                        {unsponsored.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedProduct && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Duración</Label>
                          <Select value={sponsoredDays} onValueChange={setSponsoredDays}>
                            <SelectTrigger className="h-8" data-testid="select-sponsored-days">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="7">7 días</SelectItem>
                              <SelectItem value="15">15 días</SelectItem>
                              <SelectItem value="30">30 días</SelectItem>
                              <SelectItem value="60">60 días</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Prioridad (0–50)</Label>
                          <Input
                            type="number"
                            className="h-8"
                            min={0}
                            max={50}
                            value={sponsoredPriority}
                            onChange={(e) => setSponsoredPriority(e.target.value)}
                            data-testid="input-sponsored-priority"
                          />
                        </div>
                      </div>
                    )}
                    {selectedProduct && (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() =>
                          sponsorMutation.mutate({
                            productId: selectedProduct,
                            isSponsored: true,
                            days: parseInt(sponsoredDays),
                            priority: parseInt(sponsoredPriority),
                          })
                        }
                        disabled={sponsorMutation.isPending}
                        data-testid="button-sponsor-product"
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Patrocinar producto
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-close-sponsored">
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ClassificationDialog({
  store,
  open,
  onClose,
}: {
  store: StoreType;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [merchantType, setMerchantType] = useState<string>(store.merchantType || "common");
  const [isVerified, setIsVerified] = useState<boolean>(store.isVerified || false);

  const mutation = useMutation({
    mutationFn: (data: { merchantType: string; isVerified: boolean }) =>
      apiRequest("PATCH", `/api/admin/stores/${store.id}/classification`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
      toast({ title: "Clasificación de tienda actualizada" });
      onClose();
    },
    onError: () => toast({ title: "Error al actualizar clasificación", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Clasificación — {store.name}
          </DialogTitle>
          <DialogDescription>
            Configura el nivel de confianza y tipo de comercio.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Tipo de Comercio</Label>
            <Select value={merchantType} onValueChange={setMerchantType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="common">Tienda Común</SelectItem>
                <SelectItem value="wholesaler">Mayorista</SelectItem>
                <SelectItem value="distributor">Distribuidora</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold">Estado de Verificación</Label>
              <p className="text-xs text-muted-foreground">Otorga el sello de confianza de Pachapay</p>
            </div>
            <Button
              variant={isVerified ? "default" : "outline"}
              size="sm"
              onClick={() => setIsVerified(!isVerified)}
              className={isVerified ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {isVerified ? <ShieldCheck className="h-4 w-4 mr-1" /> : <ShieldAlert className="h-4 w-4 mr-1" />}
              {isVerified ? "Verificada" : "No Verif."}
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button 
            onClick={() => mutation.mutate({ merchantType, isVerified })}
            disabled={mutation.isPending}
          >
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AdminStoresTab() {
  const { toast } = useToast();
  const { data: stores, isLoading } = useStores();
  const [featuredStore, setFeaturedStore] = useState<StoreType | null>(null);
  const [sponsoredStore, setSponsoredStore] = useState<StoreType | null>(null);
  const [classificationStore, setClassificationStore] = useState<StoreType | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [verifyFilter, setVerifyFilter] = useState<string>("all");

  const filtered = (stores ?? []).filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                         s.category.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || s.merchantType === typeFilter;
    const matchesVerify = verifyFilter === "all" || 
                         (verifyFilter === "verified" && s.isVerified) || 
                         (verifyFilter === "unverified" && !s.isVerified);
    return matchesSearch && matchesType && matchesVerify;
  });

  const TIER_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
    premium: "default",
    basic: "secondary",
    free: "outline",
  };

  const TYPE_LABEL: Record<string, string> = {
    common: "Común",
    wholesaler: "Mayorista",
    distributor: "Distribuidora",
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Gestion de Tiendas
            </CardTitle>
            <CardDescription>
              {isLoading ? "Cargando..." : `${(stores ?? []).length} tienda${(stores ?? []).length !== 1 ? "s" : ""} registradas`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo Tipo</SelectItem>
                <SelectItem value="common">Tienda Común</SelectItem>
                <SelectItem value="wholesaler">Mayorista</SelectItem>
                <SelectItem value="distributor">Distribuidor</SelectItem>
              </SelectContent>
            </Select>

            <Select value={verifyFilter} onValueChange={setVerifyFilter}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue placeholder="Verif." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Estado Verif.</SelectItem>
                <SelectItem value="verified">Verificadas</SelectItem>
                <SelectItem value="unverified">No Verificadas</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Buscar tienda..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-40 h-8"
              data-testid="input-search-stores"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No hay tiendas que coincidan</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tienda</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Sello</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Destacada</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((store) => {
                    const isFeaturedActive =
                      store.isFeatured &&
                      (!store.featuredUntil || new Date(store.featuredUntil) > new Date());
                    return (
                      <TableRow key={store.id} data-testid={`row-store-${store.id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm flex items-center gap-2">
                              {store.name}
                              {store.isVerified && (
                                <ShieldCheck className="h-4 w-4 text-green-600" />
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">{store.address}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-tight">
                            {TYPE_LABEL[store.merchantType || "common"]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{store.category}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={TIER_VARIANT[store.subscriptionTier ?? "free"] ?? "outline"} className="capitalize text-xs">
                            {store.subscriptionTier ?? "free"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {store.isVerified ? (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 text-[10px]">
                              VERIFICADO
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] opacity-70">
                              SIN SELLO
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={store.isActive ? "default" : "secondary"} className="text-xs">
                            {store.isActive ? "Activa" : "Inactiva"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isFeaturedActive ? (
                            <div className="flex items-center gap-1">
                              <Badge className="text-[10px] flex items-center gap-1 bg-primary/10 text-primary border-primary/30">
                                <Sparkles className="h-3 w-3" />
                                Destacada
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2"
                              onClick={() => setClassificationStore(store)}
                              title="Configurar clasificación"
                            >
                              <Award className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant={isFeaturedActive ? "outline" : "secondary"}
                              className="h-7 px-2"
                              onClick={() => setFeaturedStore(store)}
                              data-testid={`button-toggle-featured-${store.id}`}
                              title="Destacar"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2"
                              onClick={() => setSponsoredStore(store)}
                              data-testid={`button-manage-sponsored-${store.id}`}
                              title="Productos patrocinados"
                            >
                              <Package className="h-3.5 w-3.5" />
                            </Button>
                          </div>
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

      {featuredStore && (
        <FeaturedDialog
          store={featuredStore}
          open={!!featuredStore}
          onClose={() => setFeaturedStore(null)}
        />
      )}

      {sponsoredStore && (
        <SponsoredDialog
          store={sponsoredStore}
          open={!!sponsoredStore}
          onClose={() => setSponsoredStore(null)}
        />
      )}
      
      {classificationStore && (
        <ClassificationDialog
          store={classificationStore}
          open={!!classificationStore}
          onClose={() => setClassificationStore(null)}
        />
      )}
    </>
  );
}
