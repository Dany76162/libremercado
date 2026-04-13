import { useMemo, useState } from "react";
import {
  ArrowRight,
  Bike,
  Building2,
  CreditCard,
  MapPin,
  Pill,
  Plane,
  Shield,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Store,
  Shirt,
  Tag,
  Truck,
  UtensilsCrossed,
  PawPrint,
  Home as HomeIcon,
  Bus,
  type LucideIcon,
  Lock,
  BadgeCheck,
} from "lucide-react";
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
import {
  useFeaturedProducts,
  useFeaturedStores,
  useStores,
  usePromoBanners,
  usePromoNotices,
  usePromoCategories,
  useDiscountedProducts,
  useHomeSettings,
  useNovedades,
} from "@/hooks/use-marketplace";
import { useLocation as useUserLocation } from "@/hooks/use-location";
import { useAuth } from "@/hooks/use-auth";
import { resolveMediaUrl } from "@/lib/apiBase";
import { CATALOG_CATEGORIES, normalizeCatalogCategory } from "@/lib/catalog";
import { canAccessWholesaleChannel } from "@/lib/market-access";

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

const categoryIcons: Record<string, LucideIcon> = {
  food: UtensilsCrossed,
  grocery: ShoppingCart,
  pharmacy: Pill,
  electronics: Smartphone,
  fashion: Shirt,
  home: HomeIcon,
  beauty: Sparkles,
  pets: PawPrint,
};

const LARGE_CATEGORIES = [
  {
    id: "electronics-mobile",
    name: "Celulares y Tablets",
    icon: Smartphone,
    queryCategory: "celulares",
    link: "/explore?category=electronics",
    fallbackImage: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=420&h=280&fit=crop&auto=format&q=80",
    discountLabel: "Hasta 40% OFF",
  },
  {
    id: "electronics-pc",
    name: "Computación",
    icon: Smartphone,
    queryCategory: "computacion",
    link: "/explore?category=electronics",
    fallbackImage: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=420&h=280&fit=crop&auto=format&q=80",
    discountLabel: "Hasta 40% OFF",
  },
  {
    id: "fashion-shoes",
    name: "Zapatillas",
    icon: Shirt,
    queryCategory: "zapatillas",
    link: "/explore?category=fashion",
    fallbackImage: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=420&h=280&fit=crop&auto=format&q=80",
    discountLabel: "Hasta 40% OFF",
  },
  {
    id: "fashion-clothes",
    name: "Moda",
    icon: Shirt,
    queryCategory: "ropa",
    link: "/explore?category=fashion",
    fallbackImage: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=420&h=280&fit=crop&auto=format&q=80",
    discountLabel: "Hasta 40% OFF",
  },
];

const benefitCards = [
  {
    icon: CreditCard,
    title: "Cuotas y pagos flexibles",
    description: "Campañas, descuentos y opciones de pago sin fricción para impulsar conversión.",
    gradient: "from-[#f59e0b] via-[#d97706] to-[#b45309]",
  },
  {
    icon: Truck,
    title: "Cobertura logística",
    description: "Experiencia lista para delivery, comercios locales y expansión por zonas.",
    gradient: "from-[#059669] via-[#047857] to-[#065f46]",
  },
  {
    icon: Plane,
    title: "Viajes y servicios",
    description: "La plataforma ya convive con verticales como vuelos, micros y oportunidades regionales.",
    gradient: "from-[#2563eb] via-[#1d4ed8] to-[#1e3a8a]",
    travelTab: "bus" as const,
  },
];

