import { useRoute } from "wouter";
import { Star, MapPin, Clock, Phone, ArrowLeft, MessageSquare, Images, Play, ShoppingCart, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { useStore, useStoreProducts } from "@/hooks/use-marketplace";
import type { Review } from "@shared/schema";

interface VideoFeedItem {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl?: string | null;
  viewsCount?: number | null;
  isFeatured?: boolean | null;
  product?: { id: string; name: string; price: string; image: string | null; originalPrice: string | null } | null;
}

export default function StoreDetails() {
  const [match, params] = useRoute("/store/:id");
  const storeId = params?.id || "";
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const { data: store, isLoading: storeLoading } = useStore(storeId);
  const { data: products, isLoading: productsLoading } = useStoreProducts(storeId);

  const { data: reviewsData } = useQuery<{ reviews: Review[]; avgRating: number; total: number }>({
    queryKey: ["/api/stores", storeId, "reviews"],
    queryFn: async () => {
      const res = await fetch(`/api/stores/${storeId}/reviews`);
      return res.json();
    },
    enabled: !!storeId,
  });

  const { data: storeVideos } = useQuery<VideoFeedItem[]>({
    queryKey: ["/api/videos/feed", storeId],
    queryFn: async () => {
      const res = await fetch(`/api/videos/feed?storeId=${storeId}&limit=1`);
      return res.json();
    },
    enabled: !!storeId,
  });
  const featuredReel = storeVideos?.[0] ?? null;

  if (storeLoading) {
    return (
      <div className="min-h-screen">
        <Skeleton className="w-full h-48 md:h-64" />
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-start gap-4 mb-6">
            <Skeleton className="w-20 h-20 rounded-md" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}>
                <Skeleton className="aspect-square" />
                <CardContent className="p-3 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-6 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Tienda no encontrada</h2>
            <p className="text-muted-foreground mb-6">
              La tienda que buscas no existe o fue eliminada.
            </p>
            <Link href="/explore">
              <Button data-testid="button-back-explore">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Explorar Tiendas
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const productCategories = [
    "Todos",
    ...new Set((products ?? []).map((p) => p.category).filter(Boolean)),
  ];

  return (
    <div className="min-h-screen">
      <div className="relative h-48 md:h-64 bg-muted">
        {store.banner ? (
          <img
            src={store.banner}
            alt={store.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        <Link href="/explore">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 left-4 bg-black/30 text-white hover:bg-black/50"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-start gap-4 -mt-12 relative z-10 mb-6">
          {store.logo ? (
            <div className="w-24 h-24 rounded-md overflow-hidden bg-card shadow-lg border-4 border-card shrink-0">
              <img
                src={store.logo}
                alt={`${store.name} logo`}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-md bg-card shadow-lg border-4 border-card flex items-center justify-center shrink-0">
              <span className="text-3xl font-bold text-primary">
                {store.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          <div className="pt-14">
            <div className="flex items-center gap-3 mb-1">
              <h1
                className="text-2xl font-bold"
                data-testid="text-store-name"
              >
                {store.name}
              </h1>
              {store.rating && parseFloat(store.rating) > 0 && (
                <div className="flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  <span className="text-sm font-semibold">
                    {parseFloat(store.rating).toFixed(1)}
                  </span>
                </div>
              )}
            </div>
            <Badge variant="secondary" className="mb-2">
              {store.category}
            </Badge>
            {store.description && (
              <p className="text-muted-foreground text-sm max-w-2xl">
                {store.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span>Entrega disponible</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>Abierto ahora</span>
          </div>
          <div className="flex items-center gap-1">
            <Phone className="h-4 w-4" />
            <span>Contactar</span>
          </div>
        </div>

        {/* ── Reel section ── */}
        {featuredReel && (
          <div className="mb-6" data-testid="section-store-reel">
            <h3 className="text-base font-semibold flex items-center gap-2 mb-3">
              <Play className="h-4 w-4 text-primary" />
              Reel de la tienda
            </h3>
            <div className="flex flex-col sm:flex-row gap-4 bg-card border rounded-xl overflow-hidden shadow-sm">
              {/* Thumbnail / Video preview */}
              <Link href="/videos" className="block relative shrink-0 w-full sm:w-48 aspect-[9/16] sm:aspect-auto sm:h-48 bg-black group">
                {featuredReel.thumbnailUrl ? (
                  <img
                    src={featuredReel.thumbnailUrl}
                    alt={featuredReel.title}
                    className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                    data-testid="img-reel-thumbnail"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/40 to-accent/40" />
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white/90 hover:bg-white rounded-full p-3 shadow-lg transition-transform group-hover:scale-110">
                    <Play className="h-7 w-7 text-primary fill-primary" />
                  </div>
                </div>
                {featuredReel.isFeatured && (
                  <Badge className="absolute top-2 left-2 bg-accent text-accent-foreground text-xs">
                    Destacado
                  </Badge>
                )}
              </Link>

              {/* Info */}
              <div className="p-4 flex flex-col justify-between flex-1">
                <div>
                  <p className="font-semibold text-sm line-clamp-2 mb-2">{featuredReel.title}</p>
                  {featuredReel.product && (
                    <Link href={`/product/${featuredReel.product.id}`}>
                      <div className="flex items-center gap-3 bg-muted rounded-lg p-2 mb-3 hover:bg-muted/80 transition-colors cursor-pointer">
                        {featuredReel.product.image && (
                          <img
                            src={featuredReel.product.image}
                            alt={featuredReel.product.name}
                            className="w-12 h-12 rounded object-cover shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground line-clamp-1">{featuredReel.product.name}</p>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm text-foreground">
                              {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(parseFloat(featuredReel.product.price))}
                            </p>
                            {featuredReel.product.originalPrice && parseFloat(featuredReel.product.originalPrice) > parseFloat(featuredReel.product.price) && (
                              <p className="text-xs line-through text-muted-foreground">
                                {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(parseFloat(featuredReel.product.originalPrice))}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  )}
                </div>
                <div className="flex gap-2">
                  <Link href="/videos" className="flex-1">
                    <Button size="sm" className="w-full gap-1.5" data-testid="btn-watch-reel">
                      <Play className="h-3.5 w-3.5 fill-current" />
                      Ver Reel
                    </Button>
                  </Link>
                  {featuredReel.product && (
                    <Link href={`/product/${featuredReel.product.id}`}>
                      <Button size="sm" variant="outline" className="gap-1.5" data-testid="btn-reel-product">
                        <ShoppingCart className="h-3.5 w-3.5" />
                        Ver producto
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue="Todos" className="mb-6">
          <TabsList className="h-auto flex-wrap justify-start">
            {productCategories.map((cat) => (
              <TabsTrigger
                key={cat}
                value={cat || "Todos"}
                data-testid={`tab-category-${cat?.toLowerCase() || "todos"}`}
              >
                {cat || "Sin categoría"}
              </TabsTrigger>
            ))}
          </TabsList>

          {productCategories.map((cat) => (
            <TabsContent key={cat} value={cat || "Todos"} className="mt-6">
              {productsLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Card key={i}>
                      <Skeleton className="aspect-square" />
                      <CardContent className="p-3 space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-6 w-24" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {(products ?? [])
                    .filter((p) => cat === "Todos" || p.category === cat)
                    .map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Gallery section */}
        {(() => {
          let galleryImgs: string[] = [];
          try { galleryImgs = JSON.parse((store as any).images || "[]"); } catch {}
          if (galleryImgs.length === 0) return null;
          return (
            <div className="mb-6">
              <h3 className="text-base font-semibold flex items-center gap-2 mb-3">
                <Images className="h-4 w-4 text-muted-foreground" />
                Galería
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {galleryImgs.map((src, i) => (
                  <div
                    key={i}
                    className="aspect-video rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity bg-muted"
                    onClick={() => setLightboxImg(src)}
                  >
                    <img src={src} alt={`${store.name} ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Lightbox */}
        {lightboxImg && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightboxImg(null)}
          >
            <img src={lightboxImg} alt="Galería" className="max-w-full max-h-full rounded-lg object-contain" />
          </div>
        )}

        {/* Reviews section */}
        <Card className="mt-6" data-testid="section-reviews">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Reseñas de clientes
              {reviewsData?.total !== undefined && (
                <span className="font-normal text-muted-foreground text-sm">
                  ({reviewsData.total})
                </span>
              )}
              {reviewsData?.avgRating !== undefined && reviewsData.avgRating > 0 && (
                <span className="flex items-center gap-1 text-yellow-500 font-medium text-sm ml-auto">
                  <Star className="h-4 w-4 fill-yellow-500" />
                  {reviewsData.avgRating.toFixed(1)}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!reviewsData || reviewsData.reviews.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">
                Todavía no hay reseñas para esta tienda
              </p>
            ) : (
              <div className="space-y-4">
                {reviewsData.reviews.map((review, i) => (
                  <div key={review.id} data-testid={`review-${review.id}`}>
                    {i > 0 && <Separator className="mb-4" />}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-4 w-4 ${s <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {review.createdAt ? new Date(review.createdAt).toLocaleDateString("es-AR") : ""}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-muted-foreground mt-1">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
