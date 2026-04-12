/**
 * TravelBookingService — Core orchestrator for travel commerce.
 *
 * Architecture:
 *  - ITravelProvider: generates trip/seat data (mock or real external API)
 *  - PostgreSQL DB: single source of truth for all inventory and booking state
 *  - This service: bridges provider data ↔ DB, enforces consistency
 *
 * Guarantees:
 *  ✓ No double-booking — atomic UPDATE WHERE status='available' (PostgreSQL guarantees)
 *  ✓ No partial state — db.transaction wraps seat reservation + booking insert
 *  ✓ Price validated server-side — client amount is verified ±1%
 *  ✓ Stale reservations auto-expired — TTL 15 min, both in-flow + periodic job
 *  ✓ FK integrity — providers → routes → trips → seat_inventory always consistent
 *  ✓ Real availability — seat counts come from DB, not mock random numbers
 *
 * In-memory Sets (seededProviders, seededRoutes, etc.) are PERFORMANCE HINTS only.
 * They skip redundant DB roundtrips within a single server process lifetime.
 * Correctness is always enforced by the DB (ON CONFLICT DO NOTHING / UPDATE WHERE).
 * In a multi-instance deploy, each instance builds its own Set; redundant upserts
 * are safe because all DB operations are idempotent.
 */

