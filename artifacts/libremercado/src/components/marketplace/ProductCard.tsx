import { ShoppingCart, Heart, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { useIsFavorite, useToggleFavorite } from "@/hooks/use-favorites";
import { useAuth } from "@/hooks/use-auth";
import type { Product } from "@shared/schema";
import { resolveMediaUrl } from "@/lib/apiBase";

interface ProductCardProps {
  product: Product;
  showStore?: boolean;
}

export function ProductCard({ product, showStore = false }: ProductCardProps) {
  const addItem = useCart((state) => state.addItem);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const { data: favData } = useIsFavorite(product.id, "product");
  const isFav = favData?.isFavorite ?? false;
  const toggleFav = useToggleFavorite();

  const price = parseFloat(product.price);
  const originalPrice = product.originalPrice ? parseFloat(product.originalPrice) : null;
  const hasDiscount = originalPrice && originalPrice > price;
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
    toast({
      title: "Agregado al carrito",
      description: `${product.name} se agregó correctamente`,
    });
  };

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Link href={`/product/${product.id}`} className="block h-full">
    <Card
      className="group overflow-hidden hover-elevate active-elevate-2 cursor-pointer transition-all h-full flex flex-col"
      data-testid={`card-product-${product.id}`}
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {product.image ? (
          <img
            src={resolveMediaUrl(product.image) ?? product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/10 flex items-center justify-center">
            <ShoppingCart className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}

        {product.isSponsored && (
          <Badge
            className="absolute top-2 left-2 bg-accent text-accent-foreground flex items-center gap-1"
            data-testid={`badge-sponsored-${product.id}`}
          >
            <Zap className="h-3 w-3" />
            Patrocinado
          </Badge>
        )}

        {!product.isSponsored && hasDiscount && (
          <Badge
            className="absolute top-2 left-2 bg-destructive text-destructive-foreground"
            data-testid={`badge-discount-${product.id}`}
          >
            -{discountPercent}%
          </Badge>
        )}

        {product.isSponsored && hasDiscount && (
          <Badge
            className="absolute top-2 left-2 mt-7 bg-destructive text-destructive-foreground"
            data-testid={`badge-discount-${product.id}`}
          >
            -{discountPercent}%
          </Badge>
        )}

        {(product.stock ?? 0) === 0 && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <Badge variant="secondary">Sin stock</Badge>
          </div>
        )}

        {isAuthenticated && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 rounded-full shadow-md"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFav.mutate({ targetId: product.id, type: "product", isFav });
              }}
              data-testid={`button-favorite-${product.id}`}
            >
              <Heart className={`h-4 w-4 ${isFav ? "fill-primary text-primary" : ""}`} />
            </Button>
          </div>
        )}
      </div>

      <CardContent className="p-3 flex-1 flex flex-col">
        <h3
          className="text-sm font-medium line-clamp-2 mb-2 flex-1"
          data-testid={`text-product-name-${product.id}`}
        >
          {product.name}
        </h3>

        <div className="space-y-1">
          {hasDiscount && (
            <p className="text-xs text-muted-foreground line-through">
              {formatPrice(originalPrice)}
            </p>
          )}
          <p
            className="text-lg font-bold text-foreground"
            data-testid={`text-product-price-${product.id}`}
          >
            {formatPrice(price)}
          </p>
        </div>

        {(product.stock ?? 0) > 0 && (product.stock ?? 0) <= 5 && (
          <p className="text-xs text-destructive mt-1">
            ¡Solo quedan {product.stock ?? 0}!
          </p>
        )}

        <Button
          size="sm"
          className="w-full mt-3"
          onClick={handleAddToCart}
          disabled={(product.stock ?? 0) === 0}
          data-testid={`button-add-cart-${product.id}`}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Agregar
        </Button>
      </CardContent>
    </Card>
    </Link>
  );
}
