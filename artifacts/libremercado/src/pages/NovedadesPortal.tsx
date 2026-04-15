import { useState, useMemo } from "react";
import { Search, MapPin, Building2, ChevronDown, X, BadgeCheck, Filter, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useNovedades } from "@/hooks/use-marketplace";
import { useLocation } from "@/hooks/use-location";
import { NovedadCard } from "@/components/feed/NovedadCard";
import { provincias } from "@shared/argentina";

const CATEGORIES = [
  { id: "all",         label: "Todas" },
  { id: "health",      label: "Salud" },
  { id: "tourism",     label: "Turismo" },
  { id: "culture",     label: "Cultura" },
  { id: "events",      label: "Eventos" },
  { id: "education",   label: "Educación" },
  { id: "environment", label: "Ambiente" },
  { id: "campaign",    label: "Campañas" },
  { id: "news",        label: "Noticias" },
];

export default function NovedadesPortal() {
  const { provinciaId, ciudadId, locationName, getProvincias, getCiudades, setLocation } = useLocation();

  // Filter state
  const [searchQuery, setSearchQuery]       = useState("");
  const [selectedProvince, setSelectedProvince] = useState<string>(provinciaId ?? "");
  const [selectedCity, setSelectedCity]     = useState<string>(ciudadId ?? "");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showOnlyOfficial, setShowOnlyOfficial] = useState(() => new URLSearchParams(window.location.search).get("type") === "official");
  const [showProvincePanel, setShowProvincePanel] = useState(false);

  // Fetch novedades
  const { data: novedades, isLoading } = useNovedades({
    provincia: selectedProvince || undefined,
    official: showOnlyOfficial || undefined,
    category: selectedCategory !== "all" ? selectedCategory : undefined,
    limit: 60,
  });

  // Cities for selected province
  const cities = useMemo(
    () => getCiudades(selectedProvince),
    [selectedProvince, getCiudades]
  );

  const selectedProvinceName = provincias.find(p => p.id === selectedProvince)?.name ?? "";
  const selectedCityName = cities.find(c => c.id === selectedCity)?.name ?? "";
  const displayLocation = selectedCityName || selectedProvinceName;

  // Client-side search filter
  const filtered = useMemo(() => {
    if (!novedades) return [];
    const q = searchQuery.toLowerCase().trim();
    return novedades.filter((n) => {
      if (selectedCityName && n.municipioName && n.municipioName.toLowerCase() !== selectedCityName.toLowerCase()) {
        return false;
      }
      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) ||
        n.summary?.toLowerCase().includes(q) ||
        n.emitterName.toLowerCase().includes(q) ||
        n.municipioName?.toLowerCase().includes(q)
      );
    });
  }, [novedades, searchQuery, selectedCityName]);

  const handleProvinceSelect = (provId: string) => {
    setSelectedProvince(provId);
    setSelectedCity("");
    setShowProvincePanel(false);
  };

  const clearLocationFilter = () => {
    setSelectedProvince("");
    setSelectedCity("");
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* ─── HERO HEADER ─────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 60%, #3b82f6 100%)" }}
      >
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1568992688065-536aad8a12f6?w=1200&h=400&fit=crop&q=60')", backgroundSize: "cover", backgroundPosition: "center" }}
        />
        <div className="relative z-10 max-w-5xl mx-auto px-4 py-10 sm:py-14">
          <div className="flex items-center gap-2 mb-2">
            <BadgeCheck className="h-5 w-5 text-blue-300" />
            <span className="text-blue-200 text-xs font-bold uppercase tracking-widest">Portal Oficial</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-1">
            Noticias de tu ciudad
          </h1>
          {locationName && locationName !== "Seleccionar ubicación" && (
            <p className="text-blue-200 text-sm mb-4 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              Mostrando contenido para <strong className="text-white ml-1">{displayLocation || locationName}</strong>
            </p>
          )}

          {/* ─── BUSCADOR ─── */}
          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Buscar noticias, campañas, municipios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-3 text-sm bg-white/95 border-0 shadow-lg rounded-xl focus-visible:ring-2 focus-visible:ring-blue-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── FILTROS ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-2">

          {/* Selector provincia/ciudad */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-8"
              onClick={() => setShowProvincePanel(!showProvincePanel)}
            >
              <MapPin className="h-3.5 w-3.5 text-primary" />
              {displayLocation || "Todas las provincias"}
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>

            {/* Dropdown provincia */}
            {showProvincePanel && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-white border rounded-xl shadow-2xl w-72 max-h-80 overflow-hidden flex flex-col">
                <div className="p-2 border-b">
                  <button
                    className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-zinc-50 flex items-center gap-2 text-muted-foreground"
                    onClick={clearLocationFilter}
                  >
                    <Globe className="h-4 w-4" />
                    Todo el país
                  </button>
                </div>
                <div className="overflow-y-auto flex-1 p-2 space-y-0.5">
                  {getProvincias().map((p) => (
                    <button
                      key={p.id}
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-blue-50 transition-colors ${selectedProvince === p.id ? "bg-blue-50 text-blue-700 font-semibold" : ""}`}
                      onClick={() => handleProvinceSelect(p.id)}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Selector ciudad (solo si hay provincia) */}
          {selectedProvince && cities.length > 0 && (
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="text-xs border rounded-lg px-3 py-1.5 h-8 bg-white focus:ring-2 focus:ring-blue-300 outline-none"
            >
              <option value="">Todas las ciudades</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}

          {/* Toggle oficial */}
          <button
            onClick={() => setShowOnlyOfficial(!showOnlyOfficial)}
            className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border h-8 transition-all ${
              showOnlyOfficial
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-zinc-600 border-zinc-200 hover:border-blue-300"
            }`}
          >
            <BadgeCheck className="h-3.5 w-3.5" />
            Solo oficiales
          </button>

          {/* Categorías */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide ml-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`whitespace-nowrap text-xs px-3 py-1.5 rounded-full border h-8 transition-all font-medium ${
                  selectedCategory === cat.id
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-zinc-600 border-zinc-200 hover:border-primary/40"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── CONTENT ─────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Info header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-zinc-800 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-500" />
              {displayLocation ? `Noticias de ${displayLocation}` : "Noticias Municipales"}
            </h2>
            {!isLoading && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {filtered.length} {filtered.length === 1 ? "novedad encontrada" : "novedades encontradas"}
              </p>
            )}
          </div>
          {(selectedProvince || showOnlyOfficial || selectedCategory !== "all" || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1 text-muted-foreground"
              onClick={() => {
                setSelectedProvince(provinciaId ?? "");
                setSelectedCity(ciudadId ?? "");
                setSelectedCategory("all");
                setShowOnlyOfficial(false);
                setSearchQuery("");
              }}
            >
              <X className="h-3 w-3" />
              Limpiar filtros
            </Button>
          )}
        </div>

        {/* Grid de novedades */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden bg-white border">
                <Skeleton className="h-36 w-full" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="h-14 w-14 text-zinc-200 mx-auto mb-3" />
            <h3 className="font-semibold text-zinc-500 mb-1">Sin novedades en esta zona</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery
                ? `No se encontraron resultados para "${searchQuery}"`
                : "No hay noticias municipales disponibles para los filtros seleccionados."}
            </p>
            <Button variant="outline" size="sm" onClick={() => {
              setSelectedProvince("");
              setSelectedCategory("all");
              setShowOnlyOfficial(false);
              setSearchQuery("");
            }}>
              Ver todo el país
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((nov) => (
              <NovedadCard key={nov.id} novedad={nov} size="lg" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
