import { useState, useMemo } from "react";
import { Search, MapPin, Building2, ChevronDown, X, BadgeCheck, Globe, Video, ArrowRight, PlayCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useNovedades } from "@/hooks/use-marketplace";
import { useLocation } from "@/hooks/use-location";
import { NovedadCard } from "@/components/feed/NovedadCard";
import { provincias } from "@shared/argentina";

const CATEGORIES = [
  { id: "all",           label: "Todas" },
  { id: "health",        label: "Salud" },
  { id: "safety",        label: "Seguridad" },
  { id: "transit",       label: "Tránsito" },
  { id: "public_works",  label: "Obras Públicas" },
  { id: "services",      label: "Servicios" },
  { id: "education",     label: "Educación" },
  { id: "culture",       label: "Cultura" },
  { id: "tourism",       label: "Turismo" },
  { id: "sports",        label: "Deporte" },
  { id: "social",        label: "Desarrollo Social" },
  { id: "environment",   label: "Ambiente" },
  { id: "employment",    label: "Empleo" },
  { id: "emergencies",   label: "Emergencias" },
  { id: "participation", label: "Participación Ciudadana" },
  { id: "campaign",      label: "Campañas" },
  { id: "news",          label: "Noticias" },
];

export default function NovedadesPortal() {
  const { provinciaId, ciudadId, locationName, getProvincias, getCiudades } = useLocation();

  // Filter state
  const [searchQuery, setSearchQuery]       = useState("");
  const [selectedProvince, setSelectedProvince] = useState<string>(provinciaId ?? "");
  const [selectedCity, setSelectedCity]     = useState<string>(ciudadId ?? "");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showOnlyOfficial, setShowOnlyOfficial] = useState(() => new URLSearchParams(window.location.search).get("type") === "official");
  const [showProvincePanel, setShowProvincePanel] = useState(false);
  const [showCityPanel, setShowCityPanel] = useState(false);

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
  
  const displayLocation = useMemo(() => {
    if (selectedCityName && selectedProvinceName) return `${selectedCityName}, ${selectedProvinceName}`;
    if (selectedCityName) return selectedCityName;
    if (selectedProvinceName) return selectedProvinceName;
    return "";
  }, [selectedCityName, selectedProvinceName]);

  // Client-side search filter
  const filtered = useMemo(() => {
    if (!novedades) return [];
    const q = searchQuery.toLowerCase().trim();
    return novedades.filter((n) => {
      // Si hay una ciudad seleccionada explícitamente, filtramos rigurosamente
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

  const handleCitySelect = (cityId: string) => {
    setSelectedCity(cityId);
    setShowCityPanel(false);
  };

  const clearLocationFilter = () => {
    setSelectedProvince("");
    setSelectedCity("");
    setShowProvincePanel(false);
    setShowCityPanel(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* ─── HERO HEADER ─────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden bg-zinc-900"
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #2563eb 100%)",
        }}
      >
        <div className="absolute inset-0 opacity-20 transition-opacity duration-1000"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1568992688065-536aad8a12f6?w=1600&h=600&fit=crop&q=80')", backgroundSize: "cover", backgroundPosition: "center" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-0" />
        
        <div className="relative z-10 max-w-[1400px] mx-auto px-4 py-16 sm:py-24 md:py-28 text-center sm:text-left flex flex-col items-center sm:items-start">
          <div className="flex items-center gap-2 mb-4 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20">
            <BadgeCheck className="h-5 w-5 text-blue-300" />
            <span className="text-white text-sm font-semibold tracking-wide">PORTAL OFICIAL MUNICIPAL</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-4 max-w-4xl tracking-tight">
            Noticias y actualidad de tu ciudad
          </h1>
          
          <p className="text-blue-100 text-lg md:text-xl font-medium mb-10 max-w-2xl">
            Descubrí comunicados, campañas de salud, turismo y obras públicas en {displayLocation || locationName || "todo el país"}.
          </p>

          {/* ─── BUSCADOR ─── */}
          <div className="relative w-full max-w-3xl group">
            <div className="absolute inset-0 bg-white/20 blur-xl rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative flex items-center bg-white rounded-2xl shadow-2xl p-2 gap-2 border border-white/50 backdrop-blur-sm">
              <div className="pl-3 py-2 flex items-center justify-center text-zinc-400">
                <Search className="h-6 w-6" />
              </div>
              <Input
                placeholder="Buscar noticias, campañas, alertas o municipios..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-0 shadow-none text-base sm:text-lg focus-visible:ring-0 px-2 h-12 text-zinc-800 placeholder:text-zinc-400 font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="p-2 text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 h-12 font-bold shadow-md">
                Buscar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── REELMARK CTA & OFICIAL INFO ─────────────────────────────── */}
      <div className="bg-white border-b border-zinc-200/60 shadow-sm relative z-20">
        <div className="max-w-[1400px] mx-auto px-4 py-5 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-3.5 rounded-2xl shadow-lg shadow-blue-600/20">
              <PlayCircle className="h-7 w-7 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 text-lg md:text-xl">Integración con ReelMark</h3>
              <p className="text-zinc-500 text-sm font-medium">Municipios y entidades: publicen contenido en formato video corto (vertical).</p>
            </div>
          </div>
          <Link href="/auth">
            <Button variant="outline" className="gap-2 rounded-xl h-11 border-zinc-200 hover:bg-zinc-50 hover:text-blue-600 font-semibold shadow-sm w-full md:w-auto">
              <Video className="h-4 w-4" />
              Subir Corto Institucional
              <ArrowRight className="h-4 w-4 opacity-50" />
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── FILTROS ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-zinc-200/80 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 py-3 sm:py-4 flex flex-col lg:flex-row lg:items-center gap-4">

          {/* Wrapper Selectores Geográficos */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Dropdown Provincia */}
            <div className="relative">
              <Button
                variant="outline"
                className="gap-2 h-10 px-4 rounded-xl font-semibold bg-white hover:bg-zinc-50 border-zinc-200"
                onClick={() => {
                  setShowProvincePanel(!showProvincePanel);
                  setShowCityPanel(false);
                }}
              >
                <MapPin className="h-4 w-4 text-blue-600" />
                {selectedProvinceName || "Todas las provincias"}
                <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${showProvincePanel ? "rotate-180" : ""}`} />
              </Button>

              {showProvincePanel && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProvincePanel(false)} />
                  <div className="absolute top-full left-0 mt-2 z-50 bg-white border border-zinc-100 rounded-2xl shadow-xl w-80 max-h-96 flex flex-col overflow-hidden ring-1 ring-black/5">
                    <div className="p-2 border-b border-zinc-100">
                      <button
                        className="w-full text-left px-3 py-2.5 text-sm rounded-xl hover:bg-zinc-100 flex items-center gap-2 font-medium text-zinc-600 transition-colors"
                        onClick={clearLocationFilter}
                      >
                        <Globe className="h-4 w-4" />
                        Todo el país
                      </button>
                    </div>
                    <div className="overflow-y-auto flex-1 p-2 space-y-1">
                      {getProvincias().map((p) => (
                        <button
                          key={p.id}
                          className={`w-full text-left px-3 py-2 text-sm rounded-xl hover:bg-blue-50 transition-colors ${selectedProvince === p.id ? "bg-blue-50 text-blue-700 font-bold" : "text-zinc-700 font-medium"}`}
                          onClick={() => handleProvinceSelect(p.id)}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Dropdown Ciudad (Solo si hay provincia seleccionada) */}
            {selectedProvince && cities.length > 0 && (
              <div className="relative">
                <Button
                  variant="outline"
                  className="gap-2 h-10 px-4 rounded-xl font-semibold bg-white hover:bg-zinc-50 border-zinc-200"
                  onClick={() => {
                    setShowCityPanel(!showCityPanel);
                    setShowProvincePanel(false);
                  }}
                >
                  {selectedCityName || "Todos los departamentos"}
                  <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${showCityPanel ? "rotate-180" : ""}`} />
                </Button>

                {showCityPanel && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowCityPanel(false)} />
                    <div className="absolute top-full left-0 mt-2 z-50 bg-white border border-zinc-100 rounded-2xl shadow-xl w-80 max-h-96 flex flex-col overflow-hidden ring-1 ring-black/5">
                      <div className="p-2 border-b border-zinc-100">
                        <button
                          className="w-full text-left px-3 py-2.5 text-sm rounded-xl hover:bg-zinc-100 flex items-center gap-2 font-medium text-zinc-600 transition-colors"
                          onClick={() => handleCitySelect("")}
                        >
                          Todas las ciudades de {selectedProvinceName}
                        </button>
                      </div>
                      <div className="overflow-y-auto flex-1 p-2 space-y-1">
                        {cities.map((c) => (
                          <button
                            key={c.id}
                            className={`w-full text-left px-3 py-2 text-sm rounded-xl hover:bg-blue-50 transition-colors ${selectedCity === c.id ? "bg-blue-50 text-blue-700 font-bold" : "text-zinc-700 font-medium"}`}
                            onClick={() => handleCitySelect(c.id)}
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Toggle oficial */}
            <button
              onClick={() => setShowOnlyOfficial(!showOnlyOfficial)}
              className={`inline-flex items-center gap-2 text-sm px-4 py-2 rounded-xl border h-10 font-bold transition-all shadow-sm ${
                showOnlyOfficial
                  ? "bg-blue-600 text-white border-blue-600 ring-2 ring-blue-600/20"
                  : "bg-white text-zinc-700 border-zinc-200 hover:border-blue-300 hover:bg-zinc-50"
              }`}
            >
              <BadgeCheck className={`h-4 w-4 ${showOnlyOfficial ? "text-white" : "text-blue-500"}`} />
              Solo Oficiales
            </button>
          </div>

          <div className="w-px h-8 bg-zinc-200 hidden lg:block mx-2" />

          {/* Categorías */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`whitespace-nowrap text-sm px-4 py-2 rounded-xl border h-10 transition-all font-semibold shadow-sm ${
                    isSelected
                      ? "bg-zinc-900 text-white border-zinc-900"
                      : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── CONTENT ─────────────────────────────────────────────────── */}
      <div className="max-w-[1400px] mx-auto px-4 py-10 md:py-14">

        {/* Info header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-zinc-900 flex items-center gap-3 tracking-tight">
              <Building2 className="h-8 w-8 text-blue-600" />
              {displayLocation ? `Actualidad en ${displayLocation}` : "Todas las Noticias Municipales"}
            </h2>
            {!isLoading && (
              <p className="text-sm md:text-base text-zinc-500 mt-2 font-medium">
                {filtered.length} {filtered.length === 1 ? "publicación oficial encontrada" : "publicaciones oficiales encontradas"}
              </p>
            )}
          </div>
          {(selectedProvince || showOnlyOfficial || selectedCategory !== "all" || searchQuery) && (
            <Button
              variant="outline"
              className="gap-2 h-10 rounded-xl font-bold bg-white text-zinc-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors shadow-sm self-start sm:self-auto"
              onClick={() => {
                setSelectedProvince(provinciaId ?? "");
                setSelectedCity(ciudadId ?? "");
                setSelectedCategory("all");
                setShowOnlyOfficial(false);
                setSearchQuery("");
              }}
            >
              <X className="h-4 w-4" />
              Restablecer filtros
            </Button>
          )}
        </div>

        {/* Grid de novedades */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-3xl overflow-hidden bg-white border border-zinc-100 shadow-sm flex flex-col">
                <Skeleton className="h-48 w-full rounded-none" />
                <div className="p-6 flex flex-col gap-4">
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-24 rounded-full" />
                  </div>
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-4/5" />
                  <div className="mt-auto pt-4 flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-zinc-100 shadow-sm">
            <Building2 className="h-20 w-20 text-zinc-200 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-zinc-700 mb-2">Sin contenido disponible</h3>
            <p className="text-lg text-zinc-500 mb-8 max-w-md mx-auto">
              {searchQuery
                ? `No encontramos resultados exactos para "${searchQuery}" en este sector.`
                : "Aún no hay publicaciones oficiales para los filtros o la ubicación seleccionada."}
            </p>
            <Button size="lg" className="rounded-xl font-bold px-8 h-12" onClick={() => {
              setSelectedProvince("");
              setSelectedCity("");
              setSelectedCategory("all");
              setShowOnlyOfficial(false);
              setSearchQuery("");
            }}>
              Explorar todo el territorio
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((nov) => (
              <div key={nov.id} className="transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl rounded-3xl">
                <NovedadCard novedad={nov} size="lg" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
