import { useState } from "react";
import { ArrowRight, Truck, Shield, Clock, CreditCard, Package, UtensilsCrossed, ShoppingCart, Pill, Smartphone, Shirt, Home as HomeIcon, Sparkles, PawPrint, Bus, MapPin, Store, Bike, Tag, Plane, Zap, Smile, type LucideIcon } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PromoBanner } from "@/components/feed/PromoBanner";
import { NoticeCard } from "@/components/feed/NoticeCard";
import { NovedadCard } from "@/components/feed/NovedadCard";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { StoreCard } from "@/components/marketplace/StoreCard";
import { TravelModal } from "@/components/travel/TravelModal";
import { useFeaturedProducts, useFeaturedStores, useStores, usePromoBanners, usePromoNotices, usePromoCategories, useDiscountedProducts, useHomeSettings, useNovedades } from "@/hooks/use-marketplace";
import { useLocation as useUserLocation } from "@/hooks/use-location";
import { resolveMediaUrl } from "@/lib/apiBase";

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

const benefitCards = [
  {
    icon: CreditCard,
    accentIcon: Smile,
    iconAnim: "animate-card-tap",
    accentIconAnim: "animate-wink",
    badge: "FINANCIACIÓN",
    stat: "18",
    statSuffix: "x",
    title: "Sin interés",
    description: "Pagá en cuotas sin recargo con todas las tarjetas",
    cta: "Ver cuotas",
    gradient: "from-[#f59e0b] via-[#d97706] to-[#b45309]",
    glowColor: "rgba(251,191,36,0.4)",
    orb1: "bg-yellow-300/25",
    orb2: "bg-amber-200/20",
    link: null,
    travelTab: null,
  },
  {
    icon: Truck,
    accentIcon: Bike,
    iconAnim: "animate-truck-drive",
    accentIconAnim: "animate-bike-zip",
    badge: "LOGÍSTICA",
    stat: "24",
    statSuffix: "hs",
    title: "Envío express",
    description: "Recibí tu pedido al día siguiente en todo el país",
    cta: "Cómo funciona",
    gradient: "from-[#059669] via-[#047857] to-[#065f46]",
    glowColor: "rgba(16,185,129,0.4)",
    orb1: "bg-emerald-300/25",
    orb2: "bg-green-200/20",
    link: null,
    travelTab: null,
  },
  {
    icon: Plane,
    accentIcon: Bus,
    iconAnim: "animate-plane-takeoff",
    accentIconAnim: "animate-bus-drive",
    badge: "VIAJES",
    stat: "500",
    statSuffix: "+",
    title: "Destinos",
    description: "Micros y vuelos al mejor precio desde cualquier provincia",
    cta: "Buscar viaje",
    gradient: "from-[#2563eb] via-[#1d4ed8] to-[#1e3a8a]",
    glowColor: "rgba(59,130,246,0.4)",
    orb1: "bg-blue-300/25",
    orb2: "bg-sky-200/20",
    link: null,
    travelTab: "bus",
  },
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
            src={resolveMediaUrl(heroImage) ?? heroImage}
            alt={cat.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { (e.target as HTMLImageElement).src = cat.fallbackImage; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          {productImages.length > 1 && (
            <div className="absolute bottom-2 right-2 flex gap-1">
              {productImages.slice(1, 4).map((img, i) => (
                <div key={i} className="w-10 h-10 rounded border-2 border-white/70 overflow-hidden bg-muted">
                  <img src={resolveMediaUrl(img) ?? img} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
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
  const { data: novedadesData, isLoading: novedadesLoading } = useNovedades({ limit: 12 });
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
          {benefitCards.map((card, index) => {
            const inner = (
              <div
                key={index}
                data-testid={`card-benefit-${index}`}
                className={`
                  relative overflow-hidden rounded-xl cursor-pointer
                  bg-gradient-to-r ${card.gradient}
                  transition-all duration-300 ease-out
                  hover:scale-[1.02] hover:brightness-110
                  group
                `}
                style={{ boxShadow: `0 2px 16px 0 ${card.glowColor}` }}
              >
                {/* Decorative orb right side */}
                <div className={`absolute -top-6 -right-6 w-28 h-28 rounded-full blur-2xl ${card.orb1}`} />
                {/* Gloss shine */}
                <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

                <div className="relative z-10 px-4 py-3 flex items-center gap-3">
                  {/* Icon area — single or dual animated */}
                  {card.accentIcon ? (
                    <div className="shrink-0 flex gap-1.5">
                      <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm border border-white/25 flex items-center justify-center shadow-inner overflow-hidden">
                        <card.icon className={`h-5 w-5 text-white drop-shadow ${card.iconAnim}`} />
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-inner overflow-hidden">
                        <card.accentIcon className={`h-5 w-5 text-white/90 drop-shadow ${card.accentIconAnim}`} />
                      </div>
                    </div>
                  ) : (
                    <div className="shrink-0 w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm border border-white/25 flex items-center justify-center shadow-inner">
                      <card.icon className="h-5 w-5 text-white drop-shadow" />
                    </div>
                  )}

                  {/* Text block */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold tracking-widest text-white/60 uppercase leading-none mb-0.5">
                      {card.badge}
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-white leading-none">{card.stat}</span>
                      <span className="text-sm font-bold text-white/75 leading-none">{card.statSuffix}</span>
                    </div>
                    <p className="text-xs font-semibold text-white leading-tight">{card.title}</p>
                  </div>

                  {/* Arrow */}
                  <div className="shrink-0 w-7 h-7 rounded-full bg-white/15 border border-white/20 flex items-center justify-center transition-transform duration-200 group-hover:translate-x-1">
                    <ArrowRight className="h-3.5 w-3.5 text-white" />
                  </div>
                </div>
              </div>
            );

            if (card.travelTab) {
              return (
                <div key={index} onClick={() => setTravelModal({ open: true, tab: card.travelTab as "bus" | "flights" })}>
                  {inner}
                </div>
              );
            }
            if (card.link) {
              return <Link key={index} href={card.link}>{inner}</Link>;
            }
            return <div key={index}>{inner}</div>;
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
                            src={resolveMediaUrl(img) ?? img}
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

      {/* NOVEDADES VERIFICADAS */}
      {!novedadesLoading && novedadesData && novedadesData.length > 0 && (
        <section className="py-6" data-testid="section-novedades">
          <div className="px-4 max-w-7xl mx-auto mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2" data-testid="text-section-novedades">
                Novedades Verificadas
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-500 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                  <svg className="h-3 w-3 fill-blue-500" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" strokeWidth="2" stroke="currentColor" fill="none"/></svg>
                  Cuentas oficiales y comercios verificados
                </span>
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">Información de municipios, organismos y marcas confirmadas</p>
            </div>
          </div>

          {/* SCROLL CAROUSEL */}
          <div className="relative">
            <div
              className="flex gap-3 overflow-x-auto pb-4 px-4 scroll-smooth hide-scrollbar"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {novedadesData.map((nov) => (
                <NovedadCard key={nov.id} novedad={nov} size="md" />
              ))}
              <div className="w-4 shrink-0" />
            </div>
          </div>
        </section>
      )}

      {/* NOVEDADES LEGACY (keeps existing notices system) */}
      {!noticesLoading && notices && notices.length > 0 && (novedadesData?.length ?? 0) === 0 && (
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/vender">
            <div
              data-testid="card-become-seller"
              className="relative overflow-hidden rounded-xl cursor-pointer bg-gradient-to-r from-[#ea580c] via-[#dc2626] to-[#b91c1c] transition-all duration-300 ease-out hover:scale-[1.02] hover:brightness-110 group"
              style={{ boxShadow: "0 2px 20px 0 rgba(234,88,12,0.45)" }}
            >
              <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full blur-2xl bg-orange-300/25" />
              <div className="absolute -bottom-6 -left-4 w-24 h-24 rounded-full blur-2xl bg-red-200/15" />
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
              <div className="relative z-10 px-5 py-5 flex items-center gap-4">
                <div className="shrink-0 flex gap-2">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm border border-white/25 flex items-center justify-center shadow-inner overflow-hidden">
                    <Store className="h-6 w-6 text-white drop-shadow animate-store-open" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold tracking-widest text-white/60 uppercase leading-none mb-1">COMERCIOS</p>
                  <h3 className="text-lg font-black text-white leading-tight">Vendé en PachaPay</h3>
                  <p className="text-xs text-white/80 mt-0.5 leading-snug">Registrá tu comercio y empezá a vender a miles de clientes en tu zona</p>
                </div>
                <div className="shrink-0 flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/15 border border-white/20 flex items-center justify-center transition-transform duration-200 group-hover:translate-x-1">
                    <ArrowRight className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-[10px] text-white/60 font-semibold whitespace-nowrap">Registrarme</span>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/repartidor">
            <div
              data-testid="card-become-rider"
              className="relative overflow-hidden rounded-xl cursor-pointer bg-gradient-to-r from-[#2563eb] via-[#1d4ed8] to-[#1e3a8a] transition-all duration-300 ease-out hover:scale-[1.02] hover:brightness-110 group"
              style={{ boxShadow: "0 2px 20px 0 rgba(37,99,235,0.45)" }}
            >
              <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full blur-2xl bg-blue-300/25" />
              <div className="absolute -bottom-6 -left-4 w-24 h-24 rounded-full blur-2xl bg-sky-200/15" />
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
              <div className="relative z-10 px-5 py-5 flex items-center gap-4">
                <div className="shrink-0 flex gap-2">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm border border-white/25 flex items-center justify-center shadow-inner overflow-hidden">
                    <Bike className="h-6 w-6 text-white drop-shadow animate-bike-zip" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold tracking-widest text-white/60 uppercase leading-none mb-1">DELIVERY</p>
                  <h3 className="text-lg font-black text-white leading-tight">Trabajá como repartidor</h3>
                  <p className="text-xs text-white/80 mt-0.5 leading-snug">Unite al equipo de delivery y ganá dinero haciendo entregas</p>
                </div>
                <div className="shrink-0 flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/15 border border-white/20 flex items-center justify-center transition-transform duration-200 group-hover:translate-x-1">
                    <ArrowRight className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-[10px] text-white/60 font-semibold whitespace-nowrap">Registrarme</span>
                </div>
              </div>
            </div>
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
