import { useState, useEffect, useCallback } from "react";
import {
  Bus, Plane, Search, ArrowLeftRight, Calendar, MapPin, Clock,
  Star, ChevronRight, Tag, Wifi, Coffee, Zap, Users, ArrowLeft,
  Filter, SlidersHorizontal, CheckCircle2, Loader2, Ticket,
  CreditCard, ArrowRight, ChevronDown, ChevronUp, X,
} from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Separator } from "@/components/ui/separator";

// ─── CONSTANTS ──────────────────────────────────────────────────────────────

const ARG_CITIES = [
  "Buenos Aires", "Córdoba", "Rosario", "Mendoza", "San Miguel de Tucumán",
  "Mar del Plata", "Salta", "Santa Fe", "San Juan", "Resistencia",
  "Neuquén", "Corrientes", "Posadas", "Bahía Blanca", "San Luis",
  "Bariloche", "La Plata", "Paraná", "Formosa", "La Rioja", "Ushuaia",
  "Río Gallegos", "Comodoro Rivadavia", "Puerto Madryn", "Iguazú",
];

const SERVICE_ICONS: Record<string, { icon: any; label: string }> = {
  wifi: { icon: Wifi, label: "WiFi" },
  food: { icon: Coffee, label: "Comida" },
  ac: { icon: Zap, label: "Aire Ac." },
  entertainment: { icon: Star, label: "Entret." },
};

const SEAT_COLS_BUS = ["A", "B", "C", "D"];
const SEAT_COLS_PLANE = ["A", "B", "C", "D", "E", "F"];

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface TripResult {
  tripId: string;
  provider: {
    id: string; name: string; code: string; type: string;
    initials: string; colorClass: string; rating: number; reviewCount: number; services: string[];
  };
  origin: string; destination: string;
  departureAt: string; arrivalAt: string;
  durationMinutes: number; durationLabel: string;
  priceStandard: number; pricePremium: number | null;
  availableSeatsStandard: number; availableSeatsPremium: number;
  vehicleLayout: string; services: string[];
  discountPercent: number; date: string;
}

interface SeatInfo {
  seatCode: string; row: number; col: string;
  seatClass: "standard" | "premium";
  status: "available" | "occupied" | "reserved";
}

interface SeatMapResult {
  tripId: string; vehicleLayout: string;
  seats: SeatInfo[]; totalRows: number;
}

// ─── UTILS ───────────────────────────────────────────────────────────────────

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function fmtPrice(n: number) {
  return n.toLocaleString("es-AR");
}

// ─── SEAT MAP COMPONENT ───────────────────────────────────────────────────────

