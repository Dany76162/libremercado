export type UserRole = "customer" | "merchant" | "rider" | "admin";
export type VehicleType = "moto" | "auto" | "utilitario" | null;
export type KycStatus = "none" | "pending" | "approved" | "rejected";
export type SubscriptionTier = "free" | "basic" | "premium";
export type MerchantApplicationStatus = "pending" | "approved" | "rejected";
export type RiderStatus = "pending" | "approved" | "active" | "inactive";
export type PromoTargetType = "global" | "province" | "city" | "radius";
export type PromoPlacement = "hero_home" | "secondary_home" | "explore_top" | "store_featured" | "search_highlight";
export type PromoPricingModel = "flat" | "cpc" | "cpm";
export type PromoCommercialStatus = "draft" | "active" | "paused" | "completed" | "expired";
export type AdBillingStatus = "pending" | "active" | "completed";
export type DisputeType = "return" | "not_received" | "damaged" | "wrong_item" | "other";
export type DisputeStatus = "pending" | "reviewing" | "resolved" | "rejected";
export type KycDocType = "dni_front" | "dni_back" | "passport" | "selfie";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type PromoMediaType = "image" | "video";
export type CommissionStatus = "pending" | "collected" | "paid_to_merchant";
export type FavoriteType = "store" | "product";
export type VideoStatus = "draft" | "pending" | "approved" | "rejected" | "published";

export type TransportCompanyStatus = "active" | "inactive" | "pending";
export type FlightStatus = "scheduled" | "boarding" | "departed" | "arrived" | "cancelled" | "delayed";
export type BookingStatus = "pending" | "confirmed" | "cancelled" | "refunded";
export type TripStatus = "scheduled" | "in_progress" | "completed" | "cancelled";
export type TicketClass = "economy" | "business" | "first";
export type TransportMode = "bus" | "minibus" | "van" | "taxi";

export interface CartItem {
  product: Product;
  quantity: number;
  storeId: string;
}

export interface LocationPreferences {
  provinciaId?: string;
  ciudadId?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  role: UserRole;
  avatar?: string | null;
  phone?: string | null;
  address?: string | null;
  vehicleType?: VehicleType;
  termsAccepted: boolean;
  termsAcceptedAt?: Date | null;
  kycStatus: KycStatus;
  aiGenerationsUsed: number;
  locationProvinciaId?: string | null;
  locationCiudadId?: string | null;
  locationLat?: string | null;
  locationLng?: string | null;
  locationRadiusKm?: number | null;
  passwordResetToken?: string | null;
  passwordResetExpiry?: Date | null;
}

export interface InsertUser {
  username: string;
  email: string;
  password: string;
  role?: UserRole;
  avatar?: string | null;
  phone?: string | null;
  address?: string | null;
  vehicleType?: VehicleType;
  termsAccepted?: boolean;
  kycStatus?: KycStatus;
}

export interface KycDocument {
  id: string;
  userId: string;
  docType: KycDocType;
  imageUrl: string;
  status: "pending" | "approved" | "rejected";
  createdAt?: Date | null;
}

export interface InsertKycDocument {
  userId: string;
  docType: KycDocType;
  imageUrl: string;
}

export interface Store {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  ownerId: string;
  imageUrl?: string | null;
  coverImageUrl?: string | null;
  images?: string | null;
  address?: string | null;
  provinciaId?: string | null;
  ciudadId?: string | null;
  lat?: string | null;
  lng?: string | null;
  rating?: string | null;
  reviewCount?: number | null;
  totalSales?: number | null;
  subscriptionTier?: SubscriptionTier | null;
  isVerified?: boolean | null;
  isPaused?: boolean | null;
  followerCount?: number | null;
  createdAt?: Date | null;
  logo?: string | null;
  banner?: string | null;
}

export interface InsertStore {
  name: string;
  description?: string | null;
  category: string;
  ownerId: string;
  imageUrl?: string | null;
  coverImageUrl?: string | null;
  address?: string | null;
  provinciaId?: string | null;
  ciudadId?: string | null;
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  description?: string | null;
  price: string;
  originalPrice?: string | null;
  imageUrl?: string | null;
  image?: string | null;
  images?: string | null;
  category?: string | null;
  stock?: number | null;
  isActive?: boolean | null;
  isSponsored?: boolean | null;
  sponsoredPriority?: number | null;
  isFeatured?: boolean | null;
  createdAt?: Date | null;
}

export interface InsertProduct {
  storeId: string;
  name: string;
  description?: string | null;
  price: string;
  imageUrl?: string | null;
  category?: string | null;
  stock?: number | null;
}

