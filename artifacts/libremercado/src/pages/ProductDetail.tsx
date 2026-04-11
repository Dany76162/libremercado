import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ShoppingCart, Star, Truck, Shield, Heart, Zap, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useIsFavorite, useToggleFavorite } from "@/hooks/use-favorites";
import type { Product } from "@shared/schema";

export default function ProductDetail() {
  const [, params] = useRoute("/product/:id");
  const productId = params?.id || "";
  const [mainIdx, setMainIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const addItem = useCart((s) => s.addItem);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const { data: favData } = useIsFavorite(productId, "product");
  const isFav = favData?.isFavorite ?? false;
  const toggleFav = useToggleFavorite();

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ["/api/products", productId],
    queryFn: async () => {
      const res = await fetch(`/api/products/${productId}`);
      if (!res.ok) throw new Error("Producto no encontrado");
      return res.json();
    },
    enabled: !!productId,
  });

  const { data: storeData } = useQuery<{ id: string; name: string; rating: string; category: string }>({
    queryKey: ["/api/stores", product?.storeId],
    queryFn: async () => {
      const res = await fetch(`/api/stores/${product!.storeId}`);
      return res.json();
    },
    enabled: !!product?.storeId,
  });

  const parseImages = (p: Product): string[] => {
    let imgs: string[] = [];
    try { imgs = JSON.parse(p.images || "[]"); } catch {}
    if (imgs.length === 0 && (p.image || p.imageUrl)) {
      imgs = [p.image || p.imageUrl || ""];
    }
    return imgs.filter(Boolean);
  };

  const formatPrice = (val: string | number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(Number(val));

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Skeleton className="h-6 w-32 mb-6" />
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <Skeleton className="aspect-square rounded-xl mb-3" />
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="w-20 h-20 rounded-lg" />)}
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-sm w-full mx-4">
          <CardContent className="pt-6 text-center">
            <h2 className="text-lg font-semibold mb-2">Producto no encontrado</h2>
            <Link href="/explore">
              <Button className="mt-4">Explorar productos</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const images = parseImages(product);
  const mainImage = images[mainIdx] || "";
  const price = parseFloat(product.price);
  const originalPrice = product.originalPrice ? parseFloat(product.originalPrice) : null;
  const hasDiscount = originalPrice && originalPrice > price;
  const discountPercent = hasDiscount ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

  const handleAddToCart = () => {
    addItem(product);
    toast({ title: "Agregado al carrito", description: `${product.name} se agregó correctamente` });
  };

  const prevImage = () => setMainIdx((i) => (i === 0 ? images.length - 1 : i - 1));
  const nextImage = () => setMainIdx((i) => (i === images.length - 1 ? 0 : i + 1));

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/explore">
            <button className="hover:text-foreground transition-colors flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Explorar
            </button>
          </Link>
          {storeData && (
            <>
              <span>/</span>
              <Link href={`/store/${product.storeId}`}>
                <button className="hover:text-foreground transition-colors">{storeData.name}</button>
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-foreground line-clamp-1 max-w-[200px]">{product.name}</span>
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* ── Image Gallery ── */}
          <div>
            {/* Main image */}
            <div
              className="relative aspect-square rounded-xl overflow-hidden bg-muted mb-3 cursor-zoom-in group"
              onClick={() => setLightbox(true)}
            >
              {mainImage ? (
                <img
                  src={mainImage}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  data-testid="img-product-main"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingCart className="h-16 w-16 text-muted-foreground/30" />
                </div>
              )}

              {/* Nav arrows */}
              {images.length > 1 && (
                <>
                  <button
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); prevImage(); }}
                    data-testid="btn-prev-image"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); nextImage(); }}
                    data-testid="btn-next-image"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}

              {/* Image counter */}
              {images.length > 1 && (
                <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
                  {mainIdx + 1} / {images.length}
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1" data-testid="section-thumbnails">
                {images.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setMainIdx(i)}
                    data-testid={`thumb-${i}`}
                    className={`shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      i === mainIdx
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-transparent hover:border-muted-foreground/40"
                    }`}
                  >
                    <img src={src} alt={`${product.name} ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Product Info ── */}
          <div className="flex flex-col gap-4">
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {product.isSponsored && (
                <Badge className="bg-accent text-accent-foreground flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Patrocinado
                </Badge>
              )}
              {hasDiscount && (
                <Badge className="bg-destructive text-destructive-foreground">
                  -{discountPercent}% OFF
                </Badge>
              )}
              {product.category && (
                <Badge variant="secondary">{product.category}</Badge>
              )}
            </div>

            {/* Name */}
            <h1 className="text-2xl font-bold leading-tight" data-testid="text-product-name">
              {product.name}
            </h1>

            {/* Store */}
            {storeData && (
              <Link href={`/store/${product.storeId}`}>
                <div className="flex items-center gap-2 text-sm hover:text-primary transition-colors cursor-pointer w-fit">
                  {storeData.rating && (
                    <span className="flex items-center gap-0.5 text-yellow-500 font-medium">
                      <Star className="h-3.5 w-3.5 fill-yellow-500" />
                      {parseFloat(storeData.rating).toFixed(1)}
                    </span>
                  )}
                  <span className="text-muted-foreground">por</span>
                  <span className="font-medium underline-offset-2 hover:underline">{storeData.name}</span>
                </div>
              </Link>
            )}

            <Separator />

            {/* Price */}
            <div>
              {hasDiscount && (
                <p className="text-sm text-muted-foreground line-through mb-0.5">
                  {formatPrice(originalPrice)}
                </p>
              )}
              <p className="text-4xl font-bold text-foreground" data-testid="text-product-price">
                {formatPrice(price)}
              </p>
              {hasDiscount && (
                <p className="text-sm text-green-600 dark:text-green-400 font-medium mt-1">
                  Ahorrás {formatPrice(originalPrice! - price)}
                </p>
              )}
            </div>

            {/* Stock */}
            {typeof product.stock === "number" && (
              <div className="text-sm">
                {product.stock === 0 ? (
                  <Badge variant="secondary">Sin stock</Badge>
                ) : product.stock <= 5 ? (
                  <span className="text-destructive font-medium">¡Solo quedan {product.stock} unidades!</span>
                ) : (
                  <span className="text-green-600 dark:text-green-400 font-medium">✓ En stock ({product.stock} disponibles)</span>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                size="lg"
                className="flex-1 text-base"
                onClick={handleAddToCart}
                disabled={(product.stock ?? 1) === 0}
                data-testid="btn-add-cart"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Agregar al carrito
              </Button>
              {isAuthenticated && (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => toggleFav.mutate({ targetId: product.id, type: "product", isFav })}
                  data-testid="btn-favorite"
                >
                  <Heart className={`h-5 w-5 ${isFav ? "fill-primary text-primary" : ""}`} />
                </Button>
              )}
            </div>

            {/* Benefits */}
            <div className="flex flex-col gap-2 pt-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Truck className="h-4 w-4 text-primary" />
                <span>Envío disponible a domicilio</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4 text-primary" />
                <span>Compra protegida por PachaPay</span>
              </div>
            </div>

            <Separator />

            {/* Description */}
            {product.description && (
              <div>
                <h3 className="font-semibold mb-2">Descripción</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && mainImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <img
            src={mainImage}
            alt={product.name}
            className="max-w-full max-h-full rounded-lg object-contain"
          />
          {images.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full p-2"
                onClick={(e) => { e.stopPropagation(); prevImage(); }}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full p-2"
                onClick={(e) => { e.stopPropagation(); nextImage(); }}
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
