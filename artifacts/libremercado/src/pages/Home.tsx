import { useState } from "react";
import { ArrowRight, Truck, Shield, Clock, CreditCard, Package, UtensilsCrossed, ShoppingCart, Pill, Smartphone, Shirt, Home as HomeIcon, Sparkles, PawPrint, Bus, MapPin, Store, Bike, Tag, type LucideIcon } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PromoBanner } from "@/components/feed/PromoBanner";
import { NoticeCard } from "@/components/feed/NoticeCard";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { StoreCard } from "@/components/marketplace/StoreCard";
import { TravelModal } from "@/components/travel/TravelModal";
import { useFeaturedProducts, useFeaturedStores, useStores, usePromoBanners, usePromoNotices, usePromoCategories, useDiscountedProducts, useHomeSettings } from "@/hooks/use-marketplace";
import { useLocation as useUserLocation } from "@/hooks/use-location";

const DEFAULT_CATEGORY_IMAGES: Record<string, string> = {
  food: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&h=200&fit=crop&auto=format&q=80",
  grocery: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&h=200&fit=crop&auto=format&q=80",
  pharmacy: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&h=200&fit=crop&auto=format&q=80",
  electronics: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=300&h=200&fit=crop&auto=format&q=80",
  fashion: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=300&h=200&fit=crop&auto=format&q=80",
  home: "https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=300&h=200&fit=crop&auto=format&q=80",
  beauty: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=300&h=200&fit=crop&auto=format&q=80",
  pets: "https://images.unsplash.com/photo-1415369629372-26f2fe60c467?w=300&h=200&fit=crop&auto=format&q=80",
};

interface CategoryDef {
  id: string;
  name: string;
  icon: LucideIcon;
  queryCategory: string;
  link: string;
  fallbackImage: string;
  discountLabel: string;
}

const LARGE_CATEGORIES: CategoryDef[] = [
  {
    id: "electronics-mobile",
    name: "Celulares y Tablets",
    icon: Smartphone,
    queryCategory: "celulares",
    link: "/explore?category=electronics",
    fallbackImage: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400&h=280&fit=crop&auto=format&q=80",
    discountLabel: "Hasta 40% OFF",
  },
  {
    id: "electronics-pc",
    name: "Computación",
    icon: Smartphone,
    queryCategory: "computacion",
    link: "/explore?category=electronics",
    fallbackImage: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&h=280&fit=crop&auto=format&q=80",
    discountLabel: "Hasta 40% OFF",
  },
  {
    id: "fashion-shoes",
    name: "Zapatillas",
    icon: Shirt,
    queryCategory: "zapatillas",
    link: "/explore?category=fashion",
    fallbackImage: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=280&fit=crop&auto=format&q=80",
    discountLabel: "Hasta 40% OFF",
  },
  {
    id: "fashion-clothes",
    name: "Moda",
    icon: Shirt,
    queryCategory: "ropa",
    link: "/explore?category=fashion",
    fallbackImage: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&h=280&fit=crop&auto=format&q=80",
    discountLabel: "Hasta 40% OFF",
  },
];

const SMALL_CATEGORIES: { id: string; name: string; icon: LucideIcon }[] = [
  { id: "food", name: "Comida", icon: UtensilsCrossed },
  { id: "grocery", name: "Supermercado", icon: ShoppingCart },
  { id: "pharmacy", name: "Farmacia", icon: Pill },
  { id: "electronics", name: "Electrónica", icon: Smartphone },
  { id: "fashion", name: "Moda", icon: Shirt },
  { id: "home", name: "Hogar", icon: HomeIcon },
  { id: "beauty", name: "Belleza", icon: Sparkles },
  { id: "pets", name: "Mascotas", icon: PawPrint },
];

const benefitBanners = [
  { icon: CreditCard, title: "Hasta 18 CUOTAS", subtitle: "SIN INTERÉS", bgColor: "bg-gradient-to-r from-amber-400 to-yellow-500", link: null, travelTab: null },
  { icon: Package, title: "ENVÍOS EN", subtitle: "24 HORAS", bgColor: "bg-gradient-to-r from-emerald-400 to-green-500", link: null, travelTab: null },
  { icon: Bus, title: "VIAJES", subtitle: "MICROS Y VUELOS", bgColor: "bg-gradient-to-r from-blue-400 to-cyan-500", link: null, travelTab: "bus" },
];