export interface Order {
  id: string;
  customerId: string;
  storeId: string;
  riderId?: string | null;
  status: string;
  total: string;
  shippingAddress?: string | null;
  notes?: string | null;
  paymentStatus?: PaymentStatus | null;
  stripePaymentIntentId?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface InsertOrder {
  customerId: string;
  storeId: string;
  status?: string;
  total: string;
  shippingAddress?: string | null;
  notes?: string | null;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: string;
}

export interface InsertOrderItem {
  orderId: string;
  productId: string;
  quantity: number;
  price: string;
}

export interface Promo {
  id: string;
  storeId: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  mediaType?: PromoMediaType | null;
  link?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  targetType?: PromoTargetType | null;
  targetProvinciaId?: string | null;
  targetCiudadId?: string | null;
  targetLat?: string | null;
  targetLng?: string | null;
  targetRadiusKm?: number | null;
  placement?: PromoPlacement | null;
  pricingModel?: PromoPricingModel | null;
  budget?: string | null;
  impressions?: number | null;
  clicks?: number | null;
  commercialStatus?: PromoCommercialStatus | null;
  isApproved?: boolean | null;
  createdAt?: Date | null;
}

export interface InsertPromo {
  storeId: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
}

export interface TravelOffer {
  id: string;
  companyName: string;
  origin: string;
  destination: string;
  departureTime: Date;
  arrivalTime?: Date | null;
  price: string;
  discountPercentage?: number | null;
  imageUrl?: string | null;
  transportMode?: TransportMode | null;
  isActive?: boolean | null;
  createdAt?: Date | null;
}

export interface InsertTravelOffer {
  companyName: string;
  origin: string;
  destination: string;
  departureTime: Date;
  price: string;
}

export interface KycStatus {}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  features?: string[] | null;
  tier: SubscriptionTier;
  maxProducts?: number | null;
  isActive?: boolean | null;
}

export interface InsertSubscriptionPlan {
  name: string;
  price: string;
  tier: SubscriptionTier;
}

export interface MerchantApplication {
  id: string;
  userId: string;
  businessName: string;
  businessType: string;
  description?: string | null;
  provinciaId?: string | null;
  ciudadId?: string | null;
  status?: MerchantApplicationStatus | null;
  createdAt?: Date | null;
}

export interface InsertMerchantApplication {
  userId: string;
  businessName: string;
  businessType: string;
  description?: string | null;
  provinciaId?: string | null;
  ciudadId?: string | null;
}

export interface RiderProfile {
  id: string;
  userId: string;
  vehicleType: string;
  status?: RiderStatus | null;
  createdAt?: Date | null;
}

export interface InsertRiderProfile {
  userId: string;
  vehicleType: string;
}

export interface RiderEarning {
  id: string;
  riderId: string;
  orderId: string;
  amount: string;
  createdAt?: Date | null;
}

export interface InsertRiderEarning {
  riderId: string;
  orderId: string;
  amount: string;
}

export interface PlatformCommission {
  id: string;
  orderId: string;
  amount: string;
  status?: CommissionStatus | null;
  createdAt?: Date | null;
}

export interface InsertPlatformCommission {
  orderId: string;
  amount: string;
}

export interface AdBilling {
  id: string;
  promoId: string;
  amount: string;
  status?: AdBillingStatus | null;
  createdAt?: Date | null;
}

export interface InsertAdBilling {
  promoId: string;
  amount: string;
}

export interface Review {
  id: string;
  storeId: string;
  userId: string;
  rating: number;
  comment?: string | null;
  createdAt?: Date | null;
}

export interface InsertReview {
  storeId: string;
  userId: string;
  rating: number;
  comment?: string | null;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead?: boolean | null;
  type?: string | null;
  relatedId?: string | null;
  createdAt?: Date | null;
}

export interface InsertNotification {
  userId: string;
  title: string;
  message: string;
  type?: string | null;
  relatedId?: string | null;
}

export interface TravelBooking {
  id: string;
  userId: string;
  offerId: string;
  status?: BookingStatus | null;
  createdAt?: Date | null;
}

export interface InsertTravelBooking {
  userId: string;
  offerId: string;
}

export interface Dispute {
  id: string;
  orderId: string;
  customerId: string;
  type: DisputeType;
  description: string;
  status?: DisputeStatus | null;
  createdAt?: Date | null;
}

export interface InsertDispute {
  orderId: string;
  customerId: string;
  type: DisputeType;
  description: string;
}

export interface Favorite {
  id: string;
  userId: string;
  type: FavoriteType;
  targetId: string;
  createdAt?: Date | null;
}

export interface InsertFavorite {
  userId: string;
  type: FavoriteType;
  targetId: string;
}

export interface VideoFeedItem {
  id: string;
  storeId: string;
  productId?: string | null;
  title: string;
  description?: string | null;
  videoUrl: string;
  thumbnailUrl?: string | null;
  status?: VideoStatus | null;
  isFeatured?: boolean | null;
  isSponsored?: boolean | null;
  viewsCount: number;
  clicksCount: number;
  addToCartCount: number;
  purchasesCount: number;
  savesCount: number;
  tags?: string | null;
  contentType?: string | null;
  targetProvince?: string | null;
  targetCity?: string | null;
  publishedAt?: Date | string | null;
  createdAt?: Date | string | null;
  store?: {
    id: string;
    name: string;
    category: string;
    rating: string | null;
    lat: string | null;
    lng: string | null;
    followersCount: number;
    isFollowing: boolean;
  } | null;
  product?: {
    id: string;
    name: string;
    price: string;
    image: string | null;
    originalPrice: string | null;
  } | null;
}

export interface ShoppableVideo {
  id: string;
  storeId: string;
  productId?: string | null;
  title: string;
  description?: string | null;
  videoUrl: string;
  thumbnailUrl?: string | null;
  status?: VideoStatus | null;
  views?: number | null;
  likes?: number | null;
  isSponsored?: boolean | null;
  isFeatured?: boolean | null;
  publishedAt?: Date | null;
  createdAt?: Date | null;
}

export interface InsertShoppableVideo {
  storeId: string;
  productId?: string | null;
  title: string;
  description?: string | null;
  videoUrl: string;
  thumbnailUrl?: string | null;
}
