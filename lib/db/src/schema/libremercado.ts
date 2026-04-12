import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export type UserRole = "customer" | "merchant" | "rider" | "admin" | "official";
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

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").$type<UserRole>().notNull().default("customer"),
  avatar: text("avatar"),
  phone: text("phone"),
  address: text("address"),
  vehicleType: text("vehicle_type").$type<VehicleType>(),
  termsAccepted: boolean("terms_accepted").notNull().default(false),
  termsAcceptedAt: timestamp("terms_accepted_at"),
  kycStatus: text("kyc_status").$type<KycStatus>().notNull().default("none"),
  aiGenerationsUsed: integer("ai_generations_used").notNull().default(0),
  locationProvinciaId: text("location_provincia_id"),
  locationCiudadId: text("location_ciudad_id"),
  locationLat: decimal("location_lat", { precision: 10, scale: 7 }),
  locationLng: decimal("location_lng", { precision: 10, scale: 7 }),
  locationRadiusKm: integer("location_radius_km").default(25),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpiry: timestamp("password_reset_expiry"),
});

export type KycDocType = "dni_front" | "dni_back" | "passport" | "selfie";

export const kycDocuments = pgTable("kyc_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  docType: text("doc_type").$type<KycDocType>().notNull(),
  imageUrl: text("image_url").notNull(),
  status: text("status").$type<"pending" | "approved" | "rejected">().notNull().default("pending"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by"),
});

export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tier: text("tier").$type<SubscriptionTier>().notNull(),
  name: text("name").notNull(),
  monthlyFee: decimal("monthly_fee", { precision: 10, scale: 2 }).notNull(),
  productLimit: integer("product_limit").notNull(),
  commissionPercent: decimal("commission_percent", { precision: 5, scale: 2 }).notNull(),
  features: text("features"),
  isActive: boolean("is_active").notNull().default(true),
});

export const merchantApplications = pgTable("merchant_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  businessName: text("business_name").notNull(),
  businessType: text("business_type").notNull(),
  description: text("description"),
  address: text("address").notNull(),
  provinciaId: text("provincia_id").notNull(),
  ciudadId: text("ciudad_id"),
  phone: text("phone").notNull(),
  status: text("status").$type<MerchantApplicationStatus>().notNull().default("pending"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by"),
});

export const stores = pgTable("stores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  logo: text("logo"),
  banner: text("banner"),
  images: text("images"), // JSON array of gallery image URLs
  category: text("category").notNull(),
  rating: decimal("rating", { precision: 2, scale: 1 }).default("0"),
  isActive: boolean("is_active").notNull().default(true),
  subscriptionTier: text("subscription_tier").$type<SubscriptionTier>().notNull().default("free"),
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  address: text("address"),
  provinciaId: text("provincia_id"),
  ciudadId: text("ciudad_id"),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),
  phone: text("phone"),
  openingHours: text("opening_hours"),
  // M2 — Destaque comercial
  isFeatured: boolean("is_featured").notNull().default(false),
  featuredUntil: timestamp("featured_until"),
  featuredScore: integer("featured_score").notNull().default(0),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId: varchar("store_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }),
  image: text("image"),
  images: text("images"), // JSON array of extra image URLs
  category: text("category"),
  stock: integer("stock").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  attributes: text("attributes"), // JSON object of key-value attributes (e.g. {"Talle":"M","Color":"Rojo"})
  // M2 — Patrocinio comercial
  isSponsored: boolean("is_sponsored").notNull().default(false),
  sponsoredUntil: timestamp("sponsored_until"),
  sponsoredPriority: integer("sponsored_priority").notNull().default(0),
});

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  storeId: varchar("store_id").notNull(),
  riderId: varchar("rider_id"),
  status: text("status").$type<"pending" | "confirmed" | "preparing" | "ready" | "in_transit" | "delivered" | "cancelled">().notNull().default("pending"),
  paymentStatus: text("payment_status").$type<PaymentStatus>().notNull().default("pending"),
  paymentIntentId: text("payment_intent_id"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  address: text("address").notNull(),
  notes: text("notes"),
  storeLat: decimal("store_lat", { precision: 10, scale: 7 }),
  storeLng: decimal("store_lng", { precision: 10, scale: 7 }),
  deliveryLat: decimal("delivery_lat", { precision: 10, scale: 7 }),
  deliveryLng: decimal("delivery_lng", { precision: 10, scale: 7 }),
  riderLat: decimal("rider_lat", { precision: 10, scale: 7 }),
  riderLng: decimal("rider_lng", { precision: 10, scale: 7 }),
});

