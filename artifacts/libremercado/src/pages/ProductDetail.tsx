import { useState, useEffect } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, ShoppingCart, Star, Truck, ShieldCheck, Heart, Zap, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useIsFavorite, useToggleFavorite } from "@/hooks/use-favorites";
import { ProductCard } from "@/components/marketplace/ProductCard";
import type { Product } from "@shared/schema";
import { apiUrl, resolveMediaUrl } from "@/lib/apiBase";

interface ProductReel {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl?: string | null;
  viewsCount?: number | null;
}

export default function ProductDetail() {
  const [, params] = useRoute("/product/:id");
  const productId = params?.id || "";
  const [mainIdx, setMainIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [productId]);

  const addItem = useCart((s) => s.addItem);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const { data: favData } = useIsFavorite(productId, "product");
  const isFav = favData?.isFavorite ?? false;
  const toggleFav = useToggleFavorite();

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ["/api/products", productId],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/products/${productId}`));
      if (!res.ok) throw new Error("Producto no encontrado");
      return res.json();
    },
    enabled: !!productId,
  });

  const { data: storeData } = useQuery<{ id: string; name: string; rating: string; category: string }>({
    queryKey: ["/api/stores", product?.storeId],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/stores/${product!.storeId}`));
      return res.json();
    },
    enabled: !!product?.storeId,
  });

  const { data: productReel } = useQuery<ProductReel | null>({
    queryKey: ["/api/videos/feed", "product", productId],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/videos/feed?productId=${productId}&limit=1`));
      if (!res.ok) return null;
      const data = await res.json();
      return data[0] ?? null;
    },
    enabled: !!productId,
  });

  const { data: similarProducts } = useQuery<Product[]>({
    queryKey: ["/api/products", "similar", product?.category, productId],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/products?category=${product?.category}&limit=6`));
      const data = await res.json();
      return (data || []).filter((p: Product) => p.id !== productId);
    },
    enabled: !!product?.category,
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

  const openContextualFeed = () => {
    if (!product || !productReel) return;
    const returnTo = `/product/${product.id}`;
    const returnName = product.name;
    const params = new URLSearchParams({
      productId: product.id,
      storeId: product.storeId,
      returnTo,
      returnName,
    });
    navigate(`/videos?${params.toString()}`);
  };

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
  const hasReel = !!productReel?.videoUrl;
  const savings = hasDiscount && originalPrice ? originalPrice - price : 0;

  const handleAddToCart = () => {
    addItem(product);
    toast({ title: "Agregado al carrito", description: `${product.name} se agregó correctamente` });
  };

  const prevImage = () => setMainIdx((i) => (i === 0 ? images.length - 1 : i - 1));
  const nextImage = () => setMainIdx((i) => (i === images.length - 1 ? 0 : i + 1));

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto pb-20">
        {/* ── Hero Section (Two Columns) ── */}
        <div className="grid md:grid-cols-2 gap-0 md:gap-10 lg:gap-16 items-start mb-12">
          {/* Left: Gallery + Reel */}
          <div className="space-y-4 px-4 md:px-0 pt-2">
            <div className="relative group">
              <div 
                className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar rounded-2xl bg-muted aspect-square w-full shadow-sm"
                onScroll={(e) => {
                  const scrollLeft = (e.target as HTMLDivElement).scrollLeft;
                  const width = (e.target as HTMLDivElement).clientWidth;
                  const idx = Math.round(scrollLeft / width);
                  if (idx !== mainIdx) setMainIdx(idx);
                }}
              >
                {images.map((src, i) => (
                  <div key={i} className="shrink-0 w-full h-full snap-center cursor-zoom-in" onClick={() => setLightbox(true)}>
                    <img src={resolveMediaUrl(src) ?? src} alt={`${product.name} ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>

              {images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {images.map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === mainIdx ? "w-6 bg-primary" : "w-1.5 bg-white/60 shadow-sm"}`} />
                  ))}
                </div>
              )}
              
              <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                {product.isSponsored && (
                  <Badge className="bg-amber-500/90 text-white backdrop-blur-sm border-none flex items-center gap-1 shadow-sm">
                    <Zap className="h-3.5 w-3.5 fill-white" /> Patrocinado
                  </Badge>
                )}
                {hasDiscount && <Badge className="bg-red-600 font-bold shadow-sm border-none">-{discountPercent}% OFF</Badge>}
              </div>
            </div>

            {hasReel && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full h-12 rounded-xl bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/30 text-amber-600 px-6 font-black transition-all relative overflow-hidden group"
                  onClick={openContextualFeed}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <div className="bg-amber-500 text-white rounded-full p-1.5 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                        <Play className="h-3.5 w-3.5 fill-white" />
                      </div>
                      <span className="tracking-widest text-[11px] uppercase">Experiencia ReelMark</span>
                    </div>
                    <Zap className="h-4 w-4 fill-amber-500 animate-pulse opacity-70" />
                  </div>
                  <div className="absolute top-0 -left-[100%] w-1/4 h-full bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-[-25deg] group-hover:left-[150%] transition-all duration-700" />
                </Button>
              </div>
            )}
          </div>

          {/* Right: Product Info */}
          <div className="flex flex-col gap-6 p-5 md:p-0 md:pt-4">
            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-foreground leading-[1.1] tracking-tight">{product.name}</h1>
              {storeData && (
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  {storeData.rating && (
                    <div className="flex items-center gap-1 bg-yellow-400/20 text-yellow-700 font-bold px-2 py-0.5 rounded-full">
                      <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" /> {parseFloat(storeData.rating).toFixed(1)}
                    </div>
                  )}
                  <span className="text-muted-foreground/60">por</span>
                  <Link href={`/store/${product.storeId}`}>
                    <span className="font-extrabold text-primary hover:underline cursor-pointer animate-[glow_3s_ease-in-out_infinite] block">{storeData?.name || product.store?.name}</span>
                  </Link>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl md:text-5xl font-black tracking-tighter text-foreground">{formatPrice(price)}</span>
                {hasDiscount && <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 font-bold">{discountPercent}% OFF</Badge>}
              </div>
              {hasDiscount && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground line-through text-lg">{formatPrice(originalPrice!)}</span>
                  <span className="text-emerald-600 font-bold text-sm">Ahorrás {formatPrice(savings)}</span>
                </div>
              )}
            </div>

            {typeof product.stock === "number" && (
              <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 p-3 rounded-xl flex items-center gap-2 text-sm font-bold">
                <div className={`h-2 w-2 rounded-full ${product.stock === 0 ? "bg-red-500" : "bg-emerald-500"} animate-pulse`} />
                {product.stock === 0 ? "SIN STOCK" : `STOCK DISPONIBLE (${product.stock} unidades)`}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button size="lg" className="flex-1 h-14 rounded-2xl bg-white border-2 border-primary text-primary hover:bg-primary hover:text-white transition-all duration-300 font-black text-lg gap-2 group shadow-sm shadow-primary/10" onClick={handleAddToCart} disabled={(product.stock ?? 1) === 0}>
                <ShoppingCart className="h-5 w-5 group-hover:scale-110 transition-transform" /> AGREGAR AL CARRITO
              </Button>
              {isAuthenticated && (
                <Button variant="outline" size="lg" className={`h-14 w-14 rounded-2xl border-2 transition-all ${isFav ? "border-primary bg-primary/5 text-primary" : "border-muted hover:border-primary hover:text-primary"}`} onClick={() => toggleFav.mutate({ targetId: product.id, type: "product", isFav })}>
                  <Heart className={`h-6 w-6 ${isFav ? "fill-primary" : ""}`} />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-muted/30 p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2 hover:bg-muted/50 transition-colors">
                <div className="bg-white p-2 rounded-xl shadow-sm"><Truck className="h-5 w-5 text-primary" /></div>
                <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">ENVÍO A DOMICILIO</span>
              </div>
              <div className="bg-muted/30 p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2 hover:bg-muted/50 transition-colors">
                <div className="bg-white p-2 rounded-xl shadow-sm"><ShieldCheck className="h-5 w-5 text-primary" /></div>
                <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">COMPRA PROTEGIDA</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Wide Content Section ── */}
        <div className="px-5 md:px-0 space-y-12">
          {/* Similar Products */}
          {similarProducts && similarProducts.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <div className="w-1 h-5 bg-primary rounded-full" />
                Productos Similares
              </h3>
              <div className="flex gap-4 overflow-x-auto pb-6 hide-scrollbar snap-x snap-mandatory">
                {similarProducts.map(p => (
                  <div key={p.id} className="w-[200px] md:w-[240px] shrink-0 snap-start">
                    <ProductCard product={p} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {product.description && (
            <div className="bg-muted/20 p-6 md:p-8 rounded-[2rem]">
              <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-2">
                <div className="w-1 h-5 bg-primary rounded-full" />
                Descripción
              </h3>
              <p className="text-base md:text-lg text-foreground/80 leading-relaxed whitespace-pre-wrap max-w-4xl">{product.description}</p>
            </div>
          )}

          {/* Attributes */}
          {(() => {
            let parsedAttrs: Record<string, string> = {};
            try { parsedAttrs = JSON.parse((product as any).attributes || "{}"); } catch {}
            const entries = Object.entries(parsedAttrs);
            if (entries.length === 0) return null;
            return (
              <div className="space-y-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <div className="w-1 h-5 bg-primary rounded-full" />
                  Especificaciones
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {entries.map(([key, val]) => (
                    <div key={key} className="flex justify-between items-center bg-muted/40 p-4 rounded-xl border border-muted-foreground/5 hover:border-primary/20 transition-colors">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{key}</span>
                      <span className="text-sm font-black text-foreground">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && mainImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <img
            src={resolveMediaUrl(mainImage) ?? mainImage}
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
