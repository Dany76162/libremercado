import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Filter, Grid, List, SlidersHorizontal, Search, Tag, Ticket, Heart, X, MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { StoreCard } from "@/components/marketplace/StoreCard";
import { useProducts, useStores } from "@/hooks/use-marketplace";
import { useLocation as useUserLocation } from "@/hooks/use-location";
import {
  EXPLORE_CATEGORY_OPTIONS,
  type CatalogCategoryId,
  productMatchesCategory,
  storeMatchesCategory,
} from "@/lib/catalog";

export default function Explore() {
  const [location] = useLocation();

  const urlParams = useMemo(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search);
    }
    return new URLSearchParams(location.split("?")[1] || "");
  }, [location]);

  const initialCategory = (urlParams.get("category") as CatalogCategoryId) || "all";
  const initialQuery = urlParams.get("q") || "";
  const initialFilter = urlParams.get("filter") || "";
  const initialTab = urlParams.get("tab") === "stores" ? "stores" : "products";
  const initialFeatured = urlParams.get("featured") === "true";

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedCategory, setSelectedCategory] = useState<CatalogCategoryId>(initialCategory);
  const [sortBy, setSortBy] = useState("featured");
  const [activeTab, setActiveTab] = useState<"products" | "stores">(initialTab);
  const [activeFilter, setActiveFilter] = useState(initialFilter);
  const [featuredOnly, setFeaturedOnly] = useState(initialFeatured);
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  const { provinciaId, ciudadId, locationName, useGps, lat, lng, radiusKm } = useUserLocation();
  const locationFilter = useGps && lat && lng
    ? { useGps: true, lat, lng, radiusKm }
    : provinciaId
      ? { provinciaId, ciudadId }
      : undefined;

  const { data: products, isLoading: productsLoading } = useProducts(locationFilter);
  const { data: stores, isLoading: storesLoading } = useStores(locationFilter);

  useEffect(() => {
    setSelectedCategory(initialCategory);
    setSearchQuery(initialQuery);
    setActiveFilter(initialFilter);
    setActiveTab(initialTab);
    setFeaturedOnly(initialFeatured);
  }, [initialCategory, initialFilter, initialQuery, initialTab, initialFeatured]);

  const getFilterTitle = () => {
    switch (activeFilter) {
      case "ofertas":
        return "Ofertas del día";
      case "cupones":
        return "Productos con cupones";
      case "favoritos":
        return "Tus favoritos";
      default:
        return null;
    }
  };

  const q = searchQuery.trim().toLowerCase();

  const filteredProducts = (products ?? []).filter((product) => {
    const matchCategory = productMatchesCategory(product.category, selectedCategory);
    const matchQuery = !q
      ? true
      : (product.name?.toLowerCase() ?? "").includes(q) ||
        (product.description?.toLowerCase() ?? "").includes(q);

    let matchFilter = true;
    if (activeFilter === "ofertas") {
      matchFilter = product.originalPrice !== null && product.originalPrice !== undefined;
    } else if (activeFilter === "cupones") {
      matchFilter = parseFloat(product.price) < 5000;
    }

    const matchFeatured = featuredOnly ? product.isSponsored : true;
    return matchCategory && matchQuery && matchFilter && matchFeatured;
  });

  const filteredStores = (stores ?? []).filter((store) => {
    const matchCategory = storeMatchesCategory(store.category, selectedCategory);
    const matchQuery = !q
      ? true
      : (store.name?.toLowerCase() ?? "").includes(q) ||
        (store.description?.toLowerCase() ?? "").includes(q);
    const matchFeatured = featuredOnly ? store.isFeatured : true;
    return matchCategory && matchQuery && matchFeatured;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case "price-low":
        return parseFloat(a.price) - parseFloat(b.price);
      case "price-high":
        return parseFloat(b.price) - parseFloat(a.price);
      case "name":
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="bg-card border-b sticky top-16 z-40 backdrop-blur supports-[backdrop-filter]:bg-card/95">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-col gap-3">
            {provinciaId && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                <span>
                  Mostrando resultados en <span className="font-medium text-foreground">{locationName}</span>
                </span>
              </div>
            )}

            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar productos, tiendas y más..."
                className="pl-9"
                data-testid="input-explore-search"
              />
            </div>

            <div className="flex flex-col xl:flex-row gap-3">
              <div className="flex gap-2 overflow-x-auto pb-2 xl:pb-0 flex-1">
                {EXPLORE_CATEGORY_OPTIONS.map((category) => (
                  <Badge
                    key={category.id}
                    variant={selectedCategory === category.id ? "default" : "secondary"}
                    className="cursor-pointer whitespace-nowrap px-3 py-1.5"
                    onClick={() => setSelectedCategory(category.id)}
                    data-testid={`badge-category-${category.id}`}
                  >
                    {category.name}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant={featuredOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFeaturedOnly((current) => !current)}
                  data-testid="button-featured-filter"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Destacados
                </Button>

                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="sm:hidden">
                      <SlidersHorizontal className="h-4 w-4 mr-2" />
                      Filtros
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-auto">
                    <SheetHeader>
                      <SheetTitle>Filtros</SheetTitle>
                    </SheetHeader>
                    <div className="py-4 space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Ordenar por</label>
                        <Select value={sortBy} onValueChange={setSortBy}>
                          <SelectTrigger data-testid="select-sort-mobile">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="featured">Destacados</SelectItem>
                            <SelectItem value="price-low">Precio: menor a mayor</SelectItem>
                            <SelectItem value="price-high">Precio: mayor a menor</SelectItem>
                            <SelectItem value="name">Nombre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-44 hidden sm:flex" data-testid="select-sort">
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="featured">Destacados</SelectItem>
                    <SelectItem value="price-low">Precio: menor a mayor</SelectItem>
                    <SelectItem value="price-high">Precio: mayor a menor</SelectItem>
                    <SelectItem value="name">Nombre</SelectItem>
                  </SelectContent>
                </Select>

                <div className="hidden sm:flex border rounded-md">
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="icon"
                    className="rounded-r-none"
                    onClick={() => setViewMode("grid")}
                    data-testid="button-view-grid"
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="icon"
                    className="rounded-l-none"
                    onClick={() => setViewMode("list")}
                    data-testid="button-view-list"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeFilter && (
          <div className="flex items-center justify-between mb-4 p-4 bg-card rounded-lg border">
            <div className="flex items-center gap-3">
              {activeFilter === "ofertas" && <Tag className="h-5 w-5 text-primary" />}
              {activeFilter === "cupones" && <Ticket className="h-5 w-5 text-primary" />}
              {activeFilter === "favoritos" && <Heart className="h-5 w-5 text-primary" />}
              <div>
                <h2 className="font-bold text-lg" data-testid="text-filter-title">{getFilterTitle()}</h2>
                <p className="text-sm text-muted-foreground">
                  {activeFilter === "ofertas" && "Productos con descuento especial"}
                  {activeFilter === "cupones" && "Productos con precios accesibles"}
                  {activeFilter === "favoritos" && "Tus productos guardados"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveFilter("")}
              data-testid="button-clear-filter"
            >
              <X className="h-4 w-4 mr-1" />
              Quitar filtro
            </Button>
          </div>
        )}

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "products" | "stores")}
          className="mb-6"
        >
          <TabsList>
            <TabsTrigger value="products" data-testid="tab-products">
              Productos ({filteredProducts.length})
            </TabsTrigger>
            <TabsTrigger value="stores" data-testid="tab-stores">
              Tiendas ({filteredStores.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {activeTab === "products" && (
          <>
            {productsLoading ? (
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                    : "space-y-4"
                }
              >
                {Array.from({ length: 10 }).map((_, i) => (
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
            ) : sortedProducts.length === 0 ? (
              <div className="text-center py-12">
                <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No se encontraron productos</h3>
                <p className="text-muted-foreground">
                  Probá cambiando los filtros, la categoría o el texto de búsqueda.
                </p>
              </div>
            ) : (
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                    : "space-y-4"
                }
              >
                {sortedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "stores" && (
          <>
            {storesLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
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
            ) : filteredStores.length === 0 ? (
              <div className="text-center py-12">
                <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No se encontraron tiendas</h3>
                <p className="text-muted-foreground">
                  Probá cambiando los filtros, la categoría o el texto de búsqueda.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStores.map((store) => (
                  <StoreCard key={store.id} store={store} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
