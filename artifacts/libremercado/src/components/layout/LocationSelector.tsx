import { useState } from "react";
import { MapPin, ChevronDown, ChevronRight, X, Check, Navigation, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLocation as useUserLocation } from "@/hooks/use-location";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type View = "main" | "provincias" | "ciudades" | "gps";

export function LocationSelector() {
  const {
    provinciaId,
    ciudadId,
    lat,
    useGps,
    radiusKm,
    locationName,
    setLocation,
    setGpsLocation,
    setRadius,
    clearLocation,
    requestGps,
    getProvincias,
    getCiudades,
  } = useUserLocation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("main");
  const [selectedProvincia, setSelectedProvincia] = useState<string | null>(null);
  const [localRadius, setLocalRadius] = useState(radiusKm);
  const [loadingGps, setLoadingGps] = useState(false);

  const provincias = getProvincias();

  const handleClose = () => {
    setOpen(false);
    setView("main");
    setSelectedProvincia(null);
  };

  const handleProvinciaClick = (provId: string) => {
    setSelectedProvincia(provId);
    setView("ciudades");
  };

  const handleCiudadClick = (ciudId: string) => {
    if (selectedProvincia) {
      setLocation(selectedProvincia, ciudId);
      handleClose();
    }
  };

  const handleProvinciaOnly = () => {
    if (selectedProvincia) {
      setLocation(selectedProvincia);
      handleClose();
    }
  };

  const handleClear = () => {
    clearLocation();
    handleClose();
  };

  const handleUseGps = async () => {
    setLoadingGps(true);
    const coords = await requestGps();
    setLoadingGps(false);
    if (coords) {
      setGpsLocation(coords.lat, coords.lng, localRadius);
      handleClose();
    } else {
      toast({
        title: "No se pudo obtener la ubicación",
        description: "Activá los permisos de ubicación en tu dispositivo.",
        variant: "destructive",
      });
    }
  };

  const handleApplyRadius = () => {
    if (useGps && lat != null) {
      setRadius(localRadius);
    }
    setView("main");
  };

  const ciudades = selectedProvincia ? getCiudades(selectedProvincia) : [];
  const selectedProvinciaName = selectedProvincia
    ? provincias.find((p) => p.id === selectedProvincia)?.name
    : null;

  const hasLocation = provinciaId || (useGps && lat != null);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="hidden lg:flex items-center gap-2 text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10"
          data-testid="button-location"
        >
          {useGps ? <Navigation className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
          <span className="text-sm max-w-[160px] truncate">
            {hasLocation ? locationName : "Elegir ubicación"}
          </span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {view === "ciudades" ? (
              <span className="flex items-center gap-2">
                <button
                  onClick={() => setView("provincias")}
                  className="text-muted-foreground hover:text-foreground"
                  data-testid="button-back-provincias"
                >
                  Provincias
                </button>
                <ChevronRight className="h-4 w-4" />
                {selectedProvinciaName}
              </span>
            ) : view === "gps" ? (
              <span className="flex items-center gap-2">
                <button
                  onClick={() => setView("main")}
                  className="text-muted-foreground hover:text-foreground"
                  data-testid="button-back-main"
                >
                  Ubicación
                </button>
                <ChevronRight className="h-4 w-4" />
                Radio de búsqueda
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Seleccioná tu ubicación
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* MAIN VIEW */}
        {view === "main" && (
          <div className="space-y-3">
            {hasLocation && (
              <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
                <div className="flex items-center gap-2">
                  {useGps ? <Navigation className="h-4 w-4 text-primary" /> : <Check className="h-4 w-4 text-primary" />}
                  <span className="text-sm font-medium">{locationName}</span>
                </div>
                <div className="flex gap-1">
                  {useGps && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setLocalRadius(radiusKm); setView("gps"); }}
                      data-testid="button-adjust-radius"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={handleClear} data-testid="button-clear-location">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <Button
              className="w-full justify-start gap-3"
              variant="outline"
              onClick={handleUseGps}
              disabled={loadingGps}
              data-testid="button-use-gps"
            >
              <Navigation className="h-4 w-4 text-primary" />
              {loadingGps ? "Obteniendo ubicación..." : "Usar mi ubicación actual (GPS)"}
            </Button>

            <Button
              className="w-full justify-start gap-3"
              variant="outline"
              onClick={() => setView("provincias")}
              data-testid="button-select-provincia"
            >
              <MapPin className="h-4 w-4 text-primary" />
              Seleccionar provincia o ciudad
            </Button>
          </div>
        )}

        {/* GPS RADIUS VIEW */}
        {view === "gps" && (
          <div className="space-y-6 py-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Radio de búsqueda</span>
                <span className="text-sm font-semibold text-primary">{localRadius} km</span>
              </div>
              <Slider
                min={2}
                max={100}
                step={1}
                value={[localRadius]}
                onValueChange={([v]) => setLocalRadius(v)}
                data-testid="slider-radius"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>2 km</span>
                <span>25 km</span>
                <span>50 km</span>
                <span>100 km</span>
              </div>
            </div>
            <Button className="w-full" onClick={handleApplyRadius} data-testid="button-apply-radius">
              Aplicar radio
            </Button>
          </div>
        )}

        {/* PROVINCIAS VIEW */}
        {view === "provincias" && (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-1">
              {provincias.map((prov) => (
                <button
                  key={prov.id}
                  onClick={() => handleProvinciaClick(prov.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-md text-left hover-elevate",
                    provinciaId === prov.id && "bg-primary/10"
                  )}
                  data-testid={`button-provincia-${prov.id}`}
                >
                  <span>{prov.name}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* CIUDADES VIEW */}
        {view === "ciudades" && (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-1">
              <button
                onClick={handleProvinciaOnly}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-left hover-elevate text-primary font-medium"
                data-testid="button-toda-provincia"
              >
                <MapPin className="h-4 w-4" />
                Toda la provincia
              </button>
              <div className="border-t my-2" />
              {ciudades.map((ciudad) => (
                <button
                  key={ciudad.id}
                  onClick={() => handleCiudadClick(ciudad.id)}
                  className={cn(
                    "w-full flex items-center px-3 py-2 rounded-md text-left hover-elevate",
                    ciudadId === ciudad.id && provinciaId === selectedProvincia && "bg-primary/10"
                  )}
                  data-testid={`button-ciudad-${ciudad.id}`}
                >
                  <span>{ciudad.name}</span>
                  {ciudadId === ciudad.id && provinciaId === selectedProvincia && (
                    <Check className="h-4 w-4 ml-auto text-primary" />
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
