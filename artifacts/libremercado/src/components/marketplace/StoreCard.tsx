import { Link } from "wouter";
import { Star, MapPin, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Store } from "@shared/schema";
import { resolveMediaUrl } from "@/lib/apiBase";

interface StoreCardProps {
  store: Store;
}

export function StoreCard({ store }: StoreCardProps) {
  return (
    <Link href={`/store/${store.id}`}>
      <Card
        className="group overflow-hidden card-hover-effect cursor-pointer"
        data-testid={`card-store-${store.id}`}
      >
        <div className="relative aspect-[16/9] overflow-hidden bg-muted">
          {store.banner ? (
            <img
              src={resolveMediaUrl(store.banner) ?? store.banner}
              alt={store.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <span className="text-4xl font-bold text-primary/50">
                {store.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          
          {store.isFeatured && (
            <div className="absolute top-2 left-2">
              <Badge
                className="bg-primary text-primary-foreground flex items-center gap-1 shadow-md"
                data-testid={`badge-featured-${store.id}`}
              >
                <Sparkles className="h-3 w-3" />
                Destacada
              </Badge>
            </div>
          )}

          {store.logo && (
            <div className="absolute bottom-3 left-3 w-14 h-14 rounded-md bg-card shadow-md overflow-hidden border">
              <img
                src={resolveMediaUrl(store.logo) ?? store.logo}
                alt={`${store.name} logo`}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>

        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3
              className="font-semibold text-base line-clamp-1"
              data-testid={`text-store-name-${store.id}`}
            >
              {store.name}
            </h3>
            {store.rating && parseFloat(store.rating) > 0 && (
              <div className="flex items-center gap-1 shrink-0">
                <Star className="h-4 w-4 fill-primary text-primary" />
                <span className="text-sm font-medium" data-testid={`text-store-rating-${store.id}`}>
                  {parseFloat(store.rating).toFixed(1)}
                </span>
              </div>
            )}
          </div>

          <Badge
            variant="secondary"
            className="mb-2"
            data-testid={`badge-store-category-${store.id}`}
          >
            {store.category}
          </Badge>

          {store.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
              {store.description}
            </p>
          )}

          <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>Entrega disponible</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
