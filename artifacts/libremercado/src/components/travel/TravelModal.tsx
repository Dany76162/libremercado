import { useState, useEffect } from "react";
import {
  Bus, Plane, Search, ArrowLeftRight, Calendar, MapPin,
  Clock, Star, ChevronRight, Tag, Wifi, Coffee, Zap, Users,
  ArrowRight, X, Filter, SlidersHorizontal, CheckCircle2, Loader2
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

// ─── DATA ──────────────────────────────────────────────────────────────────

const BUS_COMPANIES = [
  {
    id: "flechabus",
    name: "Flecha Bus",
    initials: "FB",
    color: "bg-yellow-500",
    textColor: "text-yellow-600",
    bgLight: "bg-yellow-50 dark:bg-yellow-950/30",
    borderColor: "border-yellow-200 dark:border-yellow-800",
    rating: 4.6,
    reviews: 2341,
    services: ["wifi", "ac", "food"],
    destinations: ["Buenos Aires", "Córdoba", "Rosario", "Mendoza", "San Luis"],
  },
  {
    id: "chevallier",
    name: "Chevallier",
    initials: "CH",
    color: "bg-blue-600",
    textColor: "text-blue-600",
    bgLight: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-800",
    rating: 4.4,
    reviews: 1876,
    services: ["wifi", "ac"],
    destinations: ["Buenos Aires", "Mendoza", "San Juan", "Neuquén", "Bariloche"],
  },
  {
    id: "andesmar",
    name: "Andesmar",
    initials: "AM",
    color: "bg-purple-600",
    textColor: "text-purple-600",
    bgLight: "bg-purple-50 dark:bg-purple-950/30",
    borderColor: "border-purple-200 dark:border-purple-800",
    rating: 4.3,
    reviews: 1540,
    services: ["wifi", "ac", "food"],
    destinations: ["Mendoza", "San Juan", "La Rioja", "Catamarca", "Tucumán"],
  },
  {
    id: "elrapido",
    name: "El Rápido Argentino",
    initials: "RA",
    color: "bg-green-600",
    textColor: "text-green-600",
    bgLight: "bg-green-50 dark:bg-green-950/30",
    borderColor: "border-green-200 dark:border-green-800",
    rating: 4.5,
    reviews: 2102,
    services: ["wifi", "ac"],
    destinations: ["Buenos Aires", "Rosario", "Santa Fe", "Paraná", "Concordia"],
  },
  {
    id: "plusmar",
    name: "Plusmar",
    initials: "PM",
    color: "bg-red-500",
    textColor: "text-red-600",
    bgLight: "bg-red-50 dark:bg-red-950/30",
    borderColor: "border-red-200 dark:border-red-800",
    rating: 4.2,
    reviews: 987,
    services: ["ac", "food"],
    destinations: ["Mar del Plata", "Miramar", "Necochea", "Bahía Blanca", "Buenos Aires"],
  },
  {
    id: "cotap",
    name: "COTAP",
    initials: "CT",
    color: "bg-orange-500",
    textColor: "text-orange-600",
    bgLight: "bg-orange-50 dark:bg-orange-950/30",
    borderColor: "border-orange-200 dark:border-orange-800",
    rating: 4.1,
    reviews: 654,
    services: ["ac"],
    destinations: ["Tucumán", "Salta", "Jujuy", "Santiago del Estero", "Buenos Aires"],
  },
];

const AIRLINE_COMPANIES = [
  {
    id: "aerolineas",
    name: "Aerolíneas Argentinas",
    initials: "AR",
    color: "bg-sky-600",
    textColor: "text-sky-600",
    bgLight: "bg-sky-50 dark:bg-sky-950/30",
    borderColor: "border-sky-200 dark:border-sky-800",
    rating: 4.3,
    reviews: 5821,
    services: ["wifi", "food", "entertainment"],
    type: "full",
    destinations: ["Córdoba", "Mendoza", "Bariloche", "Iguazú", "Salta", "Ushuaia"],
  },
  {
    id: "latam",
    name: "LATAM Airlines",
    initials: "LA",
    color: "bg-red-600",
    textColor: "text-red-600",
    bgLight: "bg-red-50 dark:bg-red-950/30",
    borderColor: "border-red-200 dark:border-red-800",
    rating: 4.4,
    reviews: 4312,
    services: ["wifi", "food"],
    type: "full",
    destinations: ["Córdoba", "Mendoza", "Rosario", "Tucumán", "Santiago de Chile"],
  },
  {
    id: "flybondi",
    name: "Flybondi",
    initials: "FO",
    color: "bg-amber-500",
    textColor: "text-amber-600",
    bgLight: "bg-amber-50 dark:bg-amber-950/30",
    borderColor: "border-amber-200 dark:border-amber-800",
    rating: 3.9,
    reviews: 2876,
    services: ["entertainment"],
    type: "low",
    destinations: ["Córdoba", "Mendoza", "Mar del Plata", "Salta", "Iguazú", "Bariloche"],
  },
  {
    id: "jetsmart",
    name: "JetSmart",
    initials: "JA",
    color: "bg-orange-500",
    textColor: "text-orange-600",
    bgLight: "bg-orange-50 dark:bg-orange-950/30",
    borderColor: "border-orange-200 dark:border-orange-800",
    rating: 3.8,
    reviews: 1923,
    services: [],
    type: "low",
    destinations: ["Córdoba", "Mendoza", "Bariloche", "Tucumán", "Salta"],
  },
  {
    id: "andes",
    name: "Andes Líneas Aéreas",
    initials: "AN",
    color: "bg-indigo-600",
    textColor: "text-indigo-600",
    bgLight: "bg-indigo-50 dark:bg-indigo-950/30",
    borderColor: "border-indigo-200 dark:border-indigo-800",
    rating: 4.0,
    reviews: 1102,
    services: ["food"],
    type: "full",
    destinations: ["Salta", "Tucumán", "Jujuy", "Buenos Aires", "Mendoza"],
  },
];

const ARG_CITIES = [
  "Buenos Aires", "Córdoba", "Rosario", "Mendoza", "San Miguel de Tucumán",
  "Mar del Plata", "Salta", "Santa Fe", "San Juan", "Resistencia",
  "Neuquén", "Corrientes", "Posadas", "Bahía Blanca", "San Luis",
  "Bariloche", "La Plata", "Paraná", "Formosa", "La Rioja", "Ushuaia",
  "Río Gallegos", "Comodoro Rivadavia", "Puerto Madryn", "Iguazú",
];

function getRandPrice(base: number) {
  return base + Math.floor(Math.random() * base * 0.4);
}

function buildTrips(
  companies: typeof BUS_COMPANIES | typeof AIRLINE_COMPANIES,
  origin: string,
  dest: string,
  date: string,
  isBus: boolean
) {
  return companies.map((c) => {
    const basePrice = isBus ? 18000 + Math.random() * 30000 : 55000 + Math.random() * 120000;
    const discount = Math.random() > 0.5 ? Math.floor(10 + Math.random() * 25) : 0;
    const depH = 6 + Math.floor(Math.random() * 16);
    const durH = isBus ? 4 + Math.floor(Math.random() * 10) : 1 + Math.floor(Math.random() * 3);
    const durM = Math.floor(Math.random() * 59);
    const arrH = (depH + durH) % 24;
    const arrM = (Math.floor(Math.random() * 59) + durM) % 60;
    const fmt = (h: number, m: number) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const price = Math.round(basePrice / 100) * 100;
    const discountedPrice = discount > 0 ? Math.round(price * (1 - discount / 100) / 100) * 100 : price;

    return {
      id: `${c.id}-${Date.now()}-${Math.random()}`,
      company: c,
      origin: origin || "Buenos Aires",
      destination: dest || "Córdoba",
      date: date || new Date().toLocaleDateString("es-AR"),
      departure: fmt(depH, Math.floor(Math.random() * 59)),
      arrival: fmt(arrH, arrM),
      duration: `${durH}h ${durM}m`,
      price,
      discountedPrice,
      discount,
      seats: Math.floor(2 + Math.random() * 12),
    };
  });
}

// ─── SERVICE ICONS ──────────────────────────────────────────────────────────

const SERVICE_MAP = {
  wifi: { icon: Wifi, label: "WiFi" },
  food: { icon: Coffee, label: "Comida" },
  ac: { icon: Zap, label: "Aire Ac." },
  entertainment: { icon: Star, label: "Entretenimiento" },
};

// ─── TRIP CARD ──────────────────────────────────────────────────────────────

type BuiltTrip = ReturnType<typeof buildTrips>[number];

function TripCard({
  trip,
  isBus,
  onBook,
}: {
  trip: BuiltTrip;
  isBus: boolean;
  onBook: (trip: BuiltTrip) => void;
}) {
  const { company: c } = trip;
  return (
    <div
      className={`relative border rounded-xl overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5 ${c.bgLight} ${c.borderColor}`}
      data-testid={`card-trip-${c.id}`}
    >
      {trip.discount > 0 && (
        <div className="absolute top-0 right-0">
          <div className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded-bl-lg flex items-center gap-1">
            <Tag className="h-3 w-3" />
            -{trip.discount}% OFF
          </div>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-lg ${c.color} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
            {c.initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{c.name}</p>
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="text-xs text-muted-foreground">{c.rating} ({c.reviews.toLocaleString("es-AR")} reseñas)</span>
            </div>
          </div>
          {"type" in c && (
            <Badge variant={c.type === "low" ? "outline" : "secondary"} className="text-xs shrink-0">
              {c.type === "low" ? "Low Cost" : "Full Service"}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 mb-3">
          <div className="text-center flex-1">
            <p className="text-xl font-bold">{trip.departure}</p>
            <p className="text-xs text-muted-foreground truncate">{trip.origin}</p>
          </div>
          <div className="flex-1 flex flex-col items-center">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Clock className="h-3 w-3" />{trip.duration}
            </p>
            <div className="w-full relative flex items-center">
              <div className="h-px bg-border flex-1" />
              {isBus
                ? <Bus className="h-4 w-4 text-muted-foreground mx-1 shrink-0" />
                : <Plane className="h-4 w-4 text-muted-foreground mx-1 shrink-0 rotate-90" />}
              <div className="h-px bg-border flex-1" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{isBus ? "Directo" : "Sin escalas"}</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-xl font-bold">{trip.arrival}</p>
            <p className="text-xs text-muted-foreground truncate">{trip.destination}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          {(c.services as string[]).map((s) => {
            const svc = SERVICE_MAP[s as keyof typeof SERVICE_MAP];
            if (!svc) return null;
            return (
              <span key={s} className="flex items-center gap-1 text-xs text-muted-foreground bg-background/60 rounded-full px-2 py-0.5">
                <svc.icon className="h-3 w-3" />
                {svc.label}
              </span>
            );
          })}
          {trip.seats <= 5 && (
            <span className="flex items-center gap-1 text-xs text-destructive bg-destructive/10 rounded-full px-2 py-0.5">
              <Users className="h-3 w-3" />
              ¡Solo {trip.seats} lugares!
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div>
            {trip.discount > 0 && (
              <p className="text-xs text-muted-foreground line-through">
                ${trip.price.toLocaleString("es-AR")}
              </p>
            )}
            <p className={`text-xl font-bold ${c.textColor}`}>
              ${trip.discountedPrice.toLocaleString("es-AR")}
            </p>
            <p className="text-xs text-muted-foreground">por persona</p>
          </div>
          <Button
            size="sm"
            className={`${c.color} border-0 text-white hover:opacity-90`}
            onClick={() => onBook(trip)}
            data-testid={`button-book-${c.id}`}
          >
            Reservar
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── SEARCH BAR ─────────────────────────────────────────────────────────────

function SearchBar({
  origin, setOrigin, dest, setDest, date, setDate, onSwap, onSearch, loading
}: {
  origin: string; setOrigin: (v: string) => void;
  dest: string; setDest: (v: string) => void;
  date: string; setDate: (v: string) => void;
  onSwap: () => void; onSearch: () => void; loading: boolean;
}) {
  return (
    <div className="bg-card border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Select value={origin} onValueChange={setOrigin}>
            <SelectTrigger className="pl-9" data-testid="select-origin">
              <SelectValue placeholder="Origen..." />
            </SelectTrigger>
            <SelectContent className="max-h-56">
              {ARG_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="shrink-0 rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
          onClick={onSwap}
          data-testid="button-swap-cities"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </Button>
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
          <Select value={dest} onValueChange={setDest}>
            <SelectTrigger className="pl-9" data-testid="select-destination">
              <SelectValue placeholder="Destino..." />
            </SelectTrigger>
            <SelectContent className="max-h-56">
              {ARG_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            className="pl-9"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            data-testid="input-travel-date"
          />
        </div>
        <Button
          className="flex-1"
          onClick={onSearch}
          disabled={loading || !origin || !dest}
          data-testid="button-search-trips"
        >
          <Search className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Buscando..." : "Buscar"}
        </Button>
      </div>
    </div>
  );
}

// ─── BOOKING CONFIRMATION ────────────────────────────────────────────────────

function BookingConfirm({
  trip,
  isBus,
  onClose,
}: {
  trip: ReturnType<typeof buildTrips>[0] | null;
  isBus: boolean;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  if (!trip) return null;
  const c = trip.company;

  const handleConfirm = async () => {
    setStatus("loading");
    try {
      const endpoint = isBus ? "/api/transport/bookings" : "/api/flights/bookings";
      await apiRequest("POST", endpoint, {
        companyId: c.id,
        companyName: c.name,
        origin: trip.origin,
        destination: trip.destination,
        travelDate: trip.date,
        departureTime: trip.departure,
        arrivalTime: trip.arrival,
        duration: trip.duration,
        price: trip.discountedPrice,
        seats: 1,
      });
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={status === "idle" ? onClose : undefined}>
      <div
        className="bg-card border rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
        data-testid="booking-confirm-modal"
      >
        {status === "success" ? (
          <div className="text-center space-y-3 py-4">
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-bold">¡Reserva confirmada!</h3>
            <p className="text-muted-foreground text-sm">Tu viaje con {c.name} fue reservado exitosamente.</p>
            <p className="text-xs text-muted-foreground">{trip.origin} → {trip.destination} • {trip.date}</p>
            <Button className="w-full" onClick={onClose} data-testid="button-booking-done">Listo</Button>
          </div>
        ) : status === "error" ? (
          <div className="text-center space-y-3 py-4">
            <p className="text-destructive font-medium">No se pudo confirmar. Por favor iniciá sesión primero.</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStatus("idle")} data-testid="button-booking-retry">Volver</Button>
              <Button className="flex-1" onClick={onClose} data-testid="button-booking-close">Cerrar</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center">
              <div className={`w-16 h-16 rounded-full ${c.color} flex items-center justify-center mx-auto mb-3`}>
                <CheckCircle2 className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-bold">¡Casi listo!</h3>
              <p className="text-muted-foreground text-sm">Confirmá tu reserva con {c.name}</p>
            </div>

            <div className={`${c.bgLight} ${c.borderColor} border rounded-lg p-4 space-y-2`}>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ruta</span>
                <span className="font-medium">{trip.origin} → {trip.destination}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Salida</span>
                <span className="font-medium">{trip.departure} hs</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Duración</span>
                <span className="font-medium">{trip.duration}</span>
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="font-semibold">Total</span>
                <span className={`text-lg font-bold ${c.textColor}`}>
                  ${trip.discountedPrice.toLocaleString("es-AR")}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose} data-testid="button-booking-cancel">
                Volver
              </Button>
              <Button className="flex-1" onClick={handleConfirm} disabled={status === "loading"} data-testid="button-booking-confirm">
                {status === "loading" ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Reservando...</> : "Confirmar reserva"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── MAIN MODAL ─────────────────────────────────────────────────────────────

interface TravelModalProps {
  open: boolean;
  onClose: () => void;
  defaultTab?: "bus" | "flights";
}

export function TravelModal({ open, onClose, defaultTab = "bus" }: TravelModalProps) {
  const today = new Date().toISOString().split("T")[0];

  const [tab, setTab] = useState(defaultTab);
  const [origin, setOrigin] = useState("Buenos Aires");
  const [dest, setDest] = useState("Córdoba");
  const [date, setDate] = useState(today);
  const [busTrips, setBusTrips] = useState<ReturnType<typeof buildTrips>>([]);
  const [airTrips, setAirTrips] = useState<ReturnType<typeof buildTrips>>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [sortBy, setSortBy] = useState("price");
  const [maxPrice, setMaxPrice] = useState([300000]);
  const [bookingTrip, setBookingTrip] = useState<ReturnType<typeof buildTrips>[0] | null>(null);

  // Simulate search on open
  useEffect(() => {
    if (open && !searched) {
      handleSearch();
    }
  }, [open]);

  const handleSearch = async () => {
    if (!origin || !dest) return;
    setLoading(true);
    setSearched(false);
    try {
      const params = new URLSearchParams({ origin, dest, date });
      const [busRes, flightRes] = await Promise.all([
        fetch(`/api/transport/trips?${params}`).then((r) => r.json()),
        fetch(`/api/flights/search?${params}`).then((r) => r.json()),
      ]);
      setBusTrips(busRes.trips ?? []);
      setAirTrips(flightRes.flights ?? []);
      setSearched(true);
    } catch {
      setBusTrips(buildTrips(BUS_COMPANIES, origin, dest, date, true));
      setAirTrips(buildTrips(AIRLINE_COMPANIES, origin, dest, date, false));
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = () => {
    setOrigin(dest);
    setDest(origin);
  };

  const sortTrips = (trips: ReturnType<typeof buildTrips>) => {
    const filtered = trips.filter((t) => t.discountedPrice <= maxPrice[0]);
    return [...filtered].sort((a, b) => {
      if (sortBy === "price") return a.discountedPrice - b.discountedPrice;
      if (sortBy === "duration") return a.duration.localeCompare(b.duration);
      if (sortBy === "rating") return b.company.rating - a.company.rating;
      return 0;
    });
  };

  const currentTrips = tab === "bus" ? sortTrips(busTrips) : sortTrips(airTrips);

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                {tab === "bus"
                  ? <Bus className="h-4 w-4 text-white" />
                  : <Plane className="h-4 w-4 text-white" />}
              </div>
              Reservá tu viaje
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Tabs */}
              <Tabs value={tab} onValueChange={(v) => setTab(v as "bus" | "flights")}>
                <TabsList className="w-full grid grid-cols-2 h-12">
                  <TabsTrigger value="bus" className="flex items-center gap-2 text-sm" data-testid="tab-bus">
                    <Bus className="h-4 w-4" />
                    Micros y Colectivos
                  </TabsTrigger>
                  <TabsTrigger value="flights" className="flex items-center gap-2 text-sm" data-testid="tab-flights-travel">
                    <Plane className="h-4 w-4" />
                    Vuelos
                  </TabsTrigger>
                </TabsList>

                {/* Search bar (shared) */}
                <div className="mt-3">
                  <SearchBar
                    origin={origin}
                    setOrigin={setOrigin}
                    dest={dest}
                    setDest={setDest}
                    date={date}
                    setDate={setDate}
                    onSwap={handleSwap}
                    onSearch={handleSearch}
                    loading={loading}
                  />
                </div>

                {/* Filters */}
                {searched && !loading && (
                  <div className="flex items-center gap-3 mt-3 flex-wrap">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <SlidersHorizontal className="h-4 w-4" />
                      <span className="hidden sm:inline">Filtros:</span>
                    </div>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="h-8 w-36 text-xs" data-testid="select-sort">
                        <SelectValue placeholder="Ordenar por..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="price">Menor precio</SelectItem>
                        <SelectItem value="duration">Menor duración</SelectItem>
                        <SelectItem value="rating">Mejor calificación</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2 flex-1 min-w-48">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">Máx:</span>
                      <Slider
                        value={maxPrice}
                        onValueChange={setMaxPrice}
                        min={10000}
                        max={300000}
                        step={5000}
                        className="flex-1"
                        data-testid="slider-max-price"
                      />
                      <span className="text-xs font-medium whitespace-nowrap w-20 text-right">
                        ${maxPrice[0].toLocaleString("es-AR")}
                      </span>
                    </div>
                  </div>
                )}

                {/* Results */}
                <TabsContent value="bus" className="mt-3 space-y-0">
                  {loading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="border rounded-xl p-4 space-y-3 animate-pulse">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-muted" />
                            <div className="space-y-1 flex-1">
                              <div className="h-4 bg-muted rounded w-32" />
                              <div className="h-3 bg-muted rounded w-24" />
                            </div>
                          </div>
                          <div className="flex gap-4">
                            <div className="h-8 bg-muted rounded flex-1" />
                            <div className="h-8 bg-muted rounded flex-1" />
                            <div className="h-8 bg-muted rounded flex-1" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : searched && currentTrips.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground" data-testid="text-no-bus-trips">
                      <Bus className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>No hay micros disponibles con ese filtro de precio</p>
                    </div>
                  ) : searched ? (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        {currentTrips.length} resultado{currentTrips.length !== 1 ? "s" : ""} para {origin} → {dest}
                      </p>
                      {currentTrips.map((trip) => (
                        <TripCard
                          key={trip.id}
                          trip={trip}
                          isBus={true}
                          onBook={setBookingTrip}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Bus className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>Buscá tu viaje en micro</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="flights" className="mt-3 space-y-0">
                  {loading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="border rounded-xl p-4 space-y-3 animate-pulse">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-muted" />
                            <div className="space-y-1 flex-1">
                              <div className="h-4 bg-muted rounded w-40" />
                              <div className="h-3 bg-muted rounded w-24" />
                            </div>
                          </div>
                          <div className="flex gap-4">
                            <div className="h-8 bg-muted rounded flex-1" />
                            <div className="h-8 bg-muted rounded flex-1" />
                            <div className="h-8 bg-muted rounded flex-1" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : searched && tab === "flights" && currentTrips.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground" data-testid="text-no-flight-trips">
                      <Plane className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>No hay vuelos disponibles con ese filtro de precio</p>
                    </div>
                  ) : searched ? (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        {tab === "flights" ? currentTrips.length : sortTrips(airTrips).length} vuelo{currentTrips.length !== 1 ? "s" : ""} para {origin} → {dest}
                      </p>
                      {(tab === "flights" ? currentTrips : sortTrips(airTrips)).map((trip) => (
                        <TripCard
                          key={trip.id}
                          trip={trip}
                          isBus={false}
                          onBook={setBookingTrip}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Plane className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>Buscá tu vuelo</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BookingConfirm
        trip={bookingTrip}
        isBus={tab === "bus"}
        onClose={() => setBookingTrip(null)}
      />
    </>
  );
}
