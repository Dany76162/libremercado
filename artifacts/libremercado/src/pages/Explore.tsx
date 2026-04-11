import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Filter, Grid, List, SlidersHorizontal, Search, Tag, Ticket, Heart, X, MapPin } from "lucide-react";
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

const categories = [
  { id: "all", name: "Todos" },
  { id: "food", name: "Comida" },
  { id: "grocery", name: "Supermercado" },
  { id: "pharmacy", name: "Farmacia" },
  { id: "electronics", name: "Electrónica" },
  { id: "fashion", name: "Moda" },
  { id: "home", name: "Hogar" },
  { id: "beauty", name: "Belleza" },
  { id: "pets", name: "Mascotas" },
];

export default function Explore() {
  const [location] = useLocation();

  const urlParams = useMemo(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search);
    }
    return new URLSearchParams(location.split("?")[1] || "");
  }, [location]);

  const initialCategory = urlParams.get("category") || "all";
  const initialQuery = urlParams.get("q") || "";
  const initialFilter = urlParams.get("filter") || "";

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [sortBy, setSortBy] = useState("featured");
  const [activeTab, setActiveTab] = useState<"products" | "stores">("products");
  const [activeFilter, setActiveFilter] = useState(initialFilter);

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
  }, [initialCategory, initialQuery, initialFilter]);

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

  const filteredProducts = (products ?? []).filter((p) => {
    const matchCategory =
      selectedCategory === "all"
        ? true
        : (p.category?.toLowerCase() ?? "") === selectedCategory.toLowerCase();

    const matchQuery =
      !q
        ? true
        : (p.name?.toLowerCase() ?? "").includes(q) ||
          (p.description?.toLowerCase() ?? "").includes(q);

    let matchFilter = true;
    if (activeFilter === "ofertas") {
      matchFilter = p.originalPrice !== null && p.originalPrice !== undefined;
    } else if (activeFilter === "cupones") {
      matchFilter = parseFloat(p.price) < 5000;
    }

    return matchCategory && matchQuery && matchFilter;
  });

  const filteredStores = (stores ?? []).filter((s) => {
    const matchCategory =
      selectedCategory === "all"
        ? true
        : (s.category?.toLowerCase() ?? "") === selectedCategory.toLowerCase();

    const matchQuery =
      !q
        ? true
        : (s.name?.toLowerCase() ?? "").includes(q) ||
          (s.description?.toLowerCase() ?? "").includes(q);

    return matchCategory && matchQuery;
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
    <div className="min-h-screen">
      <div className="bg-card border-b sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-col gap-3">
            {provinciaId && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                <span>Mostrando resultados en <span className="font-medium text-foreground">{locationName}</span></span>
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

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 flex-1">
                {categories.map((cat) => (
                  <Badge
                    key={cat.id}
                    variant={selectedCategory === cat.id ? "default" : "secondary"}
                    className="cursor-pointer whitespace-nowrap px-3 py-1.5"
                    onClick={() => setSelectedCategory(cat.id)}
                    data-testid={`badge-category-${cat.id}`}
                  >
                    {cat.name}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center gap-2 shrink-0">
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
                        <label className="text-sm font-medium mb-2 block">
                          Ordenar por
                        </label>
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
          onValueChange={(v) => setActiveTab(v as "products" | "stores")}
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
                <h3 className="text-lg font-semibold mb-2">
                  No se encontraron productos
                </h3>
                <p className="text-muted-foreground">
                  Prueba cambiando los filtros, la categoría o el texto de búsqueda
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
                <h3 className="text-lg font-semibold mb-2">
                  No se encontraron tiendas
                </h3>
                <p className="text-muted-foreground">
                  Prueba cambiando los filtros, la categoría o el texto de búsqueda
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
