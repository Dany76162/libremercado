import { useState } from "react";
import { ArrowRight, Truck, Shield, Clock, CreditCard, Package, UtensilsCrossed, ShoppingCart, Pill, Smartphone, Shirt, Home as HomeIcon, Sparkles, PawPrint, Bus, MapPin, Store, Bike, type LucideIcon } from "lucide-react";
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
import { useFeaturedProducts, useFeaturedStores, useStores, usePromoBanners, usePromoNotices, usePromoCategories } from "@/hooks/use-marketplace";
import { useLocation as useUserLocation } from "@/hooks/use-location";

const categories: { id: string; name: string; icon: LucideIcon }[] = [
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
  {
    icon: CreditCard,
    title: "Hasta 18 CUOTAS",
    subtitle: "SIN INTERÉS",
    bgColor: "bg-gradient-to-r from-amber-400 to-yellow-500",
    link: null,
    travelTab: null,
  },
  {
    icon: Package,
    title: "ENVÍOS EN",
    subtitle: "24 HORAS",
    bgColor: "bg-gradient-to-r from-emerald-400 to-green-500",
    link: null,
    travelTab: null,
  },
  {
    icon: Bus,
    title: "VIAJES",
    subtitle: "MICROS Y VUELOS",
    bgColor: "bg-gradient-to-r from-blue-400 to-cyan-500",
    link: null,
    travelTab: "bus",
  },
];

const categoryCards = [
  { id: "electronics-mobile", name: "Celulares y Tablets", discount: "Hasta 40% OFF", icon: Smartphone, link: "/explore?category=electronics" },
  { id: "electronics-pc", name: "Computación", discount: "Hasta 40% OFF", icon: Smartphone, link: "/explore?category=electronics" },
  { id: "fashion-shoes", name: "Zapatillas", discount: "Hasta 40% OFF", icon: Shirt, link: "/explore?category=fashion" },
  { id: "fashion-clothes", name: "Moda", discount: "Hasta 40% OFF", icon: Shirt, link: "/explore?category=fashion" },
];

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
                <div
                  key={index}
                  onClick={() => setTravelModal({ open: true, tab: banner.travelTab as "bus" | "flights" })}
                >
                  {cardContent}
                </div>
              );
            }
            if (banner.link) {
              return (
                <Link key={index} href={banner.link}>
                  {cardContent}
                </Link>
              );
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categoryCards.map((cat, index) => (
            <Link key={cat.id} href={cat.link}>
              <Card 
                className="bg-card hover-elevate cursor-pointer h-full"
                data-testid={`card-category-promo-${cat.id}`}
              >
                <CardContent className="p-4 flex flex-col justify-between h-full min-h-[140px]">
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      {cat.name}
                    </h3>
                    <p className="text-sm text-primary font-bold">
                      {cat.discount}
                    </p>
                  </div>
                  <div className="flex justify-end mt-2">
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                      <cat.icon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-4 py-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
          {categories.map((category) => (
            <Link key={category.id} href={`/explore?category=${category.id}`}>
              <Card
                className="hover-elevate active-elevate-2 cursor-pointer"
                data-testid={`card-category-${category.id}`}
              >
                <CardContent className="p-3 text-center">
                  <div className="w-8 h-8 md:w-10 md:h-10 mx-auto mb-1 rounded-full bg-primary/10 flex items-center justify-center">
                    <category.icon className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  </div>
                  <span className="text-xs font-medium line-clamp-1">
                    {category.name}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
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
