export type TravelProviderType = "bus" | "airline";
export type TravelSeatClass = "standard" | "premium";
export type VehicleLayout = "bus_4col" | "bus_2col" | "plane_6col";

export interface TravelSearchParams {
  origin: string;
  destination: string;
  date: string;
  passengers: number;
  type?: TravelProviderType;
  seatClass?: TravelSeatClass;
}

export interface TravelProviderInfo {
  id: string;
  name: string;
  code: string;
  type: TravelProviderType;
  initials: string;
  colorClass: string;
  rating: number;
  reviewCount: number;
  services: string[];
  commissionRate: number;
}

export interface TripResult {
  tripId: string;
  provider: TravelProviderInfo;
  origin: string;
  destination: string;
  departureAt: string;
  arrivalAt: string;
  durationMinutes: number;
  durationLabel: string;
  priceStandard: number;
  pricePremium: number | null;
  availableSeatsStandard: number;
  availableSeatsPremium: number;
  vehicleLayout: VehicleLayout;
  services: string[];
  discountPercent: number;
  date: string;
}

export interface SeatInfo {
  seatCode: string;
  row: number;
  col: string;
  seatClass: TravelSeatClass;
  status: "available" | "occupied" | "reserved";
}

export interface SeatMapResult {
  tripId: string;
  vehicleLayout: VehicleLayout;
  seats: SeatInfo[];
  totalRows: number;
}

export interface BookingRequest {
  userId: string;
  tripId: string;
  seatCodes: string[];
  seatClass: TravelSeatClass;
  passengers: number;
  passengerNames: string;
  totalAmount: number;
  paymentId?: string;
}

export interface BookingResult {
  bookingId: string;
  ticketCode: string;
  tripId: string;
  origin: string;
  destination: string;
  departureAt: string;
  arrivalAt: string;
  seatNumbers: string;
  seatClass: TravelSeatClass;
  totalAmount: number;
  commissionAmount: number;
  providerNet: number;
  status: string;
}

export interface ITravelProvider {
  searchTrips(params: TravelSearchParams): Promise<TripResult[]>;
  getTripById(tripId: string): Promise<TripResult | null>;
  getSeatMap(tripId: string): Promise<SeatMapResult>;
  reserveSeats(tripId: string, seatCodes: string[]): Promise<boolean>;
  releaseSeats(tripId: string, seatCodes: string[]): Promise<void>;
  confirmBooking(tripId: string, seatCodes: string[], bookingId: string): Promise<void>;
}