function SeatMap({
  seatMap, selectedSeats, seatClass, passengers,
  onToggleSeat,
}: {
  seatMap: SeatMapResult;
  selectedSeats: string[];
  seatClass: "standard" | "premium";
  passengers: number;
  onToggleSeat: (code: string, cls: "standard" | "premium") => void;
}) {
  const cols = seatMap.vehicleLayout === "plane_6col" ? SEAT_COLS_PLANE : SEAT_COLS_BUS;
  const rowCount = seatMap.totalRows;
  const aisleAfter = seatMap.vehicleLayout === "plane_6col" ? 2 : 1;

  const seatByCode = new Map(seatMap.seats.map((s) => [s.seatCode, s]));

  return (
    <div className="overflow-auto max-h-72">
      <div className="inline-block min-w-full">
        <div className="flex gap-1 mb-2 justify-center sticky top-0 bg-background z-10 pb-1">
          {cols.map((c, i) => (
            <div key={c} className="flex items-center">
              <div className="w-8 text-center text-xs font-medium text-muted-foreground">{c}</div>
              {i === aisleAfter && <div className="w-3" />}
            </div>
          ))}
        </div>
        {Array.from({ length: rowCount }, (_, i) => i + 1).map((row) => (
          <div key={row} className="flex gap-1 mb-1 items-center">
            <div className="w-5 text-right text-xs text-muted-foreground mr-1">{row}</div>
            {cols.map((col, ci) => {
              const code = `${row}${col}`;
              const seat = seatByCode.get(code);
              if (!seat) return <div key={col} className="w-8 h-7" />;

              const isSelected = selectedSeats.includes(code);
              const isOccupied = seat.status === "occupied" || seat.status === "reserved";
              const wrongClass = seat.seatClass !== seatClass;
              const isDisabled = isOccupied || wrongClass;
              const canSelect = !isDisabled && (isSelected || selectedSeats.length < passengers);

              return (
                <div key={col} className="flex items-center">
                  <button
                    className={`
                      w-8 h-7 rounded text-xs font-medium transition-all border
                      ${isOccupied ? "bg-muted text-muted-foreground border-muted cursor-not-allowed opacity-50" :
                        wrongClass ? "bg-muted/40 border-dashed border-muted-foreground/30 cursor-not-allowed opacity-40" :
                        isSelected ? "bg-primary text-primary-foreground border-primary scale-105 shadow-sm" :
                        canSelect ? "bg-emerald-100 dark:bg-emerald-900/40 border-emerald-400 dark:border-emerald-600 hover:bg-emerald-200 cursor-pointer" :
                        "bg-muted/30 border-muted cursor-not-allowed"
                      }
                    `}
                    onClick={() => !isDisabled && canSelect && onToggleSeat(code, seat.seatClass)}
                    disabled={isDisabled || (!canSelect && !isSelected)}
                    title={isOccupied ? "Ocupado" : wrongClass ? `Solo ${seat.seatClass}` : code}
                  >
                    {isOccupied ? "×" : isSelected ? "✓" : code}
                  </button>
                  {ci === aisleAfter && <div className="w-3" />}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex gap-4 mt-3 text-xs text-muted-foreground justify-center">
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-400 inline-block" />Disponible</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-primary inline-block" />Seleccionado</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-muted opacity-50 inline-block" />Ocupado</span>
      </div>
    </div>
  );
}

// ─── TRIP CARD ────────────────────────────────────────────────────────────────

function TripCard({
  trip, seatClass, passengers, onSelect,
}: {
  trip: TripResult; seatClass: "standard" | "premium"; passengers: number;
  onSelect: () => void;
}) {
  const p = trip.provider;
  const price = seatClass === "premium" && trip.pricePremium ? trip.pricePremium : trip.priceStandard;
  const originalPrice = trip.discountPercent > 0 ? Math.round(price / (1 - trip.discountPercent / 100)) : null;
  const totalPrice = price * passengers;
  const available = seatClass === "premium" ? trip.availableSeatsPremium : trip.availableSeatsStandard;

  return (
    <div
      className="border rounded-xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all bg-card cursor-pointer group"
      onClick={onSelect}
      data-testid={`card-trip-${p.id}`}
    >
      {trip.discountPercent > 0 && (
        <div className="bg-destructive text-destructive-foreground text-xs font-bold px-3 py-1 flex items-center gap-1">
          <Tag className="h-3 w-3" />
          ¡{trip.discountPercent}% OFF!
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-11 h-11 rounded-xl ${p.colorClass} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
            {p.initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{p.name}</p>
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="text-xs text-muted-foreground">{p.rating} · {p.reviewCount.toLocaleString("es-AR")} reseñas</span>
            </div>
          </div>
          {p.type === "airline" && (
            <Badge variant="outline" className="text-xs shrink-0">
              {["flybondi", "jetsmart"].includes(p.id) ? "Low Cost" : "Full Service"}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 mb-3">
          <div className="text-center flex-1">
            <p className="text-xl font-bold">{fmt(trip.departureAt)}</p>
            <p className="text-xs text-muted-foreground truncate">{trip.origin}</p>
          </div>
          <div className="flex-1 flex flex-col items-center">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Clock className="h-3 w-3" />{trip.durationLabel}
            </p>
            <div className="w-full flex items-center">
              <div className="h-px bg-border flex-1" />
              {p.type === "bus"
                ? <Bus className="h-4 w-4 text-muted-foreground mx-1 shrink-0" />
                : <Plane className="h-4 w-4 text-muted-foreground mx-1 shrink-0 rotate-90" />}
              <div className="h-px bg-border flex-1" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{p.type === "bus" ? "Directo" : "Sin escalas"}</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-xl font-bold">{fmt(trip.arrivalAt)}</p>
            <p className="text-xs text-muted-foreground truncate">{trip.destination}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          {(trip.services as string[]).map((s) => {
            const svc = SERVICE_ICONS[s];
            if (!svc) return null;
            return (
              <span key={s} className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5">
                <svc.icon className="h-3 w-3" />{svc.label}
              </span>
            );
          })}
          {available <= 5 && available > 0 && (
            <span className="flex items-center gap-1 text-xs text-destructive bg-destructive/10 rounded-full px-2 py-0.5">
              <Users className="h-3 w-3" />¡Solo {available} lugares!
            </span>
          )}
          {available === 0 && (
            <span className="flex items-center gap-1 text-xs text-destructive bg-destructive/10 rounded-full px-2 py-0.5">
              Sin disponibilidad
            </span>
          )}
        </div>

        <div className="flex items-end justify-between">
          <div>
            {originalPrice && (
              <p className="text-xs text-muted-foreground line-through">${fmtPrice(originalPrice)}</p>
            )}
            <p className="text-2xl font-bold text-primary">${fmtPrice(price)}</p>
            <p className="text-xs text-muted-foreground">por persona</p>
            {passengers > 1 && (
              <p className="text-sm font-semibold text-foreground">Total: ${fmtPrice(totalPrice)}</p>
            )}
          </div>
          <Button
            size="sm"
            className="group-hover:translate-x-0.5 transition-transform"
            disabled={available === 0}
          >
            Elegir asiento
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── BOOKING FLOW ─────────────────────────────────────────────────────────────

type BookingStep = "seats" | "passenger" | "confirm" | "success";

function BookingFlow({
  trip, seatClass, passengers, onClose,
  onConfirmed,
}: {
  trip: TripResult; seatClass: "standard" | "premium"; passengers: number;
  onClose: () => void; onConfirmed: () => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [step, setStep] = useState<BookingStep>("seats");
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [passengerNames, setPassengerNames] = useState(user?.username ?? "");
  const [bookingResult, setBookingResult] = useState<any>(null);

  const { data: seatMap, isLoading: seatLoading } = useQuery<SeatMapResult>({
    queryKey: ["/api/travel/trips", trip.tripId, "seats"],
    queryFn: () => fetch(`/api/travel/trips/${encodeURIComponent(trip.tripId)}/seats`).then((r) => r.json()),
  });

  const bookMutation = useMutation({
    mutationFn: async () => {
      const price = seatClass === "premium" && trip.pricePremium ? trip.pricePremium : trip.priceStandard;
      const totalAmount = price * passengers;
      const res = await apiRequest("POST", "/api/travel/bookings", {
        tripId: trip.tripId,
        seatCodes: selectedSeats,
        seatClass,
        passengers,
        passengerNames,
        totalAmount,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setBookingResult(data);
      setStep("success");
      qc.invalidateQueries({ queryKey: ["/api/travel/my-bookings"] });
      onConfirmed();
    },
  });

  const handleToggleSeat = (code: string, _cls: "standard" | "premium") => {
    setSelectedSeats((prev) => {
      if (prev.includes(code)) return prev.filter((s) => s !== code);
      if (prev.length >= passengers) return prev;
      return [...prev, code];
    });
  };

  const price = seatClass === "premium" && trip.pricePremium ? trip.pricePremium : trip.priceStandard;
  const totalAmount = price * passengers;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={step === "success" ? undefined : onClose}>
      <div
        className="bg-card border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        data-testid="booking-flow-modal"
      >
        {/* Header */}
        <div className="sticky top-0 bg-card border-b z-10 p-4 flex items-center justify-between">
          <div>
            <p className="font-bold text-sm">{trip.provider.name}</p>
            <p className="text-xs text-muted-foreground">{trip.origin} → {trip.destination} · {fmt(trip.departureAt)}</p>
          </div>
          {step !== "success" && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="p-4 space-y-4">
          {/* Step: Seats */}
          {step === "seats" && (
            <>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">Seleccionar asientos ({selectedSeats.length}/{passengers})</p>
                <Badge variant={seatClass === "premium" ? "default" : "secondary"} className="text-xs">
                  {seatClass === "premium" ? "Premium" : "Estándar"}
                </Badge>
              </div>

              {seatLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : seatMap ? (
                <SeatMap
                  seatMap={seatMap}
                  selectedSeats={selectedSeats}
                  seatClass={seatClass}
                  passengers={passengers}
                  onToggleSeat={handleToggleSeat}
                />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Error cargando mapa de asientos</p>
              )}

              <Button
                className="w-full"
                disabled={selectedSeats.length === 0 || (passengers > 1 && selectedSeats.length < passengers)}
                onClick={() => setStep("passenger")}
                data-testid="button-seats-next"
              >
                Continuar ({selectedSeats.length} asiento{selectedSeats.length !== 1 ? "s" : ""})
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
              {passengers > 1 && selectedSeats.length < passengers && (
                <p className="text-xs text-muted-foreground text-center">
                  Seleccioná {passengers - selectedSeats.length} asiento{passengers - selectedSeats.length !== 1 ? "s" : ""} más
                </p>
              )}
            </>
          )}

          {/* Step: Passenger */}
          {step === "passenger" && (
            <>
              <div>
                <p className="font-semibold mb-1 text-sm">Datos del pasajero</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Asientos: {selectedSeats.join(", ")} · Clase {seatClass}
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">
                    Nombre completo del pasajero{passengers > 1 ? "(s)" : ""}
                  </label>
                  <Input
                    placeholder="Nombre y apellido"
                    value={passengerNames}
                    onChange={(e) => setPassengerNames(e.target.value)}
                    data-testid="input-passenger-name"
                  />
                </div>
              </div>

              <div className="bg-muted/40 rounded-lg p-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Precio por persona</span>
                  <span>${fmtPrice(price)}</span>
                </div>
                {passengers > 1 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pasajeros</span>
                    <span>× {passengers}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-primary text-base">${fmtPrice(totalAmount)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep("seats")}>
                  <ArrowLeft className="h-4 w-4 mr-1" />Volver
                </Button>
                <Button className="flex-1" onClick={() => setStep("confirm")} disabled={!passengerNames.trim()} data-testid="button-passenger-next">
                  Revisar reserva
                </Button>
              </div>
            </>
          )}

          {/* Step: Confirm */}
          {step === "confirm" && (
            <>
              <p className="font-semibold text-sm">Resumen de tu viaje</p>

              <div className="space-y-3">
                <div className="border rounded-lg p-3 space-y-2 text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    {trip.provider.type === "bus" ? <Bus className="h-4 w-4" /> : <Plane className="h-4 w-4" />}
                    {trip.provider.name}
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Ruta</span>
                    <span className="font-medium text-foreground">{trip.origin} → {trip.destination}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Salida</span>
                    <span className="font-medium text-foreground">{fmt(trip.departureAt)} hs</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Llegada</span>
                    <span className="font-medium text-foreground">{fmt(trip.arrivalAt)} hs</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Asientos</span>
                    <span className="font-medium text-foreground">{selectedSeats.join(", ")}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Clase</span>
                    <span className="font-medium text-foreground capitalize">{seatClass}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Pasajero</span>
                    <span className="font-medium text-foreground">{passengerNames}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-base">
                    <span>Total a pagar</span>
                    <span className="text-primary">${fmtPrice(totalAmount)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-2.5">
                  <CreditCard className="h-3.5 w-3.5 shrink-0" />
                  <span>El pago se acredita a la empresa. LibreMercado cobra una comisión de 5%.</span>
                </div>
              </div>

              {bookMutation.isError && (
                <p className="text-destructive text-sm text-center">
                  {(bookMutation.error as any)?.message ?? "Error al confirmar. Intentá de nuevo."}
                </p>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep("passenger")}>
                  <ArrowLeft className="h-4 w-4 mr-1" />Volver
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => bookMutation.mutate()}
                  disabled={bookMutation.isPending}
                  data-testid="button-confirm-booking"
                >
                  {bookMutation.isPending
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Reservando...</>
                    : <><Ticket className="h-4 w-4 mr-2" />Confirmar y pagar</>}
                </Button>
              </div>
            </>
          )}

          {/* Step: Success */}
          {step === "success" && bookingResult && (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">¡Reserva confirmada!</h3>
                <p className="text-muted-foreground text-sm">Tu pasaje fue emitido con éxito.</p>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-left space-y-2 text-sm">
                <div className="flex items-center gap-2 font-bold text-primary">
                  <Ticket className="h-4 w-4" />
                  {bookingResult.ticketCode}
                </div>
                <Separator />
                <div className="flex justify-between text-muted-foreground">
                  <span>Ruta</span>
                  <span className="font-medium text-foreground">{bookingResult.origin} → {bookingResult.destination}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Asientos</span>
                  <span className="font-medium text-foreground">{bookingResult.seatNumbers || selectedSeats.join(", ")}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Total</span>
                  <span className="font-bold text-foreground">${fmtPrice(bookingResult.totalAmount)}</span>
                </div>
              </div>

              <Button className="w-full" onClick={onClose} data-testid="button-booking-done">
                Listo
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MY BOOKINGS ──────────────────────────────────────────────────────────────

function MyBookings() {
  const { data: bookings, isLoading } = useQuery<any[]>({
    queryKey: ["/api/travel/my-bookings"],
    queryFn: () => fetch("/api/travel/my-bookings").then((r) => r.json()),
  });

  if (isLoading) {
    return (
      <div className="grid gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!bookings || bookings.length === 0) {
    return (
      <div className="text-center py-12">
        <Ticket className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground text-sm">No tenés viajes reservados todavía</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bookings.map((b) => (
        <div key={b.id} className="border rounded-xl p-4 bg-card" data-testid={`booking-item-${b.id}`}>
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="font-semibold text-sm">{b.companyName}</p>
              <p className="text-xs text-muted-foreground">{b.origin} → {b.destination}</p>
            </div>
            <Badge
              variant={b.status === "confirmed" ? "default" : b.status === "cancelled" ? "destructive" : "secondary"}
              className="text-xs shrink-0"
            >
              {b.status === "confirmed" ? "Confirmado" : b.status === "cancelled" ? "Cancelado" : "Pendiente"}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />{b.travelDate} · {b.departureTime}
            </span>
            <div className="text-right">
              {b.ticketCode && <p className="font-mono text-xs text-primary">{b.ticketCode}</p>}
              <p className="font-bold text-foreground text-sm">${fmtPrice(parseFloat(b.price))}</p>
            </div>
          </div>
          {b.seatNumbers && (
            <p className="text-xs text-muted-foreground mt-1">Asientos: {b.seatNumbers}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function Travel() {
  const [tab, setTab] = useState<"search" | "bookings">("search");

  // Search state
  const [origin, setOrigin] = useState("Buenos Aires");
  const [dest, setDest] = useState("Córdoba");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [passengers, setPassengers] = useState(1);
  const [tripType, setTripType] = useState<"all" | "bus" | "airline">("all");
  const [seatClass, setSeatClass] = useState<"standard" | "premium">("standard");
  const [searched, setSearched] = useState(false);

  // Filter state
  const [sortBy, setSortBy] = useState<"price" | "duration" | "rating">("price");
  const [maxPrice, setMaxPrice] = useState([500000]);
  const [showFilters, setShowFilters] = useState(false);

  // Booking state
  const [selectedTrip, setSelectedTrip] = useState<TripResult | null>(null);

  const { user } = useAuth();

  const searchQuery = useQuery<{ trips: TripResult[] }>({
    queryKey: ["/api/travel/search", origin, dest, date, passengers, tripType, seatClass],
    queryFn: () => {
      const p = new URLSearchParams({
        origin, destination: dest, date,
        passengers: String(passengers),
        ...(tripType !== "all" ? { type: tripType } : {}),
        seatClass,
      });
      return fetch(`/api/travel/search?${p}`).then((r) => r.json());
    },
    enabled: searched,
  });

  const trips = searchQuery.data?.trips ?? [];

  const filteredTrips = trips
    .filter((t) => {
      const price = seatClass === "premium" ? (t.pricePremium ?? t.priceStandard) : t.priceStandard;
      return price <= maxPrice[0];
    })
    .sort((a, b) => {
      const aP = seatClass === "premium" ? (a.pricePremium ?? a.priceStandard) : a.priceStandard;
      const bP = seatClass === "premium" ? (b.pricePremium ?? b.priceStandard) : b.priceStandard;
      if (sortBy === "price") return aP - bP;
      if (sortBy === "duration") return a.durationMinutes - b.durationMinutes;
      if (sortBy === "rating") return b.provider.rating - a.provider.rating;
      return 0;
    });

  const busTrips = filteredTrips.filter((t) => t.provider.type === "bus");
  const flightTrips = filteredTrips.filter((t) => t.provider.type === "airline");

  const handleSearch = () => {
    if (!origin || !dest || origin === dest) return;
    setSearched(true);
    searchQuery.refetch();
  };

  const handleSwap = () => {
    setOrigin(dest);
    setDest(origin);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400 text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" data-testid="button-back-home">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">PachaPay Viajes</h1>
              <p className="text-blue-100 text-sm">Micros, vuelos y más — con asiento elegido</p>
            </div>
          </div>

          {/* Search Form */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 space-y-3">
            {/* Type + Class */}
            <div className="flex gap-2 flex-wrap">
              {(["all", "bus", "airline"] as const).map((t) => (
                <button
                  key={t}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all
                    ${tripType === t ? "bg-white text-blue-600" : "bg-white/20 text-white hover:bg-white/30"}`}
                  onClick={() => setTripType(t)}
                >
                  {t === "bus" ? <Bus className="h-3.5 w-3.5" /> : t === "airline" ? <Plane className="h-3.5 w-3.5" /> : null}
                  {t === "all" ? "Todos" : t === "bus" ? "Micros" : "Vuelos"}
                </button>
              ))}
              <div className="ml-auto flex gap-2">
                {(["standard", "premium"] as const).map((c) => (
                  <button
                    key={c}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all
                      ${seatClass === c ? "bg-white text-blue-600" : "bg-white/20 text-white hover:bg-white/30"}`}
                    onClick={() => setSeatClass(c)}
                  >
                    {c === "standard" ? "Estándar" : "Premium"}
                  </button>
                ))}
              </div>
            </div>

            {/* Origin / Destination */}
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
                <Select value={origin} onValueChange={setOrigin}>
                  <SelectTrigger className="pl-9 bg-white/10 border-white/30 text-white placeholder:text-white/50" data-testid="select-origin">
                    <SelectValue placeholder="Origen..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {ARG_CITIES.filter((c) => c !== dest).map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="ghost" size="icon"
                className="shrink-0 rounded-full bg-white/20 text-white hover:bg-white/30"
                onClick={handleSwap}
                data-testid="button-swap-cities"
              >
                <ArrowLeftRight className="h-4 w-4" />
              </Button>
              <div className="flex-1 relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-200" />
                <Select value={dest} onValueChange={setDest}>
                  <SelectTrigger className="pl-9 bg-white/10 border-white/30 text-white" data-testid="select-destination">
                    <SelectValue placeholder="Destino..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {ARG_CITIES.filter((c) => c !== origin).map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date + Passengers */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
                <Input
                  type="date"
                  className="pl-9 bg-white/10 border-white/30 text-white"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  data-testid="input-travel-date"
                />
              </div>
              <div className="relative w-28">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
                <Select value={String(passengers)} onValueChange={(v) => setPassengers(parseInt(v))}>
                  <SelectTrigger className="pl-9 bg-white/10 border-white/30 text-white" data-testid="select-passengers">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} {n === 1 ? "pasajero" : "pasajeros"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="bg-white text-blue-600 hover:bg-blue-50 font-bold px-6 shrink-0"
                onClick={handleSearch}
                disabled={!origin || !dest || origin === dest || searchQuery.isFetching}
                data-testid="button-search-trips"
              >
                {searchQuery.isFetching
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <><Search className="h-4 w-4 mr-1.5" />Buscar</>}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="search" className="flex-1" data-testid="tab-search">
              <Search className="h-4 w-4 mr-1.5" />Buscar viajes
            </TabsTrigger>
            <TabsTrigger value="bookings" className="flex-1" data-testid="tab-bookings">
              <Ticket className="h-4 w-4 mr-1.5" />Mis reservas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search">
            {!searched ? (
              <div className="text-center py-16">
                <div className="flex justify-center gap-4 mb-6">
                  <Bus className="h-10 w-10 text-blue-400" />
                  <Plane className="h-10 w-10 text-cyan-400" />
                </div>
                <h2 className="text-lg font-semibold mb-2">Buscá tu próximo viaje</h2>
                <p className="text-muted-foreground text-sm">Elegí origen, destino y fecha para ver disponibilidad</p>
              </div>
            ) : searchQuery.isFetching ? (
              <div className="grid gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : filteredTrips.length === 0 ? (
              <div className="text-center py-16">
                <Bus className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm">No hay viajes disponibles para esa ruta.</p>
                <p className="text-muted-foreground text-xs mt-1">Probá con otra fecha o ruta.</p>
              </div>
            ) : (
              <>
                {/* Filter bar */}
                <div className="flex items-center justify-between mb-3 gap-2">
                  <p className="text-sm text-muted-foreground">
                    {filteredTrips.length} resultado{filteredTrips.length !== 1 ? "s" : ""}
                    {origin && dest && <> · <strong>{origin} → {dest}</strong></>}
                  </p>
                  <div className="flex gap-2">
                    <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                      <SelectTrigger className="h-8 text-xs w-36">
                        <SlidersHorizontal className="h-3 w-3 mr-1" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="price">Menor precio</SelectItem>
                        <SelectItem value="duration">Menor duración</SelectItem>
                        <SelectItem value="rating">Mejor calificación</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline" size="sm" className="h-8 text-xs"
                      onClick={() => setShowFilters((v) => !v)}
                    >
                      <Filter className="h-3 w-3 mr-1" />Filtros
                      {showFilters ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                    </Button>
                  </div>
                </div>

                {showFilters && (
                  <div className="border rounded-xl p-4 mb-3 bg-card space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-2">
                        Precio máximo: ${fmtPrice(maxPrice[0])}
                      </label>
                      <Slider
                        value={maxPrice}
                        onValueChange={setMaxPrice}
                        min={0} max={500000} step={5000}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}

                {/* Tabs for bus / flights when showing all */}
                {tripType === "all" ? (
                  <Tabs defaultValue="bus">
                    <TabsList className="mb-3">
                      <TabsTrigger value="bus">
                        <Bus className="h-3.5 w-3.5 mr-1.5" />Micros ({busTrips.length})
                      </TabsTrigger>
                      <TabsTrigger value="airline">
                        <Plane className="h-3.5 w-3.5 mr-1.5" />Vuelos ({flightTrips.length})
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="bus">
                      <div className="grid gap-3">
                        {busTrips.map((t) => (
                          <TripCard key={t.tripId} trip={t} seatClass={seatClass} passengers={passengers}
                            onSelect={() => {
                              if (!user) return;
                              setSelectedTrip(t);
                            }}
                          />
                        ))}
                        {busTrips.length === 0 && <p className="text-muted-foreground text-sm text-center py-6">No hay micros disponibles</p>}
                      </div>
                    </TabsContent>
                    <TabsContent value="airline">
                      <div className="grid gap-3">
                        {flightTrips.map((t) => (
                          <TripCard key={t.tripId} trip={t} seatClass={seatClass} passengers={passengers}
                            onSelect={() => {
                              if (!user) return;
                              setSelectedTrip(t);
                            }}
                          />
                        ))}
                        {flightTrips.length === 0 && <p className="text-muted-foreground text-sm text-center py-6">No hay vuelos disponibles</p>}
                      </div>
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="grid gap-3">
                    {filteredTrips.map((t) => (
                      <TripCard key={t.tripId} trip={t} seatClass={seatClass} passengers={passengers}
                        onSelect={() => {
                          if (!user) return;
                          setSelectedTrip(t);
                        }}
                      />
                    ))}
                  </div>
                )}

                {!user && searched && filteredTrips.length > 0 && (
                  <div className="border border-dashed rounded-xl p-4 text-center mt-3 bg-card">
                    <p className="text-sm text-muted-foreground mb-2">Iniciá sesión para reservar tu pasaje</p>
                    <Link href="/auth">
                      <Button size="sm" variant="outline">Iniciar sesión</Button>
                    </Link>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="bookings">
            {!user ? (
              <div className="text-center py-12">
                <Ticket className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm mb-3">Iniciá sesión para ver tus reservas</p>
                <Link href="/auth">
                  <Button variant="outline" size="sm">Iniciar sesión</Button>
                </Link>
              </div>
            ) : (
              <MyBookings />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Booking Flow Modal */}
      {selectedTrip && user && (
        <BookingFlow
          trip={selectedTrip}
          seatClass={seatClass}
          passengers={passengers}
          onClose={() => setSelectedTrip(null)}
          onConfirmed={() => {
            setSelectedTrip(null);
            setTab("bookings");
          }}
        />
      )}
    </div>
  );
}