function LargeCategoryCard({ cat }: { cat: CategoryDef }) {
  const { data: discounted, isLoading } = useDiscountedProducts(cat.queryCategory, 4);
  const firstProduct = discounted?.[0];
  const productImages = (discounted ?? [])
    .map((p) => {
      try { return (JSON.parse(p.images || "[]") as string[])[0]; } catch { return p.images || ""; }
    })
    .filter(Boolean)
    .slice(0, 4);

  const heroImage = productImages[0] || cat.fallbackImage;

  const discountPct = firstProduct && firstProduct.originalPrice
    ? Math.round((1 - parseFloat(firstProduct.price) / parseFloat(firstProduct.originalPrice)) * 100)
    : null;

  return (
    <Link href={cat.link}>
      <Card className="hover-elevate cursor-pointer h-full overflow-hidden group" data-testid={`card-category-promo-${cat.id}`}>
        <div className="relative h-[180px] bg-muted overflow-hidden">
          <img
            src={heroImage}
            alt={cat.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { (e.target as HTMLImageElement).src = cat.fallbackImage; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          {productImages.length > 1 && (
            <div className="absolute bottom-2 right-2 flex gap-1">
              {productImages.slice(1, 4).map((img, i) => (
                <div key={i} className="w-10 h-10 rounded border-2 border-white/70 overflow-hidden bg-muted">
                  <img src={img} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
              ))}
            </div>
          )}
          <div className="absolute top-2 left-2">
            {isLoading ? (
              <Skeleton className="h-5 w-20" />
            ) : (
              <Badge className="bg-primary text-white font-bold text-xs shadow">
                {discountPct ? `Hasta ${discountPct}% OFF` : cat.discountLabel}
              </Badge>
            )}
          </div>
        </div>
        <CardContent className="p-3">
          <h3 className="font-semibold text-foreground text-sm">{cat.name}</h3>
          {firstProduct && (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{firstProduct.name}</p>
          )}
          <div className="flex items-center gap-1 mt-1">
            <Tag className="h-3 w-3 text-primary" />
            <span className="text-xs text-primary font-medium">
              {isLoading ? "Cargando..." : `${discounted?.length ?? 0} productos en oferta`}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function Home() {
  const [travelModal, setTravelModal] = useState<{ open: boolean; tab: "bus" | "flights" }>({ open: false, tab: "bus" });
  const { provinciaId, ciudadId, locationName, useGps, lat, lng, radiusKm } = useUserLocation();
  const locationFilter = useGps && lat && lng
    ? { useGps: true, lat, lng, radiusKm }
    : provinciaId
    ? { provinciaId, ciudadId }
    : undefined;
  const bannerLocationFilter = useGps && lat && lng
    ? { lat, lng, provinciaId, ciudadId }
    : provinciaId
    ? { provinciaId, ciudadId }
    : undefined;

  const { data: products, isLoading: productsLoading } = useFeaturedProducts(locationFilter);
  const { data: featuredStores, isLoading: featuredStoresLoading } = useFeaturedStores(locationFilter);
  const { data: stores, isLoading: storesLoading } = useStores(locationFilter);
  const { data: banners, isLoading: bannersLoading } = usePromoBanners(bannerLocationFilter);
  const { data: notices, isLoading: noticesLoading } = usePromoNotices();
  const { data: promoCategories } = usePromoCategories();
  const { data: homeSettings } = useHomeSettings();

  return (
    <div className="min-h-screen bg-muted/30">
      <section className="px-4 py-4 max-w-7xl mx-auto">
        {bannersLoading ? (
          <Skeleton className="w-full aspect-[21/9] md:aspect-[21/6] rounded-md" />
        ) : (
          <PromoBanner promos={banners ?? []} />
        )}
      </section>

      <section className="px-4 py-3 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {benefitBanners.map((banner, index) => {
            const cardContent = (
              <Card
                className={`${banner.bgColor} border-0 overflow-hidden hover-elevate cursor-pointer`}
                data-testid={`card-benefit-${index}`}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                    <banner.icon className="h-7 w-7 text-white" />
                  </div>
                  <div className="text-white">
                    <p className="text-sm font-medium opacity-90">{banner.title}</p>
                    <p className="text-xl font-bold">{banner.subtitle}</p>
                  </div>
                </CardContent>
              </Card>
            );
            if (banner.travelTab) {
              return (
                <div key={index} onClick={() => setTravelModal({ open: true, tab: banner.travelTab as "bus" | "flights" })}>
                  {cardContent}
                </div>
              );
            }
            if (banner.link) {
              return <Link key={index} href={banner.link}>{cardContent}</Link>;
            }
            return <div key={index}>{cardContent}</div>;
          })}
        </div>
      </section>

      {provinciaId && locationName && (
        <section className="px-4 py-2 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            <span>Mostrando resultados en <span className="font-medium text-foreground">{locationName}</span></span>
          </div>
        </section>
      )}

      <section className="px-4 py-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Categorías en oferta</h2>
          <Link href="/explore">
            <Button variant="ghost" size="sm">Ver todo <ArrowRight className="h-4 w-4 ml-1" /></Button>
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {LARGE_CATEGORIES.map((cat) => (
            <LargeCategoryCard key={cat.id} cat={cat} />
          ))}
        </div>
      </section>

      <section className="px-4 py-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
          {SMALL_CATEGORIES.map((category) => {
            const img = homeSettings?.[`cat_img_${category.id}`] || DEFAULT_CATEGORY_IMAGES[category.id];
            return (
              <Link key={category.id} href={`/explore?category=${category.id}`}>
                <Card
                  className="hover-elevate active-elevate-2 cursor-pointer overflow-hidden"
                  data-testid={`card-category-${category.id}`}
                >
                  <CardContent className="p-0">
                    <div className="relative w-full aspect-square">
                      {img ? (
                        <>
                          <img
                            src={img}
                            alt={category.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                          <div className="absolute inset-0 bg-black/40" />
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <category.icon className="h-5 w-5 md:h-6 md:w-6 text-white drop-shadow-md" />
                            <span className="text-[10px] md:text-xs font-semibold text-white drop-shadow-md mt-1 text-center px-1 line-clamp-1">
                              {category.name}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full p-3">
                          <div className="w-8 h-8 md:w-10 md:h-10 mx-auto mb-1 rounded-full bg-primary/10 flex items-center justify-center">
                            <category.icon className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                          </div>
                          <span className="text-xs font-medium line-clamp-1">{category.name}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="px-4 py-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold" data-testid="text-section-featured">
            Productos Destacados
          </h2>
          <Link href="/explore">
            <Button variant="ghost" size="sm" data-testid="button-see-all-products">
              Ver todos
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>

        {productsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <Skeleton className="aspect-square" />
                <CardContent className="p-3 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-9 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {(products ?? []).slice(0, 10).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {((featuredStores ?? []).length > 0 || featuredStoresLoading) && (
        <section className="px-4 py-6 max-w-7xl mx-auto" data-testid="section-featured-stores">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2" data-testid="text-section-featured-stores">
              <Sparkles className="h-5 w-5 text-primary" />
              Tiendas Destacadas
            </h2>
            <Link href="/explore">
              <Button variant="ghost" size="sm" data-testid="button-see-all-featured-stores">
                Ver todas
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>

          {featuredStoresLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <Skeleton className="aspect-[16/9]" />
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(featuredStores ?? []).map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </div>
          )}
        </section>
      )}

      <section className="bg-card py-8 border-y">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Truck className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-sm mb-1">Envío Rápido</h3>
              <p className="text-xs text-muted-foreground">Recibe tu pedido en minutos</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-sm mb-1">Compra Segura</h3>
              <p className="text-xs text-muted-foreground">Tus datos siempre protegidos</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-sm mb-1">24/7 Disponible</h3>
              <p className="text-xs text-muted-foreground">Compra cuando quieras</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-sm mb-1">Cuotas Sin Interés</h3>
              <p className="text-xs text-muted-foreground">Pagá como quieras</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold" data-testid="text-section-stores">
            Tiendas Populares
          </h2>
          <Link href="/explore">
            <Button variant="ghost" size="sm" data-testid="button-see-all-stores">
              Ver todas
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>

        {storesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <Skeleton className="aspect-[16/9]" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(stores ?? []).slice(0, 6).map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        )}
      </section>

      {!noticesLoading && notices && notices.length > 0 && (
        <section className="px-4 py-6 max-w-7xl mx-auto">
          <h2 className="text-xl font-bold mb-4" data-testid="text-section-notices">
            Novedades
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notices.slice(0, 4).map((notice) => (
              <NoticeCard key={notice.id} notice={notice} />
            ))}
          </div>
        </section>
      )}

      <section className="px-4 py-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/vender">
            <Card className="bg-gradient-to-br from-primary to-orange-600 border-0 hover-elevate cursor-pointer" data-testid="card-become-seller">
              <CardContent className="p-6 flex items-center gap-5">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <Store className="h-8 w-8 text-white" />
                </div>
                <div className="text-white flex-1">
                  <h3 className="text-xl font-bold mb-1">Vendé en PachaPay</h3>
                  <p className="text-white/90 text-sm mb-3">Registrá tu comercio y empezá a vender a miles de clientes en tu zona</p>
                  <Button variant="secondary" size="sm" data-testid="button-become-seller">
                    Registrar mi comercio
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/repartidor">
            <Card className="bg-gradient-to-br from-accent to-blue-600 border-0 hover-elevate cursor-pointer" data-testid="card-become-rider">
              <CardContent className="p-6 flex items-center gap-5">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <Bike className="h-8 w-8 text-white" />
                </div>
                <div className="text-white flex-1">
                  <h3 className="text-xl font-bold mb-1">Trabajá como repartidor</h3>
                  <p className="text-white/90 text-sm mb-3">Unite al equipo de delivery y ganá dinero haciendo entregas</p>
                  <Button variant="secondary" size="sm" data-testid="button-become-rider">
                    Quiero ser repartidor
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>

      <TravelModal
        open={travelModal.open}
        onClose={() => setTravelModal((s) => ({ ...s, open: false }))}
        defaultTab={travelModal.tab}
      />
    </div>
  );
}
