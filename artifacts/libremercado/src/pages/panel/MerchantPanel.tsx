import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Package, ShoppingBag, BarChart3, Settings, Plus, Edit, Eye, Trash2, MapPin, Clock, Store, CheckCircle, XCircle, TrendingUp, DollarSign, ShoppingCart, AlertTriangle, Play, X, ImagePlus } from "lucide-react";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Order, Product, Store as StoreType } from "@shared/schema";
import { MerchantVideosTab } from "./tabs/MerchantVideosTab";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

const statusLabels: Record<Order["status"], string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  preparing: "Preparando",
  ready: "Listo",
  in_transit: "En camino",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const statusColors: Record<Order["status"], string> = {
  pending: "bg-yellow-500",
  confirmed: "bg-blue-500",
  preparing: "bg-orange-500",
  ready: "bg-green-500",
  in_transit: "bg-purple-500",
  delivered: "bg-green-700",
  cancelled: "bg-red-500",
};

const nextStatus: Partial<Record<Order["status"], Order["status"]>> = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "ready",
};

export default function MerchantPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("orders");
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    price: "",
    originalPrice: "",
    category: "",
    stock: 0,
    imageUrl: "",
    salesMode: "retail",
  });
  const [extraImages, setExtraImages] = useState<string[]>([]);
  const [attrs, setAttrs] = useState<{ key: string; value: string }[]>([]);
  
  const [showBulkPriceDialog, setShowBulkPriceDialog] = useState(false);
  const [bulkPercentage, setBulkPercentage] = useState<string>("");

  const { data: stores, isLoading: storesLoading } = useQuery<StoreType[]>({
    queryKey: ["/api/merchant/stores"],
  });

  const { data: orders, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/merchant/orders"],
  });

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/merchant/products"],
  });

  const { data: stats } = useQuery<{
    totalOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    totalRevenue: number;
    todayRevenue: number;
    weekRevenue: number;
    avgOrderValue: number;
    netRevenue: number;
    platformCommission: number;
    commissionRate: number;
    totalProducts: number;
    activeProducts: number;
    lowStockProducts: number;
    topProducts: { id: string; name: string; count: number; revenue: number }[];
    dailyRevenue: { date: string; revenue: number }[];
  }>({
    queryKey: ["/api/merchant/stats"],
    refetchInterval: 30000,
  });

  const store = stores?.[0];

  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/merchant/orders/${orderId}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/orders"] });
      toast({ title: "Pedido actualizado" });
    },
    onError: () => {
      toast({ title: "Error al actualizar pedido", variant: "destructive" });
    },
  });

  const updateStoreMutation = useMutation({
    mutationFn: async (data: Partial<StoreType>) => {
      const response = await apiRequest("PATCH", `/api/merchant/stores/${store?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/stores"] });
      toast({ title: "Tienda actualizada" });
    },
    onError: () => {
      toast({ title: "Error al actualizar tienda", variant: "destructive" });
    },
  });

  const buildProductPayload = (data: typeof productForm) => {
    const allImages = [data.imageUrl, ...extraImages].filter(Boolean);
    const attrsObj = attrs.reduce((acc, { key, value }) => {
      if (key.trim()) acc[key.trim()] = value.trim();
      return acc;
    }, {} as Record<string, string>);
    return {
      ...data,
      image: data.imageUrl || null,
      images: allImages.length > 0 ? JSON.stringify(allImages) : null,
      attributes: Object.keys(attrsObj).length > 0 ? JSON.stringify(attrsObj) : null,
      originalPrice: data.originalPrice || null,
    };
  };

  const createProductMutation = useMutation({
    mutationFn: async (data: typeof productForm) => {
      const response = await apiRequest("POST", "/api/merchant/products", {
        ...buildProductPayload(data),
        storeId: store?.id,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/products"] });
      setShowProductDialog(false);
      resetProductForm();
      toast({ title: "Producto creado" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Product> }) => {
      const response = await apiRequest("PATCH", `/api/merchant/products/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/products"] });
      setShowProductDialog(false);
      setEditingProduct(null);
      resetProductForm();
      toast({ title: "Producto actualizado" });
    },
    onError: () => {
      toast({ title: "Error al actualizar producto", variant: "destructive" });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/merchant/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/products"] });
      toast({ title: "Producto eliminado" });
    },
    onError: () => {
      toast({ title: "Error al eliminar producto", variant: "destructive" });
    },
  });

  const bulkPriceMutation = useMutation({
    mutationFn: async (percentage: number) => {
      const response = await apiRequest("POST", "/api/merchant/products/bulk/price", { percentage });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/products"] });
      setShowBulkPriceDialog(false);
      setBulkPercentage("");
      toast({ title: "Gestión Masiva Exitosa", description: `Se actualizaron ${data.count} productos.` });
    },
    onError: () => {
      toast({ title: "Error en actualización masiva", variant: "destructive" });
    },
  });

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(bulkPercentage);
    if (isNaN(val) || val === 0) {
      toast({ title: "Porcentaje inválido", variant: "destructive" });
      return;
    }
    bulkPriceMutation.mutate(val);
  };

  const resetProductForm = () => {
    setProductForm({ name: "", description: "", price: "", originalPrice: "", category: "", stock: 0, imageUrl: "", salesMode: "retail" });
    setExtraImages([]);
    setAttrs([]);
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    const existingImages: string[] = [];
    try {
      const parsed = JSON.parse(product.images || "[]");
      existingImages.push(...parsed);
    } catch {}
    const primaryImg = product.image || product.imageUrl || existingImages[0] || "";
    const rest = existingImages.filter((img) => img !== primaryImg);
    const existingAttrs: { key: string; value: string }[] = [];
    try {
      const parsed = JSON.parse(product.attributes || "{}");
      Object.entries(parsed).forEach(([k, v]) => existingAttrs.push({ key: k, value: String(v) }));
    } catch {}
    setProductForm({
      name: product.name,
      description: product.description || "",
      price: product.price,
      originalPrice: product.originalPrice || "",
      category: product.category || "",
      stock: product.stock ?? 0,
      imageUrl: primaryImg,
      salesMode: (product as any).salesMode || "retail",
    });
    setExtraImages(rest);
    setAttrs(existingAttrs);
    setShowProductDialog(true);
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = buildProductPayload(productForm);
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data: payload as any });
    } else {
      createProductMutation.mutate(productForm);
    }
  };

  const pendingOrders = (orders ?? []).filter((o) => o.status === "pending" || o.status === "confirmed");
  const preparingOrders = (orders ?? []).filter((o) => o.status === "preparing");
  const readyOrders = (orders ?? []).filter((o) => o.status === "ready");
  const todaySales = (orders ?? []).filter((o) => o.status === "delivered").reduce((sum, o) => sum + parseFloat(o.total), 0);

  if (storesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen max-w-4xl mx-auto px-4 py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No tenés una tienda</h2>
            <p className="text-muted-foreground mb-6">
              Tu cuenta de comerciante no tiene una tienda asociada. Contactá soporte.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-panel-title">
            {store.name}
          </h1>
          <p className="text-muted-foreground">
            Bienvenido, {user?.username}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={store.subscriptionTier === "premium" ? "default" : "secondary"}>
            Plan {store.subscriptionTier === "free" ? "Starter" : store.subscriptionTier === "basic" ? "Básico" : "Pro"}
          </Badge>
          <Dialog open={showProductDialog} onOpenChange={(open) => {
            setShowProductDialog(open);
            if (!open) {
              setEditingProduct(null);
              resetProductForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-product">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Producto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingProduct ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleProductSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                {/* Images section */}
                <div className="space-y-2">
                  <Label>Foto principal</Label>
                  <ImageUpload
                    endpoint="product"
                    value={productForm.imageUrl}
                    onChange={(url) => setProductForm({ ...productForm, imageUrl: url })}
                    label="Subir foto principal"
                    aspectRatio="square"
                  />
                </div>
                {/* Extra images */}
                {extraImages.length > 0 && (
                  <div className="space-y-2">
                    <Label>Fotos adicionales</Label>
                    {extraImages.map((img, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="flex-1">
                          <ImageUpload
                            endpoint="product"
                            value={img}
                            onChange={(url) => {
                              const updated = [...extraImages];
                              updated[idx] = url;
                              setExtraImages(updated);
                            }}
                            label={`Foto ${idx + 2}`}
                            aspectRatio="square"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 mt-1"
                          onClick={() => setExtraImages(extraImages.filter((_, i) => i !== idx))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {extraImages.length < 4 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1 w-full"
                    onClick={() => setExtraImages([...extraImages, ""])}
                  >
                    <ImagePlus className="h-4 w-4" />
                    Agregar otra foto
                  </Button>
                )}

                <div className="space-y-2">
                  <Label htmlFor="product-name">Nombre</Label>
                  <Input
                    id="product-name"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    required
                    data-testid="input-product-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product-desc">Descripción</Label>
                  <Textarea
                    id="product-desc"
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    className="resize-none"
                    rows={2}
                    data-testid="textarea-product-desc"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="product-price">Precio</Label>
                    <Input
                      id="product-price"
                      type="number"
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                      required
                      data-testid="input-product-price"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="product-original-price">Precio original (opcional)</Label>
                    <Input
                      id="product-original-price"
                      type="number"
                      value={productForm.originalPrice}
                      onChange={(e) => setProductForm({ ...productForm, originalPrice: e.target.value })}
                      data-testid="input-product-original-price"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="product-category">Categoría</Label>
                    <Input
                      id="product-category"
                      value={productForm.category}
                      onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                      data-testid="input-product-category"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="product-stock">Stock</Label>
                    <Input
                      id="product-stock"
                      type="number"
                      value={productForm.stock}
                      onChange={(e) => setProductForm({ ...productForm, stock: parseInt(e.target.value) || 0 })}
                      data-testid="input-product-stock"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Modo de venta</Label>
                    <Select
                      value={productForm.salesMode}
                      onValueChange={(val) => setProductForm({ ...productForm, salesMode: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="retail">Solo por menor</SelectItem>
                        <SelectItem value="wholesale">Solo por mayor</SelectItem>
                        <SelectItem value="both">Ambos (Mayorista y Minorista)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Attributes section */}
                <div className="space-y-2">
                  <Label>Características del producto</Label>
                  {attrs.map((attr, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input
                        placeholder="Ej: Talle, Color, Material"
                        value={attr.key}
                        onChange={(e) => {
                          const updated = [...attrs];
                          updated[idx] = { ...updated[idx], key: e.target.value };
                          setAttrs(updated);
                        }}
                        className="flex-1"
                        data-testid={`attr-key-${idx}`}
                      />
                      <Input
                        placeholder="Ej: M, Rojo, 100% algodón"
                        value={attr.value}
                        onChange={(e) => {
                          const updated = [...attrs];
                          updated[idx] = { ...updated[idx], value: e.target.value };
                          setAttrs(updated);
                        }}
                        className="flex-1"
                        data-testid={`attr-value-${idx}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setAttrs(attrs.filter((_, i) => i !== idx))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => setAttrs([...attrs, { key: "", value: "" }])}
                    data-testid="button-add-attr"
                  >
                    <Plus className="h-4 w-4" />
                    Agregar característica
                  </Button>
                </div>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Cancelar</Button>
                  </DialogClose>
                  <Button type="submit" disabled={createProductMutation.isPending || updateProductMutation.isPending} data-testid="button-save-product">
                    {editingProduct ? "Guardar" : "Crear"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pedidos Nuevos</p>
                <p className="text-2xl font-bold" data-testid="text-pending-orders">
                  {pendingOrders.length}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                <Package className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En Preparación</p>
                <p className="text-2xl font-bold" data-testid="text-preparing-orders">
                  {preparingOrders.length}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Listos</p>
                <p className="text-2xl font-bold" data-testid="text-ready-orders">
                  {readyOrders.length}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <Package className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ventas Hoy</p>
                <p className="text-2xl font-bold" data-testid="text-today-sales">
                  ${todaySales.toLocaleString("es-AR")}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="w-full overflow-x-auto mb-6 pb-2 border-b">
          <TabsList className="flex w-max min-w-full justify-start h-auto p-1 bg-transparent space-x-1">
            <TabsTrigger value="orders" data-testid="tab-orders" className="data-[state=active]:bg-muted">
              <Package className="h-4 w-4 mr-2" />
              Pedidos
            </TabsTrigger>
            <TabsTrigger value="products" data-testid="tab-products" className="data-[state=active]:bg-muted">
              <ShoppingBag className="h-4 w-4 mr-2" />
              Productos
            </TabsTrigger>
            <TabsTrigger value="stats" data-testid="tab-stats" className="data-[state=active]:bg-muted">
              <BarChart3 className="h-4 w-4 mr-2" />
              Estadísticas
            </TabsTrigger>
            <TabsTrigger value="videos" data-testid="tab-videos" className="data-[state=active]:bg-muted">
              <Play className="h-4 w-4 mr-2" />
              Reelmark
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings" className="data-[state=active]:bg-muted">
              <Settings className="h-4 w-4 mr-2" />
              Tienda
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="orders" className="mt-6">
          {ordersLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (orders ?? []).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Sin pedidos</h3>
                <p className="text-muted-foreground">
                  Los pedidos aparecerán aquí cuando los recibas
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {(orders ?? []).map((order) => (
                <Card key={order.id} data-testid={`card-order-${order.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-semibold">Pedido #{order.id.slice(0, 8)}</p>
                          <p className="text-sm text-muted-foreground">
                            ${parseFloat(order.total).toLocaleString("es-AR")} - {order.address}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <Badge className={`${statusColors[order.status]} text-white`}>
                          {statusLabels[order.status]}
                        </Badge>
                        {nextStatus[order.status] && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateOrderMutation.mutate({ orderId: order.id, status: nextStatus[order.status]! })}
                            disabled={updateOrderMutation.isPending}
                            data-testid={`button-next-status-${order.id}`}
                          >
                            {nextStatus[order.status] === "confirmed" && "Confirmar"}
                            {nextStatus[order.status] === "preparing" && "Preparar"}
                            {nextStatus[order.status] === "ready" && "Listo"}
                          </Button>
                        )}
                        {order.status === "pending" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateOrderMutation.mutate({ orderId: order.id, status: "cancelled" })}
                            disabled={updateOrderMutation.isPending}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="products" className="mt-6">
          {productsLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-32 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (products ?? []).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Sin productos</h3>
                <p className="text-muted-foreground mb-4">
                  Agregá tu primer producto para empezar a vender
                </p>
                <div className="flex justify-center gap-2">
                  <Button onClick={() => setShowProductDialog(true)} data-testid="button-add-first-product">
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Producto
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end gap-2">
                <Dialog open={showBulkPriceDialog} onOpenChange={setShowBulkPriceDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline"><Settings className="h-4 w-4 mr-2" /> Gestión Masiva</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Aumento Masivo de Precios</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleBulkSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Porcentaje de aumento (%)</Label>
                        <Input 
                          type="number" 
                          step="0.1" 
                          placeholder="Ej: 10 para aumentar un 10%" 
                          value={bulkPercentage}
                          onChange={(e) => setBulkPercentage(e.target.value)}
                          required
                        />
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setShowBulkPriceDialog(false)}>Cancelar</Button>
                        <Button type="submit" disabled={bulkPriceMutation.isPending}>Aplicar Cambios</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(products ?? []).map((product) => (
                <Card key={product.id} data-testid={`card-product-${product.id}`}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">{product.name}</h3>
                      <Badge variant={product.isActive ? "default" : "secondary"}>
                        {product.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    {product.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{product.description}</p>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-lg">${parseFloat(product.price).toLocaleString("es-AR")}</span>
                      {product.originalPrice && (
                        <span className="text-sm text-muted-foreground line-through">
                          ${parseFloat(product.originalPrice).toLocaleString("es-AR")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Stock: {product.stock}</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditProduct(product)} data-testid={`button-edit-${product.id}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteProductMutation.mutate(product.id)}
                          disabled={deleteProductMutation.isPending}
                          data-testid={`button-delete-${product.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="stats" className="mt-6 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">Hoy</p>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xl font-bold" data-testid="text-stat-today">
                  ${(stats?.todayRevenue ?? 0).toLocaleString("es-AR")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">Esta semana</p>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xl font-bold" data-testid="text-stat-week">
                  ${(stats?.weekRevenue ?? 0).toLocaleString("es-AR")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">Total pedidos</p>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xl font-bold" data-testid="text-stat-orders">
                  {stats?.totalOrders ?? (orders ?? []).length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">Ticket promedio</p>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xl font-bold" data-testid="text-stat-avg">
                  ${(stats?.avgOrderValue ?? 0).toLocaleString("es-AR")}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Análisis Financiero y Liquidación</CardTitle>
                <CardDescription>Resumen de cobros y comisiones de plataforma</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Ingresos Brutos Topes</span>
                    <span className="font-semibold">${stats?.totalRevenue?.toLocaleString("es-AR") ?? 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Comisión LibreMercado ({((stats?.commissionRate ?? 0) * 100).toFixed(0)}%)</span>
                    <span className="text-red-500 font-semibold">-${stats?.platformCommission?.toLocaleString("es-AR") ?? 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 bg-muted/20 rounded-md px-2">
                    <span className="font-bold">A Liquidar / Tu Ganancia Neta</span>
                    <span className="font-bold text-green-600">${stats?.netRevenue?.toLocaleString("es-AR") ?? 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Chart */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Rendimiento de Ventas (7 días)</CardTitle>
                <CardDescription>Ingresos brutos diarios en ARS</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats?.dailyRevenue ?? []}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                        tickFormatter={(value) => `$${value}`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorRevenue)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Revenue breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ingresos y Comisiones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg border border-border/50">
                  <span className="text-sm font-medium">Ingresos brutos</span>
                  <span className="font-bold text-lg">${(stats?.totalRevenue ?? 0).toLocaleString("es-AR")}</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      Comisión PachaPay ({((stats?.commissionRate ?? 0.07) * 100).toFixed(0)}%)
                      <AlertTriangle className="h-3 w-3 text-yellow-500" />
                    </span>
                    <span className="font-medium text-destructive">-${(stats?.platformCommission ?? 0).toLocaleString("es-AR")}</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-destructive transition-all duration-1000" 
                      style={{ width: `${(stats?.platformCommission ?? 0) / (stats?.totalRevenue || 1) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center py-4 border-t border-b border-dashed">
                  <span className="font-bold text-lg">Ingresos netos</span>
                  <span className="font-black text-2xl text-green-600 dark:text-green-400">
                    ${(stats?.netRevenue ?? 0).toLocaleString("es-AR")}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-2 rounded-md bg-muted/20 border">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Entregados</p>
                    <p className="font-bold">{stats?.deliveredOrders ?? 0}</p>
                  </div>
                  <div className="p-2 rounded-md bg-muted/20 border">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Cancelados</p>
                    <p className="font-bold text-destructive">{stats?.cancelledOrders ?? 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Products Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Productos más vendidos</CardTitle>
                <CardDescription>Por cantidad de unidades</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={stats?.topProducts ?? []} margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--muted))" />
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={100}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip 
                        cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {(stats?.topProducts ?? []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={`hsl(var(--primary) / ${1 - index * 0.15})`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Products */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Estado de Productos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total publicados</span>
                  <span className="font-semibold">{stats?.totalProducts ?? (products ?? []).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Activos</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">{stats?.activeProducts ?? 0}</span>
                </div>
                {(stats?.lowStockProducts ?? 0) > 0 && (
                  <div className="flex items-center justify-between p-2 rounded-md bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400">
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      Stock bajo (≤3 unidades)
                    </span>
                    <span className="font-semibold">{stats?.lowStockProducts}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-muted-foreground pt-2 border-t">
                  <span>Plan actual</span>
                  <span className="capitalize font-medium">
                    {store?.subscriptionTier === "free" ? "Starter" : store?.subscriptionTier === "basic" ? "Básico" : "Pro"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Daily revenue mini chart */}
          {stats?.dailyRevenue && stats.dailyRevenue.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ventas últimos 7 días</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const maxRev = Math.max(...stats.dailyRevenue.map((d) => d.revenue), 1);
                  return (
                    <div className="flex items-end gap-2 h-28">
                      {stats.dailyRevenue.map((d, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-xs text-muted-foreground">
                            {d.revenue > 0 ? `$${Math.round(d.revenue / 1000)}k` : ""}
                          </span>
                          <div
                            className="w-full rounded-t-sm bg-primary/80 transition-all"
                            style={{ height: `${Math.max((d.revenue / maxRev) * 80, 2)}px` }}
                            data-testid={`bar-daily-${i}`}
                          />
                          <span className="text-xs text-muted-foreground truncate w-full text-center">{d.date}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* Top products */}
          {stats?.topProducts && stats.topProducts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Productos más vendidos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.topProducts.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3" data-testid={`row-top-product-${i}`}>
                      <span className="text-muted-foreground font-mono text-sm w-5">#{i + 1}</span>
                      <span className="flex-1 font-medium truncate">{p.name}</span>
                      <span className="text-sm text-muted-foreground">{p.count} ventas</span>
                      <span className="text-sm font-semibold">${p.revenue.toLocaleString("es-AR")}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="videos" className="mt-6">
          <MerchantVideosTab />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de la Tienda</CardTitle>
              <CardDescription>Actualizá los datos de tu negocio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Logo de la tienda</Label>
                  <ImageUpload
                    endpoint="store"
                    value={(store as any).logo || null}
                    onChange={(url) => updateStoreMutation.mutate({ logo: url })}
                    label="Subir logo"
                    aspectRatio="square"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Imagen de portada</Label>
                  <ImageUpload
                    endpoint="store"
                    value={(store as any).banner || (store as any).coverImageUrl || (store as any).coverImage || null}
                    onChange={(url) => updateStoreMutation.mutate({ banner: url })}
                    label="Subir portada"
                    aspectRatio="landscape"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre de la tienda</Label>
                  <div className="flex gap-2">
                    <Input defaultValue={store.name} id="store-name" data-testid="input-store-name" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input defaultValue={store.phone || ""} id="store-phone" data-testid="input-store-phone" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  defaultValue={store.description || ""}
                  id="store-desc"
                  className="resize-none"
                  rows={3}
                  data-testid="textarea-store-desc"
                />
              </div>

              <div className="space-y-2">
                <Label>
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Dirección
                </Label>
                <Input defaultValue={store.address || ""} id="store-address" data-testid="input-store-address" />
              </div>

              <div className="space-y-2">
                <Label>
                  <Clock className="h-4 w-4 inline mr-1" />
                  Horarios de atención
                </Label>
                <Input
                  defaultValue={store.openingHours || ""}
                  placeholder="Ej: Lun-Vie 9:00-18:00"
                  id="store-hours"
                  data-testid="input-store-hours"
                />
              </div>

              <Button
                onClick={() => {
                  const name = (document.getElementById("store-name") as HTMLInputElement).value;
                  const phone = (document.getElementById("store-phone") as HTMLInputElement).value;
                  const description = (document.getElementById("store-desc") as HTMLTextAreaElement).value;
                  const address = (document.getElementById("store-address") as HTMLInputElement).value;
                  const openingHours = (document.getElementById("store-hours") as HTMLInputElement).value;
                  updateStoreMutation.mutate({ name, phone, description, address, openingHours });
                }}
                disabled={updateStoreMutation.isPending}
                data-testid="button-save-store"
              >
                Guardar cambios
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