function LargeCategoryCard({
  name,
  queryCategory,
  link,
  fallbackImage,
  discountLabel,
}: {
  name: string;
  queryCategory: string;
  link: string;
  fallbackImage: string;
  discountLabel: string;
}) {
  const { data: discounted, isLoading } = useDiscountedProducts(queryCategory, 4);
  const firstProduct = discounted?.[0];
  const productImages = (discounted ?? [])
    .map((product) => {
      try {
        return (JSON.parse(product.images || "[]") as string[])[0];
      } catch {
        return product.images || product.image || "";
      }
    })
    .filter(Boolean)
    .slice(0, 4);

  const heroImage = productImages[0] || fallbackImage;

  const discountPct = firstProduct && firstProduct.originalPrice
    ? Math.round((1 - parseFloat(firstProduct.price) / parseFloat(firstProduct.originalPrice)) * 100)
    : null;

  return (
    <Link href={link}>
      <Card className="group h-full cursor-pointer overflow-hidden rounded-[24px] border border-border/50 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg" data-testid={`card-category-promo-${queryCategory}`}>
        <div className="relative h-[220px] overflow-hidden bg-muted">
          <img
            src={resolveMediaUrl(heroImage) ?? heroImage}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackImage;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute left-4 top-4">
            <Badge className="bg-white text-slate-900 shadow">
              {discountPct ? `Hasta ${discountPct}% OFF` : discountLabel}
            </Badge>
          </div>
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="text-lg font-bold text-white">{name}</h3>
            <p className="mt-1 text-sm text-white/80">
              {isLoading ? "Cargando oportunidades..." : `${discounted?.length ?? 0} productos con descuento`}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function PromoCategoryCard({
  promo,
  image,
}: {
  promo: { id: string; title: string; description?: string | null; discount?: string | null; link?: string | null };
  image: string;
}) {
  return (
    <Link href={promo.link || "/explore"}>
      <Card className="group h-full cursor-pointer overflow-hidden rounded-[24px] border border-border/50 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg" data-testid={`card-promo-category-${promo.id}`}>
        <div className="relative h-48 overflow-hidden">
          <img src={resolveMediaUrl(image) ?? image} alt={promo.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute inset-x-4 bottom-4">
            {promo.discount && (
              <Badge className="mb-2 bg-white/90 text-slate-900">{promo.discount}</Badge>
            )}
            <h3 className="text-lg font-bold text-white">{promo.title}</h3>
            {promo.description && <p className="mt-1 text-sm text-white/80 line-clamp-2">{promo.description}</p>}
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default function Home() {
  const [travelModal, setTravelModal] = useState<{ open: boolean; tab: "bus" | "flights" }>({ open: false, tab: "bus" });
  const { user, isAuthenticated } = useAuth();
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

  const canAccessProfessionalChannel = canAccessWholesaleChannel(user);

  const officialNovedades = useMemo(
    () => (novedadesData ?? []).filter((novedad) => novedad.isOfficial),
    [novedadesData],
  );
  const marketNovedades = useMemo(
    () => (novedadesData ?? []).filter((novedad) => !novedad.isOfficial),
    [novedadesData],
  );

  const professionalRequestHref = isAuthenticated ? "/account/kyc" : "/vender";

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,rgba(248,250,252,0.95)_0%,rgba(248,250,252,0.62)_24%,rgba(248,250,252,1)_100%)]">
      <section className="px-4 pb-4 pt-5 max-w-7xl mx-auto">
        {bannersLoading ? (
          <Skeleton className="w-full h-[460px] rounded-[28px]" />
        ) : (
          <PromoBanner promos={banners ?? []} />
        )}
      </section>

      <section className="px-4 py-3 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {benefitCards.map((card, index) => {
            const content = (
              <div
                key={card.title}
                className={`relative overflow-hidden rounded-[24px] bg-gradient-to-r ${card.gradient} p-5 text-white shadow-[0_18px_50px_rgba(15,23,42,0.16)] transition-transform duration-300 hover:-translate-y-1`}
                data-testid={`card-benefit-${index}`}
              >
                <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
                <div className="relative flex items-start gap-4">
                  <div className="rounded-2xl bg-white/18 p-3">
                    <card.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Beneficio plataforma</p>
                    <h3 className="mt-2 text-lg font-black">{card.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-white/82">{card.description}</p>
                  </div>
                </div>
              </div>
            );

            if (card.travelTab) {
              return (
                <button
                  type="button"
                  key={card.title}
                  onClick={() => setTravelModal({ open: true, tab: card.travelTab })}
                  className="text-left"
                >
                  {content}
                </button>
              );
            }

            return content;
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

      <section className="px-4 py-5 max-w-7xl mx-auto">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Categorías clave</p>
            <h2 className="mt-1 text-2xl font-black">Entradas rápidas al catálogo</h2>
            <p className="mt-1 text-sm text-muted-foreground">Cada acceso te lleva al sector correcto del marketplace, con filtros alineados y navegación coherente.</p>
          </div>
          <Link href="/explore">
            <Button variant="ghost" size="sm">
              Ver todo
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {LARGE_CATEGORIES.map((category) => (
            <LargeCategoryCard key={category.id} {...category} />
          ))}
        </div>
      </section>

      <section className="px-4 py-5 max-w-7xl mx-auto">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Navegación inteligente</p>
            <h2 className="mt-1 text-2xl font-black">Rubros para explorar sin fricción</h2>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          {CATALOG_CATEGORIES.map((category) => {
            const CategoryIcon = categoryIcons[category.id];
            const image = homeSettings?.[`cat_img_${category.id}`] || DEFAULT_CATEGORY_IMAGES[category.id];
            return (
              <Link key={category.id} href={category.href}>
                <Card className="group cursor-pointer overflow-hidden rounded-[22px] border border-border/50 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg" data-testid={`card-category-${category.id}`}>
                  <CardContent className="p-0">
                    <div className="relative aspect-square">
                      <img
                        src={resolveMediaUrl(image) ?? image}
                        alt={category.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <div className="absolute inset-0 bg-black/45" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
                        <CategoryIcon className="h-6 w-6 text-white drop-shadow-md" />
                        <span className="mt-2 text-xs font-semibold text-white md:text-sm">{category.name}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {(promoCategories ?? []).length > 0 && (
        <section className="px-4 py-5 max-w-7xl mx-auto">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Promociones dirigidas</p>
              <h2 className="mt-1 text-2xl font-black">Colecciones y campañas con destino correcto</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {promoCategories.slice(0, 4).map((promo) => {
              const guessedCategory = normalizeCatalogCategory(promo.title) || normalizeCatalogCategory(promo.description);
              const fallbackImage = guessedCategory ? DEFAULT_CATEGORY_IMAGES[guessedCategory] : DEFAULT_CATEGORY_IMAGES.electronics;
              return <PromoCategoryCard key={promo.id} promo={promo} image={fallbackImage} />;
            })}
          </div>
        </section>
      )}

      <section id="sector-publico" className="px-4 py-6 max-w-7xl mx-auto">
        <div className="rounded-[28px] border border-sky-200/60 bg-[linear-gradient(135deg,rgba(239,246,255,0.92)_0%,rgba(250,250,255,1)_100%)] p-6 shadow-sm md:p-8">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Sector público y municipal</p>
              <h2 className="mt-1 flex items-center gap-2 text-2xl font-black text-slate-900">
                <Building2 className="h-6 w-6 text-sky-600" />
                Información oficial separada del circuito comercial
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Municipios, organismos y cuentas verificadas con una identidad visual y lógica propia.
              </p>
            </div>
            <Badge className="w-fit bg-sky-600 text-white">
              <BadgeCheck className="mr-1 h-3.5 w-3.5" />
              Cuentas oficiales
            </Badge>
          </div>

          {!novedadesLoading && officialNovedades.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {officialNovedades.map((novedad) => (
                <NovedadCard key={novedad.id} novedad={novedad} size="md" />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Este espacio está preparado para comunicar campañas públicas, novedades municipales y contenido institucional verificado.
            </p>
          )}
        </div>
      </section>

      <section id="canal-profesional" className="px-4 py-2 max-w-7xl mx-auto">
        <div className="rounded-[28px] border border-amber-200/70 bg-[linear-gradient(135deg,rgba(255,251,235,0.96)_0%,rgba(255,255,255,1)_100%)] p-6 shadow-sm md:p-8">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Canal profesional y distribuidoras</p>
              <h2 className="mt-1 flex items-center gap-2 text-2xl font-black text-slate-900">
                <Lock className="h-6 w-6 text-amber-600" />
                Mercado mayorista separado del público general
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Este bloque queda reservado para cuentas verificadas y no mezcla oportunidades profesionales con la experiencia minorista.
              </p>
            </div>
            {!canAccessProfessionalChannel && (
              <Link href={professionalRequestHref}>
                <Button className="w-fit rounded-full bg-amber-500 text-slate-950 hover:bg-amber-400">
                  Solicitar verificación
                </Button>
              </Link>
            )}
          </div>

          {canAccessProfessionalChannel ? (
            marketNovedades.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {marketNovedades.map((novedad) => (
                  <NovedadCard key={novedad.id} novedad={novedad} size="md" />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                La arquitectura visual ya quedó lista; falta sumar publicaciones específicas del canal profesional.
              </p>
            )
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-amber-200 bg-white/80 p-4">
                <p className="text-sm font-semibold text-slate-900">Quiénes pueden entrar</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">Tiendas verificadas, negocios validados, cuentas institucionales y perfiles con verificación aprobada.</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-white/80 p-4">
                <p className="text-sm font-semibold text-slate-900">Qué protege este bloqueo</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">Evita mostrar publicaciones o señales del canal mayorista al comprador común.</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-white/80 p-4">
                <p className="text-sm font-semibold text-slate-900">Próximo paso</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">Completar backend con un flag/rol específico para enforcement real en rutas y pricing.</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="px-4 py-6 max-w-7xl mx-auto">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Mercado minorista</p>
            <h2 className="mt-1 text-2xl font-black">Lo mejor del catálogo para compra inmediata</h2>
          </div>
          <Link href="/explore">
            <Button variant="ghost" size="sm">
              Ver todo
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {productsLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <Skeleton className="aspect-square" />
                <CardContent className="space-y-2 p-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-9 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {(products ?? []).slice(0, 10).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {((featuredStores ?? []).length > 0 || featuredStoresLoading) && (
        <section className="px-4 py-3 max-w-7xl mx-auto" data-testid="section-featured-stores">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-black" data-testid="text-section-featured-stores">
              <Sparkles className="h-5 w-5 text-primary" />
              Tiendas destacadas
            </h2>
            <Link href="/explore?tab=stores&featured=true">
              <Button variant="ghost" size="sm" data-testid="button-see-all-featured-stores">
                Ver todas
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {featuredStoresLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <Skeleton className="aspect-[16/9]" />
                  <CardContent className="space-y-2 p-4">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(featuredStores ?? []).map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </div>
          )}
        </section>
      )}

      <section className="border-y bg-card py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {[
              { icon: Truck, title: "Entrega ágil", description: "Operación lista para compra local" },
              { icon: Shield, title: "Compra segura", description: "Más claridad en promos y navegación" },
              { icon: CreditCard, title: "Pagos flexibles", description: "Experiencia lista para campañas y financiación" },
              { icon: Store, title: "Comercio verificado", description: "Preparado para separar canales y niveles de acceso" },
            ].map((item) => (
              <div key={item.title} className="flex flex-col items-center text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-sm font-semibold">{item.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-6 max-w-7xl mx-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black" data-testid="text-section-stores">
            Tiendas populares
          </h2>
          <Link href="/explore?tab=stores">
            <Button variant="ghost" size="sm" data-testid="button-see-all-stores">
              Ver todas
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {storesLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <Skeleton className="aspect-[16/9]" />
                <CardContent className="space-y-2 p-4">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(stores ?? []).slice(0, 6).map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        )}
      </section>

      {!noticesLoading && notices && notices.length > 0 && (novedadesData?.length ?? 0) === 0 && (
        <section className="px-4 py-6 max-w-7xl mx-auto">
          <h2 className="mb-4 text-xl font-black" data-testid="text-section-notices">
            Novedades
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {notices.slice(0, 4).map((notice) => (
              <NoticeCard key={notice.id} notice={notice} />
            ))}
          </div>
        </section>
      )}

      <section className="px-4 py-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Link href="/vender">
            <div
              data-testid="card-become-seller"
              className="group relative cursor-pointer overflow-hidden rounded-[26px] bg-gradient-to-r from-[#ea580c] via-[#dc2626] to-[#b91c1c] px-5 py-6 text-white shadow-[0_22px_60px_rgba(234,88,12,0.2)] transition-transform duration-300 hover:-translate-y-1"
            >
              <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-orange-300/20 blur-3xl" />
              <div className="relative flex items-center gap-4">
                <div className="rounded-2xl bg-white/18 p-3">
                  <Store className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">Comercios</p>
                  <h3 className="mt-1 text-xl font-black">Vendé en PachaPay</h3>
                  <p className="mt-1 text-sm text-white/80">Registrá tu negocio y accedé a un catálogo que ya separa minorista, profesional e institucional.</p>
                </div>
                <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </div>
            </div>
          </Link>

          <Link href="/repartidor">
            <div
              data-testid="card-become-rider"
              className="group relative cursor-pointer overflow-hidden rounded-[26px] bg-gradient-to-r from-[#2563eb] via-[#1d4ed8] to-[#1e3a8a] px-5 py-6 text-white shadow-[0_22px_60px_rgba(37,99,235,0.2)] transition-transform duration-300 hover:-translate-y-1"
            >
              <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-blue-300/20 blur-3xl" />
              <div className="relative flex items-center gap-4">
                <div className="rounded-2xl bg-white/18 p-3">
                  <Bike className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">Delivery</p>
                  <h3 className="mt-1 text-xl font-black">Trabajá como repartidor</h3>
                  <p className="mt-1 text-sm text-white/80">Sumate a la operación logística con una plataforma lista para escalar en cobertura y volumen.</p>
                </div>
                <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
        </div>
      </section>

      <TravelModal
        open={travelModal.open}
        onClose={() => setTravelModal((state) => ({ ...state, open: false }))}
        defaultTab={travelModal.tab}
      />
    </div>
  );
}
