import { Link } from "wouter";
import { Heart, Package, Store, ShoppingCart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useFavorites, useToggleFavorite } from "@/hooks/use-favorites";
import { useQuery } from "@tanstack/react-query";
import type { Product, Store as StoreType } from "@shared/schema";

function FavoriteProductCard({ productId, onRemove }: { productId: string; onRemove: () => void }) {
  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ["/api/products", productId],
    queryFn: async () => {
      const res = await fetch(`/api/products/${productId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });

  if (isLoading) return <div className="h-24 bg-muted rounded-lg animate-pulse" />;
  if (!product) return null;

  const price = parseFloat(product.price);
  const formatted = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(price);

  return (
    <div className="flex items-center gap-4 p-3 border rounded-lg" data-testid={`favorite-product-${productId}`}>
      <div className="w-16 h-16 rounded-md overflow-hidden bg-muted shrink-0">
        {product.image ? (
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm line-clamp-1" data-testid={`text-fav-product-name-${productId}`}>{product.name}</p>
        <p className="text-sm font-bold text-foreground mt-0.5">{formatted}</p>
        {product.stock === 0 && (
          <Badge variant="secondary" className="text-xs mt-1">Sin stock</Badge>
        )}
      </div>
      <div className="flex gap-2 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onRemove}
          data-testid={`button-remove-fav-${productId}`}
        >
          <Heart className="h-4 w-4 fill-current" />
        </Button>
        <Link href={`/store/${product.storeId}`}>
          <Button size="sm" variant="outline" disabled={product.stock === 0} data-testid={`button-fav-go-store-${productId}`}>
            <ShoppingCart className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

function FavoriteStoreCard({ storeId, onRemove }: { storeId: string; onRemove: () => void }) {
  const { data: store, isLoading } = useQuery<StoreType>({
    queryKey: ["/api/stores", storeId],
    queryFn: async () => {
      const res = await fetch(`/api/stores/${storeId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });

  if (isLoading) return <div className="h-24 bg-muted rounded-lg animate-pulse" />;
  if (!store) return null;

  return (
    <div className="flex items-center gap-4 p-3 border rounded-lg" data-testid={`favorite-store-${storeId}`}>
      <div className="w-16 h-16 rounded-md overflow-hidden bg-muted shrink-0">
        {store.logo ? (
          <img src={store.logo} alt={store.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary/10">
            <span className="text-xl font-bold text-primary">{store.name.charAt(0)}</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm line-clamp-1">{store.name}</p>
        <Badge variant="secondary" className="text-xs mt-1">{store.category}</Badge>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onRemove}
          data-testid={`button-remove-fav-store-${storeId}`}
        >
          <Heart className="h-4 w-4 fill-current" />
        </Button>
        <Link href={`/store/${storeId}`}>
          <Button size="sm" variant="outline" data-testid={`button-fav-visit-store-${storeId}`}>
            <Store className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function Favorites() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: productFavs, isLoading: loadingP } = useFavorites("product");
  const { data: storeFavs, isLoading: loadingS } = useFavorites("store");
  const toggleFavorite = useToggleFavorite();

  if (authLoading) return (
    <div className="min-h-screen max-w-3xl mx-auto px-4 py-6 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (!isAuthenticated) return (
    <div className="min-h-screen max-w-3xl mx-auto px-4 py-6">
      <Card><CardContent className="py-12 text-center">
        <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="font-semibold mb-2">Iniciá sesión para ver tus favoritos</p>
        <Link href="/auth"><Button className="mt-2">Iniciar Sesión</Button></Link>
      </CardContent></Card>
    </div>
  );

  return (
    <div className="min-h-screen max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Heart className="h-6 w-6 text-primary" />
          Mis Favoritos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Productos y tiendas que guardaste</p>
      </div>

      <Tabs defaultValue="products">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="products" data-testid="tab-fav-products">
            Productos {productFavs?.length ? `(${productFavs.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="stores" data-testid="tab-fav-stores">
            Tiendas {storeFavs?.length ? `(${storeFavs.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-3 mt-4">
          {loadingP ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />)}
            </div>
          ) : !productFavs?.length ? (
            <Card><CardContent className="py-12 text-center">
              <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">Sin productos guardados</p>
              <p className="text-sm text-muted-foreground mt-1">Tocá el corazón en cualquier producto para guardarlo acá</p>
              <Link href="/explore"><Button variant="outline" className="mt-4">Explorar productos</Button></Link>
            </CardContent></Card>
          ) : (
            productFavs.map((fav) => (
              <FavoriteProductCard
                key={fav.id}
                productId={fav.targetId}
                onRemove={() => toggleFavorite.mutate({ targetId: fav.targetId, type: "product", isFav: true })}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="stores" className="space-y-3 mt-4">
          {loadingS ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />)}
            </div>
          ) : !storeFavs?.length ? (
            <Card><CardContent className="py-12 text-center">
              <Store className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">Sin tiendas guardadas</p>
              <p className="text-sm text-muted-foreground mt-1">Guardá tus tiendas favoritas para encontrarlas rápido</p>
              <Link href="/explore"><Button variant="outline" className="mt-4">Explorar tiendas</Button></Link>
            </CardContent></Card>
          ) : (
            storeFavs.map((fav) => (
              <FavoriteStoreCard
                key={fav.id}
                storeId={fav.targetId}
                onRemove={() => toggleFavorite.mutate({ targetId: fav.targetId, type: "store", isFav: true })}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