import { db } from "@workspace/db";
import {
  travelProviders,
  travelRoutes,
  travelTrips,
  travelSeatInventory,
  travelBookings,
} from "@workspace/db";
import { eq, and, inArray, lt, sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
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

  // Performance hints: skip redundant DB upserts within one process lifetime.
  // NOT authoritative — DB is always the source of truth.
  private seededProviders = new Set<string>();
  private seededRoutes = new Set<string>();
  private seededTrips = new Set<string>();
  private seededSeatMaps = new Set<string>();

  constructor(provider: ITravelProvider = mockProvider) {
    this.provider = provider;
  }

  // ─── SEEDING: Provider → Route → Trip → Seat Inventory ────────────────────
  // Idempotent. Safe to call concurrently across instances (ON CONFLICT DO NOTHING).

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
        set: { name: p.name, rating: p.rating.toFixed(1), reviewCount: p.reviewCount },
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

  /**
   * Seeds seat inventory for a trip into DB (idempotent).
   * After this call, travel_seat_inventory is the authoritative seat state for this trip.
   */
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
    const CHUNK = 100;
    for (let i = 0; i < rows.length; i += CHUNK) {
      await db
        .insert(travelSeatInventory)
        .values(rows.slice(i, i + CHUNK) as any)
        .onConflictDoNothing();
    }
    const availCount = rows.filter((r) => r.status === "available").length;
    logger.info(
      { tripId, total: rows.length, available: availCount },
      "[travel:seed] Seat inventory seeded for trip"
    );
    this.seededSeatMaps.add(tripId);
  }

  /**
   * Query real available seat counts from DB for a set of trip IDs.
   * Returns a Map<tripId, { standard: number, premium: number }>.
   */
  private async getRealAvailability(
    tripIds: string[]
  ): Promise<Map<string, { standard: number; premium: number }>> {
    if (tripIds.length === 0) return new Map();

    const rows = await db
      .select({
        tripId: travelSeatInventory.tripId,
        seatClass: travelSeatInventory.seatClass,
        count: sql<number>`count(*)::int`,
      })
      .from(travelSeatInventory)
      .where(
        and(
          inArray(travelSeatInventory.tripId, tripIds),
          eq(travelSeatInventory.status, "available")
        )
      )
      .groupBy(travelSeatInventory.tripId, travelSeatInventory.seatClass);

    const result = new Map<string, { standard: number; premium: number }>();
    for (const row of rows) {
      if (!result.has(row.tripId)) result.set(row.tripId, { standard: 0, premium: 0 });
      const entry = result.get(row.tripId)!;
      if (row.seatClass === "premium") entry.premium = row.count;
      else entry.standard = row.count;
    }
    return result;
  }

  // ─── PUBLIC: Search (with real DB availability) ────────────────────────────

  async searchTrips(params: TravelSearchParams): Promise<TripResult[]> {
    const trips = await this.provider.searchTrips(params);
    if (trips.length === 0) return [];

    logger.info(
      { origin: params.origin, destination: params.destination, date: params.date, count: trips.length },
      "[travel:search] Provider returned trips — seeding to DB"
    );

    // Seed all trips and their seat inventory to DB (await for FK integrity + real availability)
    await Promise.all(trips.map((t) => this.upsertTrip(t)));
    await Promise.all(trips.map((t) => this.ensureSeatInventory(t.tripId)));

    // Query REAL availability from DB (replaces mock random numbers)
    const tripIds = trips.map((t) => t.tripId);
    const realAvail = await this.getRealAvailability(tripIds);

    // Merge real availability into trip results
    const enriched = trips.map((t) => {
      const avail = realAvail.get(t.tripId);
      return {
        ...t,
        availableSeatsStandard: avail?.standard ?? t.availableSeatsStandard,
        availableSeatsPremium: avail?.premium ?? t.availableSeatsPremium,
      };
    });

    logger.info(
      { count: enriched.length },
      "[travel:search] Returning trips with real DB availability"
    );

    // Sort by price (ascending) within the requested class
    return enriched.sort((a, b) => {
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
    if (trip) await this.upsertTrip(trip);
    return trip;
  }

  // ─── PUBLIC: Seat map (DB is authoritative source) ────────────────────────

  async getSeatMap(tripId: string): Promise<SeatMapResult> {
    const trip = await this.getTripById(tripId);
    if (!trip) throw new Error(`Trip ${tripId} not found`);

    await this.ensureSeatInventory(tripId);

    const dbSeats = await db
      .select()
      .from(travelSeatInventory)
      .where(eq(travelSeatInventory.tripId, tripId));

    // Layout comes from provider; statuses come from DB
    const providerMap = await this.provider.getSeatMap(tripId);
    const dbMap = new Map(
      dbSeats.map((s) => [s.seatCode, s.status as "available" | "occupied" | "reserved"])
    );
    providerMap.seats = providerMap.seats.map((seat) => ({
      ...seat,
      status: dbMap.get(seat.seatCode) ?? seat.status,
    }));

    logger.info(
      {
        tripId,
        total: dbSeats.length,
        available: dbSeats.filter((s) => s.status === "available").length,
        occupied: dbSeats.filter((s) => s.status === "occupied").length,
        reserved: dbSeats.filter((s) => s.status === "reserved").length,
      },
      "[travel:seats] Seat map served from DB"
    );

    return providerMap;
  }

  // ─── EXPIRE STALE RESERVATIONS ─────────────────────────────────────────────
  // Called by: (a) each createBooking transaction and (b) the 60s periodic job

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

  // ─── ATOMIC BOOKING ────────────────────────────────────────────────────────

  async createBooking(
    req: BookingRequest
  ): Promise<BookingResult & { systemMerchantId: string; serverCalculatedTotal: number }> {
    // Get trip — also upserts provider/route/trip to DB
    const trip = await this.getTripById(req.tripId);
    if (!trip) {
      logger.warn({ tripId: req.tripId }, "[travel:booking] Trip not found");
      throw new Error(`Viaje ${req.tripId} no encontrado`);
    }

    // ── Input validations ───────────────────────────────────────────────────
    if (!req.seatCodes || req.seatCodes.length === 0) {
      throw new Error("Debés seleccionar al menos un asiento");
    }
    if (req.seatCodes.length !== req.passengers) {
      throw new Error(
        `Seleccionaste ${req.seatCodes.length} asiento(s) pero declaraste ${req.passengers} pasajero(s)`
      );
    }
    if (req.passengers < 1 || req.passengers > 6) {
      throw new Error("Cantidad de pasajeros inválida (1–6)");
    }

    // ── Server-side price calculation ───────────────────────────────────────
    const unitPrice =
      req.seatClass === "premium" && trip.pricePremium
        ? trip.pricePremium
        : trip.priceStandard;
    const serverTotal = parseFloat((unitPrice * req.passengers).toFixed(2));
    const tolerance = Math.max(serverTotal * 0.01, 1); // 1% or 1 ARS
    if (Math.abs(req.totalAmount - serverTotal) > tolerance) {
      logger.warn(
        { expected: serverTotal, received: req.totalAmount, tripId: req.tripId },
        "[travel:booking] Price manipulation attempt detected"
      );
      throw new Error(
        `Precio inconsistente. Esperado: $${serverTotal.toFixed(0)}, recibido: $${req.totalAmount.toFixed(0)}`
      );
    }

    const totalAmount = serverTotal;
    const commissionAmount = parseFloat((totalAmount * TRAVEL_COMMISSION_RATE).toFixed(2));
    const providerNet = parseFloat((totalAmount - commissionAmount).toFixed(2));
    const ticketCode = generateTicketCode(trip.provider.code);
    const systemMerchantId = systemUserIdForProvider(trip.provider.id);

    // Ensure seat inventory exists in DB BEFORE entering transaction
    await this.ensureSeatInventory(req.tripId);

    logger.info(
      { tripId: req.tripId, seats: req.seatCodes, passengers: req.passengers, total: totalAmount },
      "[travel:booking] Starting atomic booking transaction"
    );

    // ── ATOMIC TRANSACTION ──────────────────────────────────────────────────
    // 1. Expire stale reservations
    // 2. Reserve seats (UPDATE WHERE status='available') — PostgreSQL atomicity
    // 3. Insert booking record
    // 4. Link seats to booking
    const booking = await db.transaction(async (tx) => {
      // Step 1: expire stale reservations (runs before each booking, frees ghost blocks)
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

      // Step 2: atomic seat reservation
      // PostgreSQL guarantees: only one concurrent UPDATE can succeed for each row.
      // If a concurrent transaction reserved the seat first, our WHERE condition fails.
      const now = new Date();
      for (const code of req.seatCodes) {
        const rows = await tx
          .update(travelSeatInventory)
          .set({ status: "reserved", reservedAt: now })
          .where(
            and(
              eq(travelSeatInventory.tripId, req.tripId),
              eq(travelSeatInventory.seatCode, code),
              eq(travelSeatInventory.status, "available")
            )
          )
          .returning({ id: travelSeatInventory.id });
        if (rows.length === 0) {
          logger.info(
            { tripId: req.tripId, seat: code },
            "[travel:booking] Seat already taken — rolling back"
          );
          throw new Error(
            `El asiento ${code} ya no está disponible. Por favor seleccioná otro.`
          );
        }
      }

      // Step 3: create booking record (status=pending until payment confirmed)
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

      // Step 4: link reserved seats to booking
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

    logger.info(
      { bookingId: booking.id, ticketCode, tripId: req.tripId, seats: req.seatCodes, total: totalAmount },
      "[travel:booking] Booking created — awaiting payment confirmation"
    );

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

    logger.info(
      { bookingId, paymentId, ticketCode: booking.ticketCode },
      "[travel:booking] Booking confirmed — seats marked occupied"
    );
  }

  // ─── USER BOOKINGS ──────────────────────────────────────────────────────────

  async getUserBookings(userId: string) {
    return db
      .select()
      .from(travelBookings)
      .where(eq(travelBookings.userId, userId))
      .orderBy(travelBookings.createdAt);
  }
}

export const travelBookingService = new TravelBookingService();
