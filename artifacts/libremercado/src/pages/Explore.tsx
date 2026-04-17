import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Filter, Grid, List, SlidersHorizontal, Search, Tag, Ticket, Heart, X, MapPin, Package, Lock } from "lucide-react";
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
import { useProducts, useStores, useWholesaleAccess, useWholesaleStores } from "@/hooks/use-marketplace";
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

  const channelParam = urlParams.get("channel") || urlParams.get("mode") || "";
  const isWholesaleMode = channelParam === "wholesale";

  const initialCategory = urlParams.get("category") || "all";
  const initialQuery = urlParams.get("q") || "";
  const initialFilter = urlParams.get("filter") || "";

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [sortBy, setSortBy] = useState("featured");
  // In wholesale mode, default to "stores" tab
  const [activeTab, setActiveTab] = useState<"products" | "stores">(isWholesaleMode ? "stores" : "products");
  const [activeFilter, setActiveFilter] = useState(initialFilter);
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  const { provinciaId, ciudadId, locationName, useGps, lat, lng, radiusKm } = useUserLocation();
  const locationFilter = useGps && lat && lng
    ? { useGps: true, lat, lng, radiusKm }
    : provinciaId
    ? { provinciaId, ciudadId }
    : undefined;

  // Wholesale-specific hooks
  const { data: accessData, isLoading: accessLoading } = useWholesaleAccess();
  const { data: wholesaleStores, isLoading: wholesaleStoresLoading } = useWholesaleStores();

  // Retail hooks (used in non-wholesale mode)
  const { data: products, isLoading: productsLoading } = useProducts(
    isWholesaleMode ? undefined : locationFilter
  );
  const { data: stores, isLoading: storesLoading } = useStores(
    isWholesaleMode ? undefined : locationFilter
  );

  useEffect(() => {
    setSelectedCategory(initialCategory);
    setSearchQuery(initialQuery);
    setActiveFilter(initialFilter);
  }, [initialCategory, initialQuery, initialFilter]);

  // When channel param changes, reset tab
  useEffect(() => {
    setActiveTab(isWholesaleMode ? "stores" : "products");
  }, [isWholesaleMode]);

  const getFilterTitle = () => {
    switch (activeFilter) {
      case "ofertas": return "Ofertas del día";
      case "cupones": return "Productos con cupones";
      case "favoritos": return "Tus favoritos";
      default: return null;
    }
  };

  const q = searchQuery.trim().toLowerCase();
  const selectedCatObj = categories.find(c => c.id === selectedCategory);

  // Build a map of storeId → store for quick lookup
  const storeMap = useMemo(() => {
    const m = new Map<string, { category: string }>();
    for (const s of (stores ?? [])) {
      m.set(s.id, { category: s.category ?? "" });
    }
    return m;
  }, [stores]);

  // Canonical mapping: store category string → filter id
  // This bridges the gap between store-level broad categories and product subcategories
  const STORE_CATEGORY_TO_FILTER_ID: Record<string, string> = {
    // Food / Comida
    "comida": "food",
    "restaurante": "food",
    "restaurant": "food",
    "gastronomia": "food",
    "gastronomía": "food",
    "pizzeria": "food",
    "pizzería": "food",
    "panaderia": "food",
    "panadería": "food",
    "bar": "food",
    "cafeteria": "food",
    "cafetería": "food",
    // Grocery / Supermercado
    "supermercado": "grocery",
    "almacen": "grocery",
    "almacén": "grocery",
    "market": "grocery",
    "minimarket": "grocery",
    // Pharmacy / Farmacia
    "farmacia": "pharmacy",
    "salud": "pharmacy",
    "drogueria": "pharmacy",
    "droguería": "pharmacy",
    // Electronics / Electrónica
    "electronica": "electronics",
    "electrónica": "electronics",
    "tecnologia": "electronics",
    "tecnología": "electronics",
    "electrodomesticos": "electronics",
    "electrodomésticos": "electronics",
    // Fashion / Moda
    "moda": "fashion",
    "ropa": "fashion",
    "indumentaria": "fashion",
    "fashion": "fashion",
    "calzado": "fashion",
    "zapateria": "fashion",
    "zapatería": "fashion",
    // Home / Hogar
    "hogar": "home",
    "muebles": "home",
    "decoracion": "home",
    "decoración": "home",
    "ferreteria": "home",
    "ferretería": "home",
    // Beauty / Belleza
    "belleza": "beauty",
    "cosmetica": "beauty",
    "cosméctica": "beauty",
    "peluqueria": "beauty",
    "peluquería": "beauty",
    "estetica": "beauty",
    "estética": "beauty",
    // Pets / Mascotas
    "mascotas": "pets",
    "pet shop": "pets",
    "petshop": "pets",
    "veterinaria": "pets",
  };

  // Resolve the filter ID for a store category string
  const resolveStoreCatToFilterId = (storeCat: string): string => {
    const normalized = storeCat.toLowerCase().trim();
    return STORE_CATEGORY_TO_FILTER_ID[normalized] ?? normalized;
  };

  const filteredProducts = (products ?? []).filter((p) => {
    if (selectedCategory !== "all") {
      // 1. Try direct match on product.category (exact or contains)
      const prodCat = p.category?.toLowerCase() ?? "";
      const directMatch =
        prodCat === selectedCategory.toLowerCase() ||
        (selectedCatObj && prodCat.includes(selectedCatObj.name.toLowerCase()));

      // 2. If no direct match, look up the store and check its category
      let storeMatch = false;
      if (!directMatch) {
        const parentStore = storeMap.get(p.storeId);
        if (parentStore) {
          const storeCatFilterId = resolveStoreCatToFilterId(parentStore.category);
          storeMatch = storeCatFilterId === selectedCategory;
        }
      }

      if (!directMatch && !storeMatch) return false;
    }

    const matchQuery = !q
      ? true
      : (p.name?.toLowerCase() ?? "").includes(q) ||
        (p.description?.toLowerCase() ?? "").includes(q);

    let matchFilter = true;
    if (activeFilter === "ofertas") matchFilter = p.originalPrice !== null && p.originalPrice !== undefined;
    else if (activeFilter === "cupones") matchFilter = parseFloat(p.price) < 5000;

    return matchQuery && matchFilter;
  });

  const filteredStores = (isWholesaleMode ? (wholesaleStores ?? []) : (stores ?? [])).filter((s) => {
    if (selectedCategory !== "all") {
      const storeCatFilterId = resolveStoreCatToFilterId(s.category ?? "");
      const storeCatName = (s.category ?? "").toLowerCase();
      const matchById = storeCatFilterId === selectedCategory;
      const matchByName = selectedCatObj ? storeCatName.includes(selectedCatObj.name.toLowerCase()) : false;
      if (!matchById && !matchByName) return false;
    }

    const matchQuery = !q
      ? true
      : (s.name?.toLowerCase() ?? "").includes(q) ||
        (s.description?.toLowerCase() ?? "").includes(q);

    return matchQuery;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case "price-low": return parseFloat(a.price) - parseFloat(b.price);
      case "price-high": return parseFloat(b.price) - parseFloat(a.price);
      case "name": return a.name.localeCompare(b.name);
      default: return 0;
    }
  });

  // ── WHOLESALE: Access Gate ─────────────────────────────────────────
  if (isWholesaleMode && !accessLoading && accessData && !accessData.hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto">
            <Lock className="h-10 w-10 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-2">Canal Mayorista</h1>
            <p className="text-muted-foreground">
              El acceso al portal mayorista está disponible únicamente para comerciantes registrados o usuarios con KYC verificado.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => window.location.href = "/vender"} className="bg-amber-600 hover:bg-amber-700 text-white">
              Registrar mi comercio
            </Button>
            <Button variant="outline" onClick={() => window.location.href = "/"}>
              Volver al inicio
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const storesIsLoading = isWholesaleMode ? wholesaleStoresLoading : storesLoading;

  return (
    <div className="min-h-screen">
      {/* ── Sticky Header ── */}
      <div className="bg-card border-b sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-col gap-3">
            {/* Wholesale badge */}
            {isWholesaleMode && (
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-600 text-white gap-1.5">
                  <Package className="h-3.5 w-3.5" />
                  Canal Mayorista
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Portal exclusivo para comercios y distribuidores
                </span>
              </div>
            )}

            {!isWholesaleMode && provinciaId && (
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
                placeholder={isWholesaleMode ? "Buscar tiendas mayoristas..." : "Buscar productos, tiendas y más..."}
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
                {!isWholesaleMode && (
                  <>
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
                  </>
                )}

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
        {/* Active filter chip (retail only) */}
        {!isWholesaleMode && activeFilter && (
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
            <Button variant="ghost" size="sm" onClick={() => setActiveFilter("")} data-testid="button-clear-filter">
              <X className="h-4 w-4 mr-1" />
              Quitar filtro
            </Button>
          </div>
        )}

        {/* ── Tabs ── */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "products" | "stores")}
          className="mb-6"
        >
          <TabsList>
            {!isWholesaleMode && (
              <TabsTrigger value="products" data-testid="tab-products">
                Productos ({filteredProducts.length})
              </TabsTrigger>
            )}
            <TabsTrigger value="stores" data-testid="tab-stores">
              {isWholesaleMode ? `Mayoristas (${filteredStores.length})` : `Tiendas (${filteredStores.length})`}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* ── Products Tab (retail only) ── */}
        {!isWholesaleMode && activeTab === "products" && (
          <>
            {productsLoading ? (
              <div className={viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" : "space-y-4"}>
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
                <p className="text-muted-foreground">Prueba cambiando los filtros, la categoría o el texto de búsqueda</p>
              </div>
            ) : (
              <div className={viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" : "space-y-4"}>
                {sortedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Stores Tab ── */}
        {activeTab === "stores" && (
          <>
            {storesIsLoading ? (
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
                {isWholesaleMode ? (
                  <>
                    <Package className="h-12 w-12 text-amber-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No hay tiendas mayoristas disponibles por el momento</h3>
                    <p className="text-muted-foreground">
                      Próximamente se incorporarán distribuidores y mayoristas a la plataforma.
                    </p>
                  </>
                ) : (
                  <>
                    <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No se encontraron tiendas</h3>
                    <p className="text-muted-foreground">Prueba cambiando los filtros, la categoría o el texto de búsqueda</p>
                  </>
                )}
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