export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(),
  productId: varchar("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  link: text("link"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true, isRead: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  orderId: varchar("order_id").notNull(),
  storeId: varchar("store_id").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true });
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;

export type PromoMediaType = "image" | "video";

export const promos = pgTable("promos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  image: text("image"),
  videoUrl: text("video_url"),
  mediaType: text("media_type").$type<PromoMediaType>().notNull().default("image"),
  link: text("link"),
  type: text("type").$type<"banner" | "notice" | "category">().notNull().default("banner"),
  advertiser: text("advertiser"),
  discount: text("discount"),
  isActive: boolean("is_active").notNull().default(true),
  priority: integer("priority").notNull().default(0),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
  generatedByAi: boolean("generated_by_ai").notNull().default(false),
  targetType: text("target_type").$type<PromoTargetType>().notNull().default("global"),
  targetProvince: text("target_province"),
  targetCity: text("target_city"),
  targetLat: decimal("target_lat", { precision: 10, scale: 7 }),
  targetLng: decimal("target_lng", { precision: 10, scale: 7 }),
  targetRadiusKm: integer("target_radius_km"),
  impressions: integer("impressions").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  // M1 — Campos comerciales
  placement: text("placement").$type<PromoPlacement>().default("hero_home"),
  pricingModel: text("pricing_model").$type<PromoPricingModel>().default("flat"),
  budget: decimal("budget", { precision: 12, scale: 2 }).default("0"),
  spentAmount: decimal("spent_amount", { precision: 12, scale: 2 }).default("0"),
  maxImpressions: integer("max_impressions"),
  maxClicks: integer("max_clicks"),
  commercialStatus: text("commercial_status").$type<PromoCommercialStatus>().default("active"),
  advertiserId: varchar("advertiser_id"),
});

export type CommissionStatus = "pending" | "collected" | "paid_to_merchant";

export const platformCommissions = pgTable("platform_commissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(),
  storeId: varchar("store_id").notNull(),
  orderTotal: decimal("order_total", { precision: 10, scale: 2 }).notNull(),
  commissionPercent: decimal("commission_percent", { precision: 5, scale: 2 }).notNull(),
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }).notNull(),
  merchantAmount: decimal("merchant_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").$type<CommissionStatus>().notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  collectedAt: timestamp("collected_at"),
});

// M5 — Facturación publicitaria interna
export const adBillings = pgTable("ad_billings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  promoId: varchar("promo_id").notNull(),
  advertiserId: varchar("advertiser_id"),
  concept: text("concept").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("ARS"),
  pricingModel: text("pricing_model").$type<PromoPricingModel>().notNull().default("flat"),
  impressionsCount: integer("impressions_count").notNull().default(0),
  clicksCount: integer("clicks_count").notNull().default(0),
  status: text("status").$type<AdBillingStatus>().notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertStoreSchema = createInsertSchema(stores).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export const insertPromoSchema = createInsertSchema(promos).omit({ id: true, createdAt: true });
export const insertKycDocumentSchema = createInsertSchema(kycDocuments).omit({ id: true, createdAt: true, reviewedAt: true, reviewedBy: true });
export const insertAdBillingSchema = createInsertSchema(adBillings).omit({ id: true, createdAt: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertStore = z.infer<typeof insertStoreSchema>;
export type Store = typeof stores.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertPromo = z.infer<typeof insertPromoSchema>;
export type Promo = typeof promos.$inferSelect;
export type InsertKycDocument = z.infer<typeof insertKycDocumentSchema>;
export type KycDocument = typeof kycDocuments.$inferSelect;
export type InsertAdBilling = z.infer<typeof insertAdBillingSchema>;
export type AdBilling = typeof adBillings.$inferSelect;

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface LocationPreferences {
  provinciaId: string | null;
  ciudadId: string | null;
  lat: number | null;
  lng: number | null;
  radiusKm: number;
}

// Travel offers for bus companies
export const travelOffers = pgTable("travel_offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull(),
  companyLogo: text("company_logo"),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }),
  discount: text("discount"),
  departureDate: text("departure_date"),
  travelTime: text("travel_time"),
  amenities: text("amenities"),
  externalLink: text("external_link").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  priority: integer("priority").notNull().default(0),
});

