import type {
  ITravelProvider,
  TravelSearchParams,
  TripResult,
  SeatMapResult,
  SeatInfo,
  TravelProviderInfo,
  VehicleLayout,
} from "../TravelProvider.js";

// ─── Static Argentine transport data ────────────────────────────────────────

const BUS_PROVIDERS: TravelProviderInfo[] = [
  { id: "flechabus", name: "Flecha Bus", code: "FB", type: "bus", initials: "FB", colorClass: "bg-yellow-500", rating: 4.6, reviewCount: 2341, services: ["wifi", "ac", "food"], commissionRate: 0.05 },
  { id: "chevallier", name: "Chevallier", code: "CH", type: "bus", initials: "CH", colorClass: "bg-blue-600", rating: 4.4, reviewCount: 1876, services: ["wifi", "ac"], commissionRate: 0.05 },
  { id: "andesmar", name: "Andesmar", code: "AM", type: "bus", initials: "AM", colorClass: "bg-purple-600", rating: 4.3, reviewCount: 1540, services: ["wifi", "ac", "food"], commissionRate: 0.05 },
  { id: "elrapido", name: "El Rápido Argentino", code: "RA", type: "bus", initials: "RA", colorClass: "bg-green-600", rating: 4.5, reviewCount: 2102, services: ["wifi", "ac"], commissionRate: 0.05 },
  { id: "plusmar", name: "Plusmar", code: "PM", type: "bus", initials: "PM", colorClass: "bg-red-500", rating: 4.2, reviewCount: 987, services: ["ac", "food"], commissionRate: 0.05 },
  { id: "cotap", name: "COTAP", code: "CT", type: "bus", initials: "CT", colorClass: "bg-orange-500", rating: 4.1, reviewCount: 654, services: ["ac"], commissionRate: 0.05 },
];

const AIRLINE_PROVIDERS: TravelProviderInfo[] = [
  { id: "aerolineas", name: "Aerolíneas Argentinas", code: "AR", type: "airline", initials: "AR", colorClass: "bg-sky-600", rating: 4.3, reviewCount: 5821, services: ["wifi", "food", "entertainment"], commissionRate: 0.04 },
  { id: "latam", name: "LATAM Airlines", code: "LA", type: "airline", initials: "LA", colorClass: "bg-red-600", rating: 4.4, reviewCount: 4312, services: ["wifi", "food"], commissionRate: 0.04 },
  { id: "flybondi", name: "Flybondi", code: "FO", type: "airline", initials: "FO", colorClass: "bg-amber-500", rating: 3.9, reviewCount: 2876, services: ["entertainment"], commissionRate: 0.04 },
  { id: "jetsmart", name: "JetSmart", code: "JA", type: "airline", initials: "JA", colorClass: "bg-orange-500", rating: 3.8, reviewCount: 1923, services: [], commissionRate: 0.04 },
  { id: "andes", name: "Andes Líneas Aéreas", code: "AN", type: "airline", initials: "AN", colorClass: "bg-indigo-600", rating: 4.0, reviewCount: 1102, services: ["food"], commissionRate: 0.04 },
];

// In-memory seat inventory per trip (mock state)
const seatInventory = new Map<string, Map<string, "available" | "occupied" | "reserved">>();

function seededRng(seed: number) {
  let s = seed;
  return (n: number): number => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s % n;
  };
}

function buildTripId(providerId: string, origin: string, dest: string, date: string, hour: number): string {
  return `${providerId}:${origin.replace(/\s/g, "_")}:${dest.replace(/\s/g, "_")}:${date}:${String(hour).padStart(2, "0")}`;
}

function minutesToLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function buildTrips(
  providers: TravelProviderInfo[],
  origin: string,
  dest: string,
  date: string,
  seed: number
): TripResult[] {
  const rng = seededRng(seed);
  const isBus = providers[0]?.type === "bus";

  return providers.map((p) => {
    const basePrice = isBus ? 18000 + rng(32000) : 55000 + rng(120000);
    const premiumMultiplier = isBus ? 1.6 : 1.4;
    const discount = rng(10) > 5 ? 10 + rng(25) : 0;
    const depH = 6 + rng(16);
    const depM = rng(4) * 15;
    const durH = isBus ? 4 + rng(10) : 1 + rng(3);
    const durM = rng(4) * 15;
    const durationMinutes = durH * 60 + durM;

    const depDate = new Date(`${date}T${String(depH).padStart(2, "0")}:${String(depM).padStart(2, "0")}:00`);
    const arrDate = new Date(depDate.getTime() + durationMinutes * 60_000);

    const priceStd = Math.round(basePrice * (1 - discount / 100) / 100) * 100;
    const pricePremium = Math.round(priceStd * premiumMultiplier / 100) * 100;

    const availableSeatsStd = 3 + rng(30);
    const availableSeatsPremium = rng(8);

    const layout: VehicleLayout = isBus ? "bus_4col" : "plane_6col";

    return {
      tripId: buildTripId(p.id, origin, dest, date, depH),
      provider: p,
      origin,
      destination: dest,
      departureAt: depDate.toISOString(),
      arrivalAt: arrDate.toISOString(),
      durationMinutes,
      durationLabel: minutesToLabel(durationMinutes),
      priceStandard: priceStd,
      pricePremium,
      availableSeatsStandard: availableSeatsStd,
      availableSeatsPremium,
      vehicleLayout: layout,
      services: p.services,
      discountPercent: discount,
      date,
    };
  });
}

