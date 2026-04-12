import { db } from "@workspace/db";
import { travelBookings, travelSeatInventory } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import type { ITravelProvider, TravelSearchParams, TripResult, SeatMapResult, BookingRequest, BookingResult } from "./TravelProvider.js";
import { mockProvider } from "./providers/MockProvider.js";

const TRAVEL_COMMISSION_RATE = 0.05;

function generateTicketCode(prefix: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

export class TravelBookingService {
  private provider: ITravelProvider;

  constructor(provider: ITravelProvider = mockProvider) {
    this.provider = provider;
  }

  async searchTrips(params: TravelSearchParams): Promise<TripResult[]> {
    const trips = await this.provider.searchTrips(params);
    // Sort by price ascending
    return trips.sort((a, b) => {
      const aPrice = params.seatClass === "premium" ? (a.pricePremium ?? a.priceStandard) : a.priceStandard;
      const bPrice = params.seatClass === "premium" ? (b.pricePremium ?? b.priceStandard) : b.priceStandard;
      return aPrice - bPrice;
    });
  }

  async getTripById(tripId: string): Promise<TripResult | null> {
    return this.provider.getTripById(tripId);
  }

  async getSeatMap(tripId: string): Promise<SeatMapResult> {
    // Merge provider map with DB inventory
    const providerMap = await this.provider.getSeatMap(tripId);
    const dbSeats = await db
      .select()
      .from(travelSeatInventory)
      .where(eq(travelSeatInventory.tripId, tripId));

    if (dbSeats.length > 0) {
      const dbMap = new Map(dbSeats.map((s) => [s.seatCode, s.status as "available" | "occupied" | "reserved"]));
      providerMap.seats = providerMap.seats.map((seat) => ({
        ...seat,
        status: dbMap.get(seat.seatCode) ?? seat.status,
      }));
    }
    return providerMap;
  }

  async createBooking(req: BookingRequest): Promise<BookingResult> {
    const trip = await this.provider.getTripById(req.tripId);
    if (!trip) throw new Error(`Trip ${req.tripId} not found`);

    // Reserve seats via provider (idempotent in mock)
    const reserved = await this.provider.reserveSeats(req.tripId, req.seatCodes);
    if (!reserved) throw new Error("Asientos no disponibles — ya fueron tomados por otra persona");

    // Persist seat reservations in DB
    if (req.seatCodes.length > 0) {
      const seatMap = await this.provider.getSeatMap(req.tripId);
      const seatInfo = seatMap.seats.filter((s) => req.seatCodes.includes(s.seatCode));
      for (const seat of seatInfo) {
        await db
          .insert(travelSeatInventory)
          .values({
            tripId: req.tripId,
            seatCode: seat.seatCode,
            seatClass: seat.seatClass,
            row: seat.row,
            col: seat.col,
            status: "reserved",
            reservedAt: new Date(),
          })
          .onConflictDoNothing();
      }
    }

    const commissionAmount = parseFloat((req.totalAmount * TRAVEL_COMMISSION_RATE).toFixed(2));
    const providerNet = parseFloat((req.totalAmount - commissionAmount).toFixed(2));
    const ticketCode = generateTicketCode(trip.provider.code);

    // Create booking record
    const [booking] = await db.insert(travelBookings).values({
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
      price: req.totalAmount.toFixed(2),
      seats: req.passengers,
      status: "pending",
      tripId: req.tripId,
      providerId: trip.provider.id,
      seatNumbers: req.seatCodes.join(","),
      seatClass: req.seatClass,
      paymentId: req.paymentId ?? null,
      commissionAmount: commissionAmount.toFixed(2),
      commissionRate: TRAVEL_COMMISSION_RATE.toFixed(4),
      ticketCode,
      paymentStatus: req.paymentId ? "pending" : "pending",
      passengerNames: req.passengerNames,
      totalAmount: req.totalAmount.toFixed(2),
    }).returning();

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
      totalAmount: req.totalAmount,
      commissionAmount,
      providerNet,
      status: "pending",
    };
  }

  async confirmBookingPayment(bookingId: string, paymentId: string): Promise<void> {
    const [booking] = await db
      .select()
      .from(travelBookings)
      .where(eq(travelBookings.id, bookingId));

    if (!booking) throw new Error(`Booking ${bookingId} not found`);

    await db
      .update(travelBookings)
      .set({
        status: "confirmed",
        paymentId,
        paymentStatus: "captured",
      })
      .where(eq(travelBookings.id, bookingId));

    // Confirm seats as permanently occupied
    const seatCodes = booking.seatNumbers?.split(",").map((s) => s.trim()) ?? [];
    if (booking.tripId && seatCodes.length > 0) {
      await this.provider.confirmBooking(booking.tripId, seatCodes, bookingId);
      // Update DB seat status
      for (const code of seatCodes) {
        await db
          .update(travelSeatInventory)
          .set({ status: "occupied", bookingId })
          .where(
            and(
              eq(travelSeatInventory.tripId, booking.tripId),
              eq(travelSeatInventory.seatCode, code)
            )
          );
      }
    }
  }

  async getUserBookings(userId: string) {
    return db
      .select()
      .from(travelBookings)
      .where(eq(travelBookings.userId, userId))
      .orderBy(travelBookings.createdAt);
  }

  calculateTripPrice(priceStandard: number, pricePremium: number | null, seatClass: string, passengers: number): number {
    const unitPrice = seatClass === "premium" && pricePremium ? pricePremium : priceStandard;
    return unitPrice * passengers;
  }
}

export const travelBookingService = new TravelBookingService();