export const insertTravelOfferSchema = createInsertSchema(travelOffers).omit({ id: true });
export type InsertTravelOffer = z.infer<typeof insertTravelOfferSchema>;
export type TravelOffer = typeof travelOffers.$inferSelect;

export const riderProfiles = pgTable("rider_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  vehicleType: text("vehicle_type").$type<VehicleType>().notNull(),
  vehiclePlate: text("vehicle_plate"),
  licenseNumber: text("license_number"),
  provinciaId: text("provincia_id"),
  ciudadId: text("ciudad_id"),
  status: text("status").$type<RiderStatus>().notNull().default("pending"),
  isAvailable: boolean("is_available").notNull().default(false),
  currentLat: decimal("current_lat", { precision: 10, scale: 7 }),
  currentLng: decimal("current_lng", { precision: 10, scale: 7 }),
  totalDeliveries: integer("total_deliveries").notNull().default(0),
  rating: decimal("rating", { precision: 2, scale: 1 }).default("5.0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const riderEarnings = pgTable("rider_earnings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  riderId: varchar("rider_id").notNull(),
  orderId: varchar("order_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").$type<"pending" | "paid">().notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  paidAt: timestamp("paid_at"),
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({ id: true });
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;

export const insertMerchantApplicationSchema = createInsertSchema(merchantApplications).omit({ id: true, createdAt: true, reviewedAt: true, reviewedBy: true });
export type InsertMerchantApplication = z.infer<typeof insertMerchantApplicationSchema>;
export type MerchantApplication = typeof merchantApplications.$inferSelect;

export const insertRiderProfileSchema = createInsertSchema(riderProfiles).omit({ id: true, createdAt: true });
export type InsertRiderProfile = z.infer<typeof insertRiderProfileSchema>;
export type RiderProfile = typeof riderProfiles.$inferSelect;

export const insertRiderEarningSchema = createInsertSchema(riderEarnings).omit({ id: true, createdAt: true, paidAt: true });
export type InsertRiderEarning = z.infer<typeof insertRiderEarningSchema>;
export type RiderEarning = typeof riderEarnings.$inferSelect;

export const insertPlatformCommissionSchema = createInsertSchema(platformCommissions).omit({ id: true, createdAt: true, collectedAt: true });
export type InsertPlatformCommission = z.infer<typeof insertPlatformCommissionSchema>;
export type PlatformCommission = typeof platformCommissions.$inferSelect;

// ==================== FUTURE: TRANSPORT & FLIGHTS BASE ====================
// These interfaces define the future data model for transport and flight verticals.
// Not yet in DB — will be added when those modules are built.

export type TransportCompanyStatus = "active" | "inactive" | "pending";
export type FlightStatus = "scheduled" | "boarding" | "departed" | "arrived" | "cancelled" | "delayed";
export type BookingStatus = "pending" | "confirmed" | "cancelled" | "refunded";
export type TripStatus = "scheduled" | "in_progress" | "completed" | "cancelled";
export type TicketClass = "economy" | "business" | "first";
export type TransportMode = "bus" | "minibus" | "van" | "taxi";

export interface FutureTransportCompany {
  id: string;
  name: string;
  logo: string | null;
  mode: TransportMode;
  provinciaId: string;
  ciudadId: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  status: TransportCompanyStatus;
  createdAt: Date;
}

export interface FutureRoute {
  id: string;
  transportCompanyId: string;
  originCity: string;
  originProvince: string;
  destinationCity: string;
  destinationProvince: string;
  distanceKm: number | null;
  estimatedDurationMinutes: number | null;
  isActive: boolean;
}

export interface FutureTrip {
  id: string;
  routeId: string;
  transportCompanyId: string;
  departureAt: Date;
  arrivalAt: Date;
  price: number;
  availableSeats: number;
  totalSeats: number;
  status: TripStatus;
  vehiclePlate: string | null;
}

export interface FutureTicket {
  id: string;
  tripId: string;
  customerId: string;
  seatNumber: string | null;
  price: number;
  status: BookingStatus;
  paymentIntentId: string | null;
  createdAt: Date;
}

export interface FutureAirline {
  id: string;
  name: string;
  code: string;
  logo: string | null;
  contactEmail: string | null;
  isActive: boolean;
}

export interface FutureFlight {
  id: string;
  airlineId: string;
  flightNumber: string;
  originIata: string;
  destinationIata: string;
  departureAt: Date;
  arrivalAt: Date;
  priceEconomy: number;
  priceBusiness: number | null;
  availableSeatsEconomy: number;
  availableSeatsBusiness: number | null;
  status: FlightStatus;
}

// ─── TRAVEL BOOKINGS (Bus + Flights) ─────────────────────────────────────────

export const travelBookings = pgTable("travel_bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").$type<"bus" | "flight">().notNull(),
  companyId: text("company_id").notNull(),
  companyName: text("company_name").notNull(),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  travelDate: text("travel_date").notNull(),
  departureTime: text("departure_time").notNull(),
  arrivalTime: text("arrival_time").notNull(),
  duration: text("duration").notNull(),
  price: integer("price").notNull(),
  seats: integer("seats").notNull().default(1),
  status: text("status").$type<"confirmed" | "cancelled">().notNull().default("confirmed"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTravelBookingSchema = createInsertSchema(travelBookings).omit({ id: true, createdAt: true });
export type InsertTravelBooking = z.infer<typeof insertTravelBookingSchema>;
export type TravelBooking = typeof travelBookings.$inferSelect;

// ─── DISPUTES / RETURNS ───────────────────────────────────────────────────────

export const disputes = pgTable("disputes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").$type<DisputeType>().notNull(),
  description: text("description").notNull(),
  status: text("status").$type<DisputeStatus>().notNull().default("pending"),
  resolution: text("resolution"),
  adminId: varchar("admin_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDisputeSchema = createInsertSchema(disputes).omit({ id: true, createdAt: true, updatedAt: true, status: true, resolution: true, adminId: true });
export type InsertDispute = z.infer<typeof insertDisputeSchema>;
export type Dispute = typeof disputes.$inferSelect;

export type FavoriteType = "product" | "store";

export const favorites = pgTable("favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  targetId: varchar("target_id").notNull(),
  type: text("type").$type<FavoriteType>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFavoriteSchema = createInsertSchema(favorites).omit({ id: true, createdAt: true });
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type Favorite = typeof favorites.$inferSelect;

// ─── STORE FOLLOWS ────────────────────────────────────────────────────────────

export const storeFollows = pgTable("store_follows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  storeId: varchar("store_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertStoreFollowSchema = createInsertSchema(storeFollows).omit({ id: true, createdAt: true });
export type InsertStoreFollow = z.infer<typeof insertStoreFollowSchema>;
export type StoreFollow = typeof storeFollows.$inferSelect;

export interface FutureFlightBooking {
  id: string;
  flightId: string;
  customerId: string;
  ticketClass: TicketClass;
  price: number;
  status: BookingStatus;
  passengerName: string;
  passengerDni: string;
  seatNumber: string | null;
  paymentIntentId: string | null;
  createdAt: Date;
}

// ─── SHOPPABLE VIDEOS ────────────────────────────────────────────────────────

export type VideoStatus = "draft" | "pending" | "approved" | "rejected" | "published";
export type VideoContentType = "product" | "store" | "promo";

export const shoppableVideos = pgTable("shoppable_videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull(),
  storeId: varchar("store_id").notNull(),
  productId: varchar("product_id"),
  title: text("title").notNull(),
  description: text("description"),
  tags: text("tags"),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  contentType: text("content_type").$type<VideoContentType>().notNull().default("product"),
  status: text("status").$type<VideoStatus>().notNull().default("draft"),
  isFeatured: boolean("is_featured").notNull().default(false),
  isSponsored: boolean("is_sponsored").notNull().default(false),
  viewsCount: integer("views_count").notNull().default(0),
  clicksCount: integer("clicks_count").notNull().default(0),
  addToCartCount: integer("add_to_cart_count").notNull().default(0),
  purchasesCount: integer("purchases_count").notNull().default(0),
  savesCount: integer("saves_count").notNull().default(0),
  targetProvince: text("target_province"),
  targetCity: text("target_city"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  publishedAt: timestamp("published_at"),
});

export const insertShoppableVideoSchema = createInsertSchema(shoppableVideos).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertShoppableVideo = z.infer<typeof insertShoppableVideoSchema>;
export type ShoppableVideo = typeof shoppableVideos.$inferSelect;

export const siteSettings = pgTable("site_settings", {
  key: varchar("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export interface VideoFeedItem extends ShoppableVideo {
  store?: { id: string; name: string; category: string; rating: string | null; lat: string | null; lng: string | null; followersCount?: number; isFollowing?: boolean };
  product?: { id: string; name: string; price: string; image: string | null; originalPrice: string | null };
}

// ─── NOVEDADES VERIFICADAS ────────────────────────────────────────────────────

export type PublicEntityType = "municipality" | "province" | "ministry" | "secretaria" | "organism";
export type PublicEntityVerificationStatus = "pending" | "verified" | "rejected" | "suspended" | "renewal_pending";
export type NovedadEmitterType = "municipality" | "province" | "ministry" | "secretaria" | "organism" | "store" | "brand" | "company";
export type NovedadCategory = "health" | "tourism" | "culture" | "events" | "education" | "environment" | "fashion" | "launch" | "promo" | "news" | "campaign" | "other";
export type NovedadContentType = "card" | "campaign" | "event" | "tourism" | "news" | "season" | "launch" | "reel";
export type NovedadStatus = "draft" | "active" | "archived" | "expired";

export const publicEntities = pgTable("public_entities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  entityType: text("entity_type").$type<PublicEntityType>().notNull().default("municipality"),
  logo: text("logo"),
  banner: text("banner"),
  description: text("description"),
  provinciaId: text("provincia_id"),
  municipioName: text("municipio_name"),
  address: text("address"),
  institutionalEmail: text("institutional_email"),
  phone: text("phone"),
  website: text("website"),
  facebook: text("facebook"),
  instagram: text("instagram"),
  twitter: text("twitter"),
  tiktok: text("tiktok"),
  youtube: text("youtube"),
  responsibleName: text("responsible_name"),
  responsibleTitle: text("responsible_title"),
  verificationStatus: text("verification_status").$type<PublicEntityVerificationStatus>().notNull().default("pending"),
  verificationNote: text("verification_note"),
  mandateStartDate: timestamp("mandate_start_date"),
  mandateEndDate: timestamp("mandate_end_date"),
  userId: varchar("user_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: varchar("verified_by"),
});

export const secretarias = pgTable("secretarias", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityId: varchar("entity_id").notNull(),
  name: text("name").notNull(),
  area: text("area"),
  description: text("description"),
  logo: text("logo"),
  userId: varchar("user_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Secretaria = typeof secretarias.$inferSelect;
export type InsertSecretaria = typeof secretarias.$inferInsert;

export const novedades = pgTable("novedades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  emitterType: text("emitter_type").$type<NovedadEmitterType>().notNull().default("store"),
  emitterName: text("emitter_name").notNull(),
  emitterLogo: text("emitter_logo"),
  isOfficial: boolean("is_official").notNull().default(false),
  publicEntityId: varchar("public_entity_id"),
  storeId: varchar("store_id"),
  title: text("title").notNull(),
  summary: text("summary"),
  description: text("description"),
  image: text("image"),
  videoUrl: text("video_url"),
  contentType: text("content_type").$type<NovedadContentType>().notNull().default("card"),
  category: text("category").$type<NovedadCategory>().notNull().default("news"),
  link: text("link"),
  provinciaId: text("provincia_id"),
  municipioName: text("municipio_name"),
  status: text("status").$type<NovedadStatus>().notNull().default("active"),
  isFeatured: boolean("is_featured").notNull().default(false),
  priority: integer("priority").notNull().default(0),
  startsAt: timestamp("starts_at").defaultNow(),
  endsAt: timestamp("ends_at"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by"),
  secretariaId: varchar("secretaria_id"),
});

export const insertPublicEntitySchema = createInsertSchema(publicEntities).omit({ id: true, createdAt: true, verifiedAt: true, verifiedBy: true });
export type InsertPublicEntity = z.infer<typeof insertPublicEntitySchema>;
export type PublicEntity = typeof publicEntities.$inferSelect;

export const insertNovedadSchema = createInsertSchema(novedades).omit({ id: true, createdAt: true });
export type InsertNovedad = z.infer<typeof insertNovedadSchema>;
export type Novedad = typeof novedades.$inferSelect;
