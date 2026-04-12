/**
 * TravelBookingService — Core orchestrator for travel commerce.
 *
 * DB is the source of truth for all inventory and booking state.
 * MockProvider generates trip/seat data; this service persists it to DB on demand.
 *
 * Guarantees:
 *  - No seat double-booking (atomic UPDATE WHERE status='available')
 *  - No partial state (db.transaction wraps seat + booking inserts)
 *  - Price validated server-side (client amount is verified against trip price)
 *  - Stale reservations auto-expired (TTL = 15 min)
 */

import { db } from "@workspace/db";
import {
  travelProviders,
  travelRoutes,
  travelTrips,
  travelSeatInventory,
  travelBookings,
} from "@workspace/db";
import { eq, and, inArray, lt } from "drizzle-orm";
import type {
  ITravelProvider,
  TravelSearchParams,
  TripResult,
  SeatMapResult,
  BookingRequest,
  BookingResult,
} from "./TravelProvider.js";
import { mockProvider } from "./providers/MockProvider.js";

const TRAVEL_COMMISSION_RATE = 0.05;
const SEAT_RESERVATION_TTL_MINUTES = 15;

function generateTicketCode(prefix: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

function routeId(providerId: string, origin: string, dest: string): string {
  return `${providerId}:${origin.replace(/\s/g, "_")}:${dest.replace(/\s/g, "_")}`;
}

/** Stable system user ID for a provider — used as merchantId in the payment ledger */
export function systemUserIdForProvider(providerId: string): string {
  return `sys_${providerId}`;
}

export class TravelBookingService {
  private provider: ITravelProvider;

  // In-process caches to avoid redundant DB calls within a server lifetime
  private seededProviders = new Set<string>();
  private seededRoutes = new Set<string>();
  private seededTrips = new Set<string>();
  private seededSeatMaps = new Set<string>();

  constructor(provider: ITravelProvider = mockProvider) {
    this.provider = provider;
  }

  // ─── SEEDING: Provider → Route → Trip → Seat Inventory ────────────────────

  private async upsertProvider(p: any): Promise<void> {
    if (this.seededProviders.has(p.id)) return;
    await db
      .insert(travelProviders)
      .values({
        id: p.id,
        name: p.name,
        code: p.code,
        type: p.type,
        initials: p.initials,
        colorClass: p.colorClass,
        rating: p.rating.toFixed(1),
        reviewCount: p.reviewCount,
        servicesJson: JSON.stringify(p.services),
        commissionRate: p.commissionRate.toFixed(4),
        isActive: true,
        status: "active",
      })
      .onConflictDoUpdate({
        target: travelProviders.id,
        set: {
          name: p.name,
          rating: p.rating.toFixed(1),
          reviewCount: p.reviewCount,
        },
      });
    this.seededProviders.add(p.id);
  }

  private async upsertRoute(providerId: string, origin: string, dest: string): Promise<string> {
    const id = routeId(providerId, origin, dest);
    if (this.seededRoutes.has(id)) return id;
    await db
      .insert(travelRoutes)
      .values({ id, providerId, origin, destination: dest, isActive: true })
      .onConflictDoUpdate({ target: travelRoutes.id, set: { isActive: true } });
    this.seededRoutes.add(id);
    return id;
  }

  private async upsertTrip(trip: TripResult): Promise<void> {
    if (this.seededTrips.has(trip.tripId)) return;
    await this.upsertProvider(trip.provider);
    const rId = await this.upsertRoute(trip.provider.id, trip.origin, trip.destination);
    await db
      .insert(travelTrips)
      .values({
        id: trip.tripId,
        routeId: rId,
        providerId: trip.provider.id,
        type: trip.provider.type,
        origin: trip.origin,
        destination: trip.destination,
        departureAt: new Date(trip.departureAt),
        arrivalAt: new Date(trip.arrivalAt),
        durationMinutes: trip.durationMinutes,
        priceStandard: trip.priceStandard.toFixed(2),
        pricePremium: trip.pricePremium != null ? trip.pricePremium.toFixed(2) : null,
        availableSeatsStandard: trip.availableSeatsStandard,
        availableSeatsPremium: trip.availableSeatsPremium,
        vehicleLayout: trip.vehicleLayout,
        servicesJson: JSON.stringify(trip.services),
        discountPercent: trip.discountPercent,
        status: "scheduled",
      })
      .onConflictDoUpdate({
        target: travelTrips.id,
        set: {
          availableSeatsStandard: trip.availableSeatsStandard,
          availableSeatsPremium: trip.availableSeatsPremium,
          discountPercent: trip.discountPercent,
        },
      });
    this.seededTrips.add(trip.tripId);
  }

  /** Seed seat inventory for a trip into DB (idempotent). DB becomes source of truth. */
  private async ensureSeatInventory(tripId: string): Promise<void> {
    if (this.seededSeatMaps.has(tripId)) return;
    const existing = await db
      .select({ id: travelSeatInventory.id })
      .from(travelSeatInventory)
      .where(eq(travelSeatInventory.tripId, tripId))
      .limit(1);
    if (existing.length > 0) {
      this.seededSeatMaps.add(tripId);
      return;
    }
    const providerMap = await this.provider.getSeatMap(tripId);
    const rows = providerMap.seats.map((s) => ({
      tripId,
      seatCode: s.seatCode,
      seatClass: s.seatClass,
      row: s.row,
      col: s.col,
      status: (s.status === "occupied" ? "occupied" : "available") as "available" | "occupied",
    }));
    // Chunk inserts to stay within PostgreSQL's parameter limit
    const CHUNK = 100;
    for (let i = 0; i < rows.length; i += CHUNK) {
      await db
        .insert(travelSeatInventory)
        .values(rows.slice(i, i + CHUNK) as any)
        .onConflictDoNothing();
    }
    this.seededSeatMaps.add(tripId);
  }

  // ─── PUBLIC: Search ────────────────────────────────────────────────────────

  async searchTrips(params: TravelSearchParams): Promise<TripResult[]> {
    const trips = await this.provider.searchTrips(params);
    // Persist trips to DB in background (don't block the HTTP response)
    Promise.all(trips.map((t) => this.upsertTrip(t))).catch(() => {});
    return trips.sort((a, b) => {
      const aP =
        params.seatClass === "premium" ? (a.pricePremium ?? a.priceStandard) : a.priceStandard;
      const bP =
        params.seatClass === "premium" ? (b.pricePremium ?? b.priceStandard) : b.priceStandard;
      return aP - bP;
    });
  }

  // ─── PUBLIC: Trip detail ───────────────────────────────────────────────────

  async getTripById(tripId: string): Promise<TripResult | null> {
    const trip = await this.provider.getTripById(tripId);
    if (trip) await this.upsertTrip(trip); // ensure persisted (awaited: needed before booking)
    return trip;
  }

  // ─── PUBLIC: Seat map (DB is source of truth) ─────────────────────────────

  async getSeatMap(tripId: string): Promise<SeatMapResult> {
    const trip = await this.getTripById(tripId);
    if (!trip) throw new Error(`Trip ${tripId} not found`);
    await this.ensureSeatInventory(tripId);

    const dbSeats = await db
      .select()
      .from(travelSeatInventory)
      .where(eq(travelSeatInventory.tripId, tripId));

    // Use provider map for layout metadata, but override statuses from DB
    const providerMap = await this.provider.getSeatMap(tripId);
    const dbMap = new Map(
      dbSeats.map((s) => [s.seatCode, s.status as "available" | "occupied" | "reserved"])
    );
    providerMap.seats = providerMap.seats.map((seat) => ({
      ...seat,
      status: dbMap.get(seat.seatCode) ?? seat.status,
    }));
    return providerMap;
  }

  // ─── EXPIRE STALE RESERVATIONS ─────────────────────────────────────────────

  async expireOldReservations(): Promise<number> {
    const cutoff = new Date(Date.now() - SEAT_RESERVATION_TTL_MINUTES * 60_000);
    const freed = await db
      .update(travelSeatInventory)
      .set({ status: "available", reservedAt: null, bookingId: null })
      .where(
        and(
          eq(travelSeatInventory.status, "reserved"),
          lt(travelSeatInventory.reservedAt as any, cutoff)
        )
      )
      .returning();
    return freed.length;
  }

  // ─── ATOMIC BOOKING (Transaction) ─────────────────────────────────────────

  async createBooking(
    req: BookingRequest
  ): Promise<BookingResult & { systemMerchantId: string; serverCalculatedTotal: number }> {
    // 1. Get trip (also upserts provider/route/trip to DB)
    const trip = await this.getTripById(req.tripId);
    if (!trip) throw new Error(`Viaje ${req.tripId} no encontrado`);

    // 2. Backend validations
    if (!req.seatCodes || req.seatCodes.length === 0) {
      throw new Error("Debés seleccionar al menos un asiento");
    }
    if (req.seatCodes.length !== req.passengers) {
      throw new Error(
        `Seleccionaste ${req.seatCodes.length} asiento(s) pero declaraste ${req.passengers} pasajero(s)`
      );
    }

    // 3. Server-side price calculation and validation
    const unitPrice =
      req.seatClass === "premium" && trip.pricePremium
        ? trip.pricePremium
        : trip.priceStandard;
    const serverTotal = parseFloat((unitPrice * req.passengers).toFixed(2));
    const tolerance = Math.max(serverTotal * 0.01, 1); // 1% or 1 ARS
    if (Math.abs(req.totalAmount - serverTotal) > tolerance) {
      throw new Error(
        `Precio inconsistente. Esperado: $${serverTotal.toFixed(0)}, recibido: $${req.totalAmount.toFixed(0)}`
      );
    }

    const totalAmount = serverTotal; // always use server-calculated price
    const commissionAmount = parseFloat((totalAmount * TRAVEL_COMMISSION_RATE).toFixed(2));
    const providerNet = parseFloat((totalAmount - commissionAmount).toFixed(2));
    const ticketCode = generateTicketCode(trip.provider.code);
    const systemMerchantId = systemUserIdForProvider(trip.provider.id);

    // 4. Ensure seats are seeded in DB BEFORE the transaction
    await this.ensureSeatInventory(req.tripId);

    // 5. ATOMIC TRANSACTION: expire stale → reserve seats → create booking
    const booking = await db.transaction(async (tx) => {
      // 5a. Expire stale reservations (prevents ghost blocks)
      const cutoff = new Date(Date.now() - SEAT_RESERVATION_TTL_MINUTES * 60_000);
      await tx
        .update(travelSeatInventory)
        .set({ status: "available", reservedAt: null, bookingId: null })
        .where(
          and(
            eq(travelSeatInventory.status, "reserved"),
            lt(travelSeatInventory.reservedAt as any, cutoff)
          )
        );

      // 5b. ATOMIC SEAT RESERVATION — UPDATE WHERE status='available'
      // PostgreSQL guarantees: only one concurrent UPDATE can win each row.
      // If a seat is taken between our check and update, returning[] will be short.
      const now = new Date();
      const reservedRows: any[] = [];
      for (const code of req.seatCodes) {
        const rows = await tx
          .update(travelSeatInventory)
          .set({ status: "reserved", reservedAt: now })
          .where(
            and(
              eq(travelSeatInventory.tripId, req.tripId),
              eq(travelSeatInventory.seatCode, code),
              eq(travelSeatInventory.status, "available") // ATOMIC guard
            )
          )
          .returning();
        if (rows.length === 0) {
          // Seat was not available — transaction will rollback automatically
          throw new Error(
            `El asiento ${code} ya no está disponible. Por favor seleccioná otro.`
          );
        }
        reservedRows.push(...rows);
      }

      // 5c. Create booking record
      const [bk] = await tx
        .insert(travelBookings)
        .values({
          userId: req.userId,
          type: trip.provider.type,
          companyId: trip.provider.id,
          companyName: trip.provider.name,
          origin: trip.origin,
          destination: trip.destination,
          travelDate: trip.date,
          departureTime: new Date(trip.departureAt).toTimeString().slice(0, 5),
          arrivalTime: new Date(trip.arrivalAt).toTimeString().slice(0, 5),
          duration: trip.durationLabel,
          price: totalAmount.toFixed(2),
          seats: req.passengers,
          status: "pending",
          tripId: req.tripId,
          providerId: trip.provider.id,
          seatNumbers: req.seatCodes.join(","),
          seatClass: req.seatClass,
          commissionAmount: commissionAmount.toFixed(2),
          commissionRate: TRAVEL_COMMISSION_RATE.toFixed(4),
          ticketCode,
          paymentStatus: "pending",
          passengerNames: req.passengerNames,
          totalAmount: totalAmount.toFixed(2),
        })
        .returning();

      // 5d. Link reserved seats to this booking
      await tx
        .update(travelSeatInventory)
        .set({ bookingId: bk.id })
        .where(
          and(
            eq(travelSeatInventory.tripId, req.tripId),
            inArray(travelSeatInventory.seatCode, req.seatCodes)
          )
        );

      return bk;
    });

    return {
      bookingId: booking.id,
      ticketCode,
      tripId: req.tripId,
      origin: trip.origin,
      destination: trip.destination,
      departureAt: trip.departureAt,
      arrivalAt: trip.arrivalAt,
      seatNumbers: req.seatCodes.join(", "),
      seatClass: req.seatClass,
      totalAmount,
      commissionAmount,
      providerNet,
      status: "pending",
      systemMerchantId,
      serverCalculatedTotal: totalAmount,
    };
  }

  // ─── CONFIRM PAYMENT → MARK BOOKING CONFIRMED + SEATS OCCUPIED ─────────────

  async confirmBookingPayment(bookingId: string, paymentId: string): Promise<void> {
    const [booking] = await db
      .select()
      .from(travelBookings)
      .where(eq(travelBookings.id, bookingId));
    if (!booking) throw new Error(`Booking ${bookingId} not found`);

    await db.transaction(async (tx) => {
      await tx
        .update(travelBookings)
        .set({ status: "confirmed", paymentId, paymentStatus: "captured" })
        .where(eq(travelBookings.id, bookingId));

      const seatCodes = booking.seatNumbers?.split(",").map((s) => s.trim()) ?? [];
      if (booking.tripId && seatCodes.length > 0) {
        await tx
          .update(travelSeatInventory)
          .set({ status: "occupied" })
          .where(
            and(
              eq(travelSeatInventory.tripId, booking.tripId),
              inArray(travelSeatInventory.seatCode, seatCodes)
            )
          );
      }
    });
  }

  // ─── USER BOOKINGS ──────────────────────────────────────────────────────────

  async getUserBookings(userId: string) {
    return db
      .select()
      .from(travelBookings)
      .where(eq(travelBookings.userId, userId))
      .orderBy(travelBookings.createdAt);
  }

  calculateTripPrice(
    priceStandard: number,
    pricePremium: number | null,
    seatClass: string,
    passengers: number
  ): number {
    const unit = seatClass === "premium" && pricePremium ? pricePremium : priceStandard;
    return unit * passengers;
  }
}

export const travelBookingService = new TravelBookingService();