function buildSeatMap(tripId: string, layout: VehicleLayout, seed: number): SeatMapResult {
  const rng = seededRng(seed);
  const seats: SeatInfo[] = [];
  const existing = seatInventory.get(tripId);

  if (layout === "bus_4col") {
    const rows = 12;
    const cols = ["A", "B", "C", "D"];
    for (let row = 1; row <= rows; row++) {
      for (const col of cols) {
        const code = `${row}${col}`;
        const isAisle = col === "B" || col === "C";
        const isPremium = row <= 3;
        const occupiedChance = rng(10);
        const naturalStatus: "available" | "occupied" =
          occupiedChance < 4 ? "occupied" : "available";
        const status = existing?.get(code) ?? naturalStatus;
        seats.push({
          seatCode: code,
          row,
          col,
          seatClass: isPremium ? "premium" : "standard",
          status,
        });
      }
    }
  } else if (layout === "plane_6col") {
    const rows = 20;
    const cols = ["A", "B", "C", "D", "E", "F"];
    for (let row = 1; row <= rows; row++) {
      for (const col of cols) {
        const code = `${row}${col}`;
        const isPremium = row <= 4;
        const occupiedChance = rng(10);
        const naturalStatus: "available" | "occupied" =
          occupiedChance < 5 ? "occupied" : "available";
        const status = existing?.get(code) ?? naturalStatus;
        seats.push({
          seatCode: code,
          row,
          col,
          seatClass: isPremium ? "premium" : "standard",
          status,
        });
      }
    }
  }

  return {
    tripId,
    vehicleLayout: layout,
    seats,
    totalRows: layout === "bus_4col" ? 12 : 20,
  };
}

export class MockTravelProvider implements ITravelProvider {
  async searchTrips(params: TravelSearchParams): Promise<TripResult[]> {
    const { origin, destination, date, type } = params;
    const seed = origin.charCodeAt(0) * destination.charCodeAt(0) +
      date.split("-").reduce((a, b) => a + Number(b), 0);

    const busResults = type === "airline" ? [] : buildTrips(BUS_PROVIDERS, origin, destination, date, seed);
    const flightResults = type === "bus" ? [] : buildTrips(AIRLINE_PROVIDERS, origin, destination, date, seed * 7);

    return [...busResults, ...flightResults];
  }

  async getTripById(tripId: string): Promise<TripResult | null> {
    const parts = tripId.split(":");
    if (parts.length < 5) return null;
    const [providerId, originRaw, destRaw, date, hourStr] = parts;
    const origin = originRaw.replace(/_/g, " ");
    const dest = destRaw.replace(/_/g, " ");
    const hour = parseInt(hourStr, 10);

    const allProviders = [...BUS_PROVIDERS, ...AIRLINE_PROVIDERS];
    const provider = allProviders.find((p) => p.id === providerId);
    if (!provider) return null;

    const seed = origin.charCodeAt(0) * dest.charCodeAt(0) +
      date.split("-").reduce((a, b) => a + Number(b), 0);
    const providers = provider.type === "bus" ? BUS_PROVIDERS : AIRLINE_PROVIDERS;
    const trips = buildTrips(providers, origin, dest, date, seed);
    return trips.find((t) => t.tripId === tripId) ?? null;
  }

  async getSeatMap(tripId: string): Promise<SeatMapResult> {
    const trip = await this.getTripById(tripId);
    const layout: VehicleLayout = trip?.vehicleLayout ?? "bus_4col";
    const seed = tripId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    return buildSeatMap(tripId, layout, seed);
  }

  async reserveSeats(tripId: string, seatCodes: string[]): Promise<boolean> {
    if (!seatInventory.has(tripId)) seatInventory.set(tripId, new Map());
    const inv = seatInventory.get(tripId)!;
    for (const code of seatCodes) {
      if (inv.get(code) === "occupied") return false;
      inv.set(code, "reserved");
    }
    return true;
  }

  async releaseSeats(tripId: string, seatCodes: string[]): Promise<void> {
    const inv = seatInventory.get(tripId);
    if (!inv) return;
    for (const code of seatCodes) {
      if (inv.get(code) === "reserved") inv.delete(code);
    }
  }

  async confirmBooking(tripId: string, seatCodes: string[], _bookingId: string): Promise<void> {
    if (!seatInventory.has(tripId)) seatInventory.set(tripId, new Map());
    const inv = seatInventory.get(tripId)!;
    for (const code of seatCodes) {
      inv.set(code, "occupied");
    }
  }
}

export const mockProvider = new MockTravelProvider();
