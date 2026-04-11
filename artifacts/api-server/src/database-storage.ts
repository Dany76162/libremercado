import { eq, and, or, desc, sql, isNull, lte, ilike, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import {
  users, stores, products, orders, orderItems, promos,
  travelOffers, kycDocuments, subscriptionPlans, merchantApplications,
  riderProfiles, riderEarnings, platformCommissions, adBillings, reviews, notifications, travelBookings, disputes, favorites,
  shoppableVideos, storeFollows, siteSettings,
} from "@workspace/db";
import type {
  User, InsertUser,
  Store, InsertStore,
  Product, InsertProduct,
  Order, InsertOrder,
  OrderItem, InsertOrderItem,
  Promo, InsertPromo,
  TravelOffer, InsertTravelOffer,
  KycDocument, InsertKycDocument,
  KycStatus,
  SubscriptionPlan, InsertSubscriptionPlan,
  MerchantApplication, InsertMerchantApplication,
  RiderProfile, InsertRiderProfile,
  RiderEarning, InsertRiderEarning,
  PlatformCommission, InsertPlatformCommission,
  CommissionStatus,
  AdBilling, InsertAdBilling,
  MerchantApplicationStatus,
  RiderStatus,
  PromoCommercialStatus,
  Review, InsertReview,
  Notification, InsertNotification,
  TravelBooking, InsertTravelBooking,
  Dispute, InsertDispute, DisputeStatus,
  Favorite, InsertFavorite, FavoriteType,
  ShoppableVideo, InsertShoppableVideo, VideoStatus,
} from "@workspace/db";
import type { IStorage } from "./storage";

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export class DatabaseStorage implements IStorage {

  // ─── USERS ────────────────────────────────────────────────────────────────

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUsers(): Promise<User[]> {
    return db.select().from(users);
  }
  async getUsersByRole(role: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, role as any));
  }
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }
  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  // ─── STORES ───────────────────────────────────────────────────────────────

  async getStores(): Promise<Store[]> {
    return db.select().from(stores);
  }
  async getStore(id: string): Promise<Store | undefined> {
    const [store] = await db.select().from(stores).where(eq(stores.id, id));
    return store;
  }
  async getStoresByOwner(ownerId: string): Promise<Store[]> {
    return db.select().from(stores).where(eq(stores.ownerId, ownerId));
  }
  async createStore(store: InsertStore): Promise<Store> {
    const [created] = await db.insert(stores).values(store).returning();
    return created;
  }
  async updateStore(id: string, data: Partial<InsertStore>): Promise<Store | undefined> {
    const [updated] = await db.update(stores).set(data).where(eq(stores.id, id)).returning();
    return updated;
  }
  async deleteStore(id: string): Promise<boolean> {
    const result = await db.delete(stores).where(eq(stores.id, id));
    return (result.rowCount ?? 0) > 0;
  }
  async getFeaturedStores(): Promise<Store[]> {
    return db.select().from(stores).where(and(
      eq(stores.isActive, true),
      eq(stores.isFeatured, true),
    ));
  }
  async updateStoreFeatured(id: string, isFeatured: boolean, featuredUntil?: Date | null, featuredScore?: number): Promise<Store | undefined> {
    const [updated] = await db.update(stores).set({
      isFeatured,
      featuredUntil: featuredUntil ?? null,
      featuredScore: featuredScore ?? 0,
    }).where(eq(stores.id, id)).returning();
    return updated;
  }

  // ─── PRODUCTS ─────────────────────────────────────────────────────────────

  async getProducts(): Promise<Product[]> {
    return db.select().from(products);
  }
  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }
  async getProductsByStore(storeId: string): Promise<Product[]> {
    return db.select().from(products).where(eq(products.storeId, storeId));
  }
  async getFeaturedProducts(): Promise<Product[]> {
    const sponsored = await db.select().from(products)
      .where(and(eq(products.isActive, true), eq(products.isSponsored, true)))
      .orderBy(desc(products.sponsoredPriority))
      .limit(20);
    if (sponsored.length > 0) return sponsored;
    // Fallback: return regular active products if no sponsored ones exist
    return db.select().from(products).where(eq(products.isActive, true)).limit(20);
  }
  async createProduct(product: InsertProduct): Promise<Product> {
    const [created] = await db.insert(products).values(product).returning();
    return created;
  }
  async updateProduct(id: string, data: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updated] = await db.update(products).set(data).where(eq(products.id, id)).returning();
    return updated;
  }
  async deleteProduct(id: string): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id));
    return (result.rowCount ?? 0) > 0;
  }
  async updateProductSponsored(id: string, isSponsored: boolean, sponsoredUntil?: Date | null, sponsoredPriority?: number): Promise<Product | undefined> {
    const [updated] = await db.update(products).set({
      isSponsored,
      sponsoredUntil: sponsoredUntil ?? null,
      sponsoredPriority: sponsoredPriority ?? 0,
    }).where(eq(products.id, id)).returning();
    return updated;
  }

  // ─── ORDERS ───────────────────────────────────────────────────────────────

  async getOrders(): Promise<Order[]> {
    return db.select().from(orders).orderBy(desc(orders.id));
  }
  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }
  async getOrdersByCustomer(customerId: string): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.customerId, customerId)).orderBy(desc(orders.id));
  }
  async getOrdersByStore(storeId: string): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.storeId, storeId)).orderBy(desc(orders.id));
  }
  async getOrdersByRider(riderId: string): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.riderId, riderId)).orderBy(desc(orders.id));
  }
  async getAvailableOrders(): Promise<Order[]> {
    return db.select().from(orders).where(
      and(eq(orders.status, "ready"), isNull(orders.riderId))
    );
  }
  async createOrder(order: InsertOrder): Promise<Order> {
    const [created] = await db.insert(orders).values(order).returning();
    return created;
  }
  async updateOrder(id: string, data: Partial<InsertOrder>): Promise<Order | undefined> {
    const [updated] = await db.update(orders).set(data).where(eq(orders.id, id)).returning();
    return updated;
  }

  // ─── ORDER ITEMS ──────────────────────────────────────────────────────────

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }
  async createOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    const [created] = await db.insert(orderItems).values(item).returning();
    return created;
  }

  // ─── PROMOS ───────────────────────────────────────────────────────────────

  async getPromos(): Promise<Promo[]> {
    return db.select().from(promos).orderBy(desc(promos.priority));
  }
  async getPromoBanners(): Promise<Promo[]> {
    return db.select().from(promos).where(
      and(eq(promos.type, "banner"), eq(promos.isActive, true))
    ).orderBy(desc(promos.priority));
  }
  async getPromoNotices(): Promise<Promo[]> {
    return db.select().from(promos).where(
      and(eq(promos.type, "notice"), eq(promos.isActive, true))
    ).orderBy(desc(promos.priority));
  }
  async getPromoCategories(): Promise<Promo[]> {
    return db.select().from(promos).where(
      and(eq(promos.type, "category"), eq(promos.isActive, true))
    ).orderBy(promos.priority);
  }
  async createPromo(promo: InsertPromo): Promise<Promo> {
    const [created] = await db.insert(promos).values(promo).returning();
    return created;
  }
  async updatePromo(id: string, data: Partial<InsertPromo>): Promise<Promo | undefined> {
    const [updated] = await db.update(promos).set(data).where(eq(promos.id, id)).returning();
    return updated;
  }
  async deletePromo(id: string): Promise<boolean> {
    const result = await db.delete(promos).where(eq(promos.id, id));
    return (result.rowCount ?? 0) > 0;
  }
  async getExpiredPromos(): Promise<Promo[]> {
    const now = new Date();
    const all = await this.getPromos();
    return all.filter(p => p.endDate && new Date(p.endDate) < now && p.isActive);
  }
  async deactivateExpiredPromos(): Promise<number> {
    const expired = await this.getExpiredPromos();
    for (const p of expired) {
      await db.update(promos).set({ isActive: false }).where(eq(promos.id, p.id));
    }
    return expired.length;
  }
  async trackPromoImpression(id: string): Promise<void> {
    const [promo] = await db.select().from(promos).where(eq(promos.id, id));
    if (!promo) return;
    const newImpressions = (promo.impressions ?? 0) + 1;
    const updates: Partial<Promo> = { impressions: newImpressions };
    if (promo.maxImpressions && newImpressions >= promo.maxImpressions) {
      updates.commercialStatus = "completed";
    }
    if (promo.pricingModel === "cpm") {
      updates.spentAmount = String((parseFloat(promo.spentAmount ?? "0") + parseFloat(promo.budget ?? "0") / Math.max(promo.maxImpressions ?? 1000, 1)).toFixed(2));
    }
    await db.update(promos).set(updates).where(eq(promos.id, id));
  }
  async trackPromoClick(id: string): Promise<void> {
    const [promo] = await db.select().from(promos).where(eq(promos.id, id));
    if (!promo) return;
    const newClicks = (promo.clicks ?? 0) + 1;
    const updates: Partial<Promo> = { clicks: newClicks };
    if (promo.maxClicks && newClicks >= promo.maxClicks) {
      updates.commercialStatus = "completed";
    }
    if (promo.pricingModel === "cpc") {
      const cpc = parseFloat(promo.budget ?? "0") / Math.max(promo.maxClicks ?? 100, 1);
      updates.spentAmount = String((parseFloat(promo.spentAmount ?? "0") + cpc).toFixed(2));
    }
    await db.update(promos).set(updates).where(eq(promos.id, id));
  }
  async getPromoBannersByLocation(provinciaId?: string, ciudadId?: string, userLat?: number, userLng?: number): Promise<Promo[]> {
    const all = await this.getPromoBanners();
    return all.filter(p => {
      if (p.targetType === "global") return true;
      if (p.targetType === "province" && p.targetProvince === provinciaId) return true;
      if (p.targetType === "city" && p.targetCity === ciudadId) return true;
      if (p.targetType === "radius" && p.targetLat && p.targetLng && p.targetRadiusKm && userLat && userLng) {
        return haversineKm(userLat, userLng, parseFloat(p.targetLat), parseFloat(p.targetLng)) <= p.targetRadiusKm;
      }
      return false;
    });
  }
  async updatePromoCommercialStatus(id: string, status: PromoCommercialStatus): Promise<Promo | undefined> {
    const [updated] = await db.update(promos).set({ commercialStatus: status }).where(eq(promos.id, id)).returning();
    return updated;
  }

  // ─── TRAVEL OFFERS ────────────────────────────────────────────────────────

  async getTravelOffers(): Promise<TravelOffer[]> {
    return db.select().from(travelOffers).where(eq(travelOffers.isActive, true)).orderBy(desc(travelOffers.priority));
  }
  async createTravelOffer(offer: InsertTravelOffer): Promise<TravelOffer> {
    const [created] = await db.insert(travelOffers).values(offer).returning();
    return created;
  }
  async updateTravelOffer(id: string, data: Partial<InsertTravelOffer>): Promise<TravelOffer | undefined> {
    const [updated] = await db.update(travelOffers).set(data).where(eq(travelOffers.id, id)).returning();
    return updated;
  }
  async deleteTravelOffer(id: string): Promise<boolean> {
    const result = await db.delete(travelOffers).where(eq(travelOffers.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // ─── KYC ─────────────────────────────────────────────────────────────────

  async getKycDocuments(userId: string): Promise<KycDocument[]> {
    return db.select().from(kycDocuments).where(eq(kycDocuments.userId, userId));
  }
  async getKycDocument(id: string): Promise<KycDocument | undefined> {
    const [doc] = await db.select().from(kycDocuments).where(eq(kycDocuments.id, id));
    return doc;
  }
  async getPendingKycDocuments(): Promise<KycDocument[]> {
    return db.select().from(kycDocuments).where(eq(kycDocuments.status, "pending"));
  }
  async createKycDocument(doc: InsertKycDocument): Promise<KycDocument> {
    const [created] = await db.insert(kycDocuments).values(doc).returning();
    return created;
  }
  async updateKycDocument(id: string, data: Partial<KycDocument>): Promise<KycDocument | undefined> {
    const [updated] = await db.update(kycDocuments).set(data).where(eq(kycDocuments.id, id)).returning();
    return updated;
  }
  async updateUserKycStatus(userId: string, status: KycStatus): Promise<User | undefined> {
    const [updated] = await db.update(users).set({ kycStatus: status }).where(eq(users.id, userId)).returning();
    return updated;
  }

  // ─── SUBSCRIPTION PLANS ───────────────────────────────────────────────────

  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true));
  }
  async getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id));
    return plan;
  }
  async createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    const [created] = await db.insert(subscriptionPlans).values(plan).returning();
    return created;
  }

  // ─── MERCHANT APPLICATIONS ────────────────────────────────────────────────

  async getMerchantApplications(): Promise<MerchantApplication[]> {
    return db.select().from(merchantApplications).orderBy(desc(merchantApplications.createdAt));
  }
  async getMerchantApplication(id: string): Promise<MerchantApplication | undefined> {
    const [app] = await db.select().from(merchantApplications).where(eq(merchantApplications.id, id));
    return app;
  }
  async getMerchantApplicationByUser(userId: string): Promise<MerchantApplication | undefined> {
    const [app] = await db.select().from(merchantApplications).where(eq(merchantApplications.userId, userId));
    return app;
  }
  async getPendingMerchantApplications(): Promise<MerchantApplication[]> {
    return db.select().from(merchantApplications).where(eq(merchantApplications.status, "pending"));
  }
  async createMerchantApplication(app: InsertMerchantApplication): Promise<MerchantApplication> {
    const [created] = await db.insert(merchantApplications).values(app).returning();
    return created;
  }
  async updateMerchantApplication(id: string, data: Partial<MerchantApplication>): Promise<MerchantApplication | undefined> {
    const [updated] = await db.update(merchantApplications).set(data).where(eq(merchantApplications.id, id)).returning();
    return updated;
  }

  // ─── RIDER PROFILES ───────────────────────────────────────────────────────

  async getRiderProfile(userId: string): Promise<RiderProfile | undefined> {
    const [profile] = await db.select().from(riderProfiles).where(eq(riderProfiles.userId, userId));
    return profile;
  }
  async getRiderProfiles(): Promise<RiderProfile[]> {
    return db.select().from(riderProfiles);
  }
  async getAvailableRiders(): Promise<RiderProfile[]> {
    return db.select().from(riderProfiles).where(
      and(eq(riderProfiles.isAvailable, true), eq(riderProfiles.status, "active"))
    );
  }
  async createRiderProfile(profile: InsertRiderProfile): Promise<RiderProfile> {
    const [created] = await db.insert(riderProfiles).values(profile).returning();
    return created;
  }
  async updateRiderProfile(userId: string, data: Partial<RiderProfile>): Promise<RiderProfile | undefined> {
    const [updated] = await db.update(riderProfiles).set(data).where(eq(riderProfiles.userId, userId)).returning();
    return updated;
  }

  // ─── RIDER EARNINGS ───────────────────────────────────────────────────────

  async getRiderEarnings(riderId: string): Promise<RiderEarning[]> {
    return db.select().from(riderEarnings).where(eq(riderEarnings.riderId, riderId)).orderBy(desc(riderEarnings.createdAt));
  }
  async createRiderEarning(earning: InsertRiderEarning): Promise<RiderEarning> {
    const [created] = await db.insert(riderEarnings).values(earning).returning();
    return created;
  }
  async updateRiderEarning(id: string, data: Partial<RiderEarning>): Promise<RiderEarning | undefined> {
    const [updated] = await db.update(riderEarnings).set(data).where(eq(riderEarnings.id, id)).returning();
    return updated;
  }

  // ─── PLATFORM COMMISSIONS ─────────────────────────────────────────────────

  async getPlatformCommissions(): Promise<PlatformCommission[]> {
    return db.select().from(platformCommissions).orderBy(desc(platformCommissions.createdAt));
  }
  async getPlatformCommissionsByStore(storeId: string): Promise<PlatformCommission[]> {
    return db.select().from(platformCommissions).where(eq(platformCommissions.storeId, storeId));
  }
  async createPlatformCommission(commission: InsertPlatformCommission): Promise<PlatformCommission> {
    const [created] = await db.insert(platformCommissions).values(commission).returning();
    return created;
  }
  async updatePlatformCommission(id: string, data: Partial<PlatformCommission>): Promise<PlatformCommission | undefined> {
    const [updated] = await db.update(platformCommissions).set(data).where(eq(platformCommissions.id, id)).returning();
    return updated;
  }

  // ─── AD BILLINGS ──────────────────────────────────────────────────────────

  async getAdBillings(): Promise<AdBilling[]> {
    return db.select().from(adBillings).orderBy(desc(adBillings.createdAt));
  }
  async getAdBillingsByPromo(promoId: string): Promise<AdBilling[]> {
    return db.select().from(adBillings).where(eq(adBillings.promoId, promoId));
  }
  async createAdBilling(billing: InsertAdBilling): Promise<AdBilling> {
    const [created] = await db.insert(adBillings).values(billing).returning();
    return created;
  }
  async updateAdBilling(id: string, data: Partial<AdBilling>): Promise<AdBilling | undefined> {
    const [updated] = await db.update(adBillings).set(data).where(eq(adBillings.id, id)).returning();
    return updated;
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [created] = await db.insert(reviews).values(review).returning();
    return created;
  }

  async getReviewsByStore(storeId: string): Promise<Review[]> {
    return db.select().from(reviews).where(eq(reviews.storeId, storeId)).orderBy(desc(reviews.createdAt));
  }

  async getReviewByOrderAndUser(orderId: string, userId: string): Promise<Review | undefined> {
    const [review] = await db.select().from(reviews).where(
      and(eq(reviews.orderId, orderId), eq(reviews.userId, userId))
    );
    return review;
  }

  async getReviewByStoreAndUser(storeId: string, userId: string): Promise<Review | undefined> {
    const [review] = await db.select().from(reviews).where(
      and(eq(reviews.storeId, storeId), eq(reviews.userId, userId))
    );
    return review;
  }

  async getAverageRating(storeId: string): Promise<number> {
    const [result] = await db.select({ avg: sql<string>`AVG(${reviews.rating})` }).from(reviews).where(eq(reviews.storeId, storeId));
    return result?.avg ? parseFloat(result.avg) : 0;
  }

  async searchProducts(q: string, category?: string, limit = 20): Promise<Product[]> {
    const pattern = `%${q}%`;
    const baseWhere = and(
      eq(products.isActive, true),
      or(ilike(products.name, pattern), ilike(products.description, pattern))
    );
    const where = category && category !== "all"
      ? and(baseWhere, ilike(products.category, category))
      : baseWhere;
    return db.select().from(products).where(where).limit(limit);
  }

  async searchStores(q: string, category?: string, limit = 10): Promise<Store[]> {
    const pattern = `%${q}%`;
    const baseWhere = and(
      eq(stores.isActive, true),
      or(ilike(stores.name, pattern), ilike(stores.description, pattern))
    );
    const where = category && category !== "all"
      ? and(baseWhere, ilike(stores.category, category))
      : baseWhere;
    return db.select().from(stores).where(where).limit(limit);
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values({ ...notification, isRead: false }).returning();
    return created;
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(50);
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const [result] = await db.select({ count: sql<number>`COUNT(*)` }).from(notifications).where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    );
    return Number(result?.count ?? 0);
  }

  async markNotificationRead(id: string, userId: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(
      and(eq(notifications.id, id), eq(notifications.userId, userId))
    );
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    );
  }

  async createTravelBooking(booking: InsertTravelBooking): Promise<TravelBooking> {
    const [created] = await db.insert(travelBookings).values(booking).returning();
    return created;
  }

  async getTravelBookingsByUser(userId: string): Promise<TravelBooking[]> {
    return db.select().from(travelBookings)
      .where(eq(travelBookings.userId, userId))
      .orderBy(desc(travelBookings.createdAt));
  }

  async createDispute(dispute: InsertDispute): Promise<Dispute> {
    const [created] = await db.insert(disputes).values({
      ...dispute, status: "pending", resolution: null, adminId: null,
    }).returning();
    return created;
  }

  async getDisputesByUser(userId: string): Promise<Dispute[]> {
    return db.select().from(disputes).where(eq(disputes.userId, userId)).orderBy(desc(disputes.createdAt));
  }

  async getDisputeByOrder(orderId: string): Promise<Dispute | undefined> {
    const [d] = await db.select().from(disputes).where(eq(disputes.orderId, orderId));
    return d;
  }

  async getAllDisputes(): Promise<Dispute[]> {
    return db.select().from(disputes).orderBy(desc(disputes.createdAt));
  }

  async updateDisputeStatus(id: string, status: DisputeStatus, resolution?: string, adminId?: string): Promise<Dispute> {
    const [updated] = await db.update(disputes)
      .set({ status, resolution: resolution ?? null, adminId: adminId ?? null, updatedAt: new Date() })
      .where(eq(disputes.id, id))
      .returning();
    return updated;
  }

  async getFavoritesByUser(userId: string, type?: FavoriteType): Promise<Favorite[]> {
    const conds = type
      ? and(eq(favorites.userId, userId), eq(favorites.type, type))
      : eq(favorites.userId, userId);
    return db.select().from(favorites).where(conds).orderBy(desc(favorites.createdAt));
  }

  async addFavorite(data: InsertFavorite): Promise<Favorite> {
    const existing = await db.select().from(favorites)
      .where(and(eq(favorites.userId, data.userId), eq(favorites.targetId, data.targetId), eq(favorites.type, data.type)))
      .limit(1);
    if (existing.length > 0) return existing[0];
    const [row] = await db.insert(favorites).values(data).returning();
    return row;
  }

  async removeFavorite(userId: string, targetId: string, type: FavoriteType): Promise<boolean> {
    const result = await db.delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.targetId, targetId), eq(favorites.type, type)));
    return (result.rowCount ?? 0) > 0;
  }

  async isFavorite(userId: string, targetId: string, type: FavoriteType): Promise<boolean> {
    const rows = await db.select({ id: favorites.id }).from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.targetId, targetId), eq(favorites.type, type)))
      .limit(1);
    return rows.length > 0;
  }

  async setPasswordResetToken(userId: string, token: string, expiry: Date): Promise<void> {
    await db.update(users).set({ passwordResetToken: token, passwordResetExpiry: expiry }).where(eq(users.id, userId));
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [row] = await db.select().from(users)
      .where(and(eq(users.passwordResetToken, token), gt(users.passwordResetExpiry, new Date())))
      .limit(1);
    return row;
  }

  async clearPasswordResetToken(userId: string): Promise<void> {
    await db.update(users).set({ passwordResetToken: null, passwordResetExpiry: null }).where(eq(users.id, userId));
  }

  // ─── SHOPPABLE VIDEOS ───────────────────────────────────────────────────────

  async getVideoFeed(params: {
    provinciaId?: string;
    ciudadId?: string;
    storeId?: string;
    productId?: string;
    limit?: number;
    offset?: number;
    userId?: string;
  }): Promise<ShoppableVideo[]> {
    const { provinciaId, ciudadId, storeId, productId, limit = 10, offset = 0, userId } = params;
    const conditions: any[] = [eq(shoppableVideos.status, "published")];

    if (storeId) {
      conditions.push(eq(shoppableVideos.storeId, storeId));
    }
    if (productId) {
      conditions.push(eq(shoppableVideos.productId, productId));
    }
    if (!storeId && !productId) {
      if (ciudadId) {
        conditions.push(or(isNull(shoppableVideos.targetCity), eq(shoppableVideos.targetCity, ciudadId)));
      } else if (provinciaId) {
        conditions.push(or(isNull(shoppableVideos.targetProvince), eq(shoppableVideos.targetProvince, provinciaId)));
      }
    }

    const rows = await db.select().from(shoppableVideos)
      .where(and(...conditions))
      .orderBy(desc(shoppableVideos.publishedAt))
      .limit(storeId || productId ? limit : 100);

    if (storeId || productId) {
      return rows;
    }

    if (!userId || rows.length === 0) {
      const sorted = [...rows].sort((a, b) => {
        if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
        if (a.isSponsored !== b.isSponsored) return a.isSponsored ? -1 : 1;
        return (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0);
      });
      return sorted.slice(offset, offset + limit);
    }

    const followedIds = await this.getFollowedStoreIds(userId);
    const followedSet = new Set(followedIds);

    const sorted = [...rows].sort((a, b) => {
      const aFollowed = a.storeId && followedSet.has(a.storeId) ? 0 : 1;
      const bFollowed = b.storeId && followedSet.has(b.storeId) ? 0 : 1;
      if (aFollowed !== bFollowed) return aFollowed - bFollowed;
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      if (a.isSponsored !== b.isSponsored) return a.isSponsored ? -1 : 1;
      return (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0);
    });

    return sorted.slice(offset, offset + limit);
  }

  async followStore(userId: string, storeId: string): Promise<void> {
    const existing = await db.select().from(storeFollows)
      .where(and(eq(storeFollows.userId, userId), eq(storeFollows.storeId, storeId)))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(storeFollows).values({ userId, storeId });
    }
  }

  async unfollowStore(userId: string, storeId: string): Promise<void> {
    await db.delete(storeFollows)
      .where(and(eq(storeFollows.userId, userId), eq(storeFollows.storeId, storeId)));
  }

  async isFollowingStore(userId: string, storeId: string): Promise<boolean> {
    const [row] = await db.select().from(storeFollows)
      .where(and(eq(storeFollows.userId, userId), eq(storeFollows.storeId, storeId)))
      .limit(1);
    return !!row;
  }

  async getStoreFollowersCount(storeId: string): Promise<number> {
    const [row] = await db.select({ count: sql<number>`count(*)` })
      .from(storeFollows)
      .where(eq(storeFollows.storeId, storeId));
    return Number(row?.count ?? 0);
  }

  async getFollowedStoreIds(userId: string): Promise<string[]> {
    const rows = await db.select({ storeId: storeFollows.storeId })
      .from(storeFollows)
      .where(eq(storeFollows.userId, userId));
    return rows.map(r => r.storeId);
  }

  async getVideosByMerchant(merchantId: string): Promise<ShoppableVideo[]> {
    return db.select().from(shoppableVideos)
      .where(eq(shoppableVideos.merchantId, merchantId))
      .orderBy(desc(shoppableVideos.createdAt));
  }

  async getVideo(id: string): Promise<ShoppableVideo | undefined> {
    const [row] = await db.select().from(shoppableVideos).where(eq(shoppableVideos.id, id));
    return row;
  }

  async createVideo(data: InsertShoppableVideo): Promise<ShoppableVideo> {
    const [row] = await db.insert(shoppableVideos).values(data).returning();
    return row;
  }

  async updateVideo(id: string, data: Partial<InsertShoppableVideo>): Promise<ShoppableVideo | undefined> {
    const [row] = await db.update(shoppableVideos)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(shoppableVideos.id, id))
      .returning();
    return row;
  }

  async deleteVideo(id: string): Promise<boolean> {
    const result = await db.delete(shoppableVideos).where(eq(shoppableVideos.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async trackVideoView(id: string): Promise<void> {
    await db.update(shoppableVideos)
      .set({ viewsCount: sql`${shoppableVideos.viewsCount} + 1` })
      .where(eq(shoppableVideos.id, id));
  }

  async trackVideoAddToCart(id: string): Promise<void> {
    await db.update(shoppableVideos)
      .set({ addToCartCount: sql`${shoppableVideos.addToCartCount} + 1` })
      .where(eq(shoppableVideos.id, id));
  }

  async getAllVideosForAdmin(status?: VideoStatus): Promise<ShoppableVideo[]> {
    if (status) {
      return db.select().from(shoppableVideos)
        .where(eq(shoppableVideos.status, status))
        .orderBy(desc(shoppableVideos.createdAt));
    }
    return db.select().from(shoppableVideos)
      .orderBy(desc(shoppableVideos.createdAt));
  }

  async getSiteSetting(key: string): Promise<string | null> {
    const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
    return row?.value ?? null;
  }

  async getAllSiteSettings(): Promise<Record<string, string>> {
    const rows = await db.select().from(siteSettings);
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  async setSiteSetting(key: string, value: string): Promise<void> {
    await db.insert(siteSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: new Date() } });
  }

  async getDiscountedProducts(category?: string, limitN = 8): Promise<Product[]> {
    const where = and(
      eq(products.isActive, true),
      gt(products.stock, 0),
      sql`${products.originalPrice} IS NOT NULL AND ${products.originalPrice} > ${products.price}`
    );
    const filtered = category && category !== "all"
      ? and(where, ilike(products.category, `%${category}%`))
      : where;
    return db.select().from(products)
      .where(filtered)
      .orderBy(sql`(${products.originalPrice}::numeric - ${products.price}::numeric) / ${products.originalPrice}::numeric DESC`)
      .limit(limitN);
  }
}

// ─── SEED ──────────────────────────────────────────────────────────────────

export async function seedIfEmpty() {
  const existing = await db.select().from(users).limit(1);
  if (existing.length > 0) return;

  console.log("[db] Seeding initial data...");

  // Admin users
  await db.insert(users).values([
    {
      id: "admin-principal",
      username: "admin",
      email: "admin@pachapay.com",
      password: bcrypt.hashSync("admin123", 10),
      role: "admin",
      termsAccepted: true,
      termsAcceptedAt: new Date(),
      kycStatus: "approved",
      aiGenerationsUsed: 0,
      locationRadiusKm: 25,
    },
    {
      id: "admin-dany",
      username: "dany76162",
      email: "dany76162@gmail.com",
      password: bcrypt.hashSync("catalina0112192122", 10),
      role: "admin",
      termsAccepted: true,
      termsAcceptedAt: new Date(),
      kycStatus: "approved",
      aiGenerationsUsed: 0,
      locationRadiusKm: 25,
    },
    {
      id: "merchant-user",
      username: "comerciante1",
      email: "comerciante@pachapay.com",
      password: bcrypt.hashSync("comerciante123", 10),
      role: "merchant",
      termsAccepted: true,
      termsAcceptedAt: new Date(),
      kycStatus: "approved",
      aiGenerationsUsed: 0,
      locationRadiusKm: 25,
    },
  ]).onConflictDoNothing();

  // Subscription plans
  await db.insert(subscriptionPlans).values([
    { id: "plan-free", tier: "free", name: "Starter", monthlyFee: "0", productLimit: 10, commissionPercent: "7.00", features: "Hasta 10 productos, Soporte básico, 1 generación de IA gratis, Comisión 7% por venta", isActive: true },
    { id: "plan-basic", tier: "basic", name: "Básico", monthlyFee: "25000", productLimit: 50, commissionPercent: "3.00", features: "Hasta 50 productos, Soporte prioritario, Estadísticas básicas, Generaciones de IA ilimitadas, Comisión 3% por venta", isActive: true },
    { id: "plan-premium", tier: "premium", name: "Pro", monthlyFee: "50000", productLimit: 999, commissionPercent: "1.00", features: "Productos ilimitados, Soporte 24/7, Estadísticas avanzadas, Destacado en búsquedas, Generaciones de IA ilimitadas, Comisión 1% por venta", isActive: true },
  ]).onConflictDoNothing();

  // Stores
  await db.insert(stores).values([
    { id: "store-1", ownerId: "merchant-user", name: "Super Mercado Central", description: "Tu supermercado de confianza con los mejores precios y productos frescos todos los días.", category: "Supermercado", rating: "4.5", isActive: true, subscriptionTier: "premium", address: "Av. Rivadavia 4500", provinciaId: "buenos-aires", ciudadId: "caba", lat: "-34.6095", lng: "-58.4200", phone: "+54 11 4123-4567", openingHours: "Lun-Sáb 8:00-21:00, Dom 9:00-14:00", isFeatured: false, featuredScore: 0 },
    { id: "store-2", ownerId: "merchant-user", name: "Farmacia Salud", description: "Medicamentos, productos de higiene y cuidado personal con atención profesional.", category: "Farmacia", rating: "4.8", isActive: true, subscriptionTier: "basic", address: "Calle Florida 380", provinciaId: "buenos-aires", ciudadId: "caba", lat: "-34.6037", lng: "-58.3816", phone: "+54 11 4555-6789", openingHours: "Lun-Vie 8:00-20:00, Sáb 9:00-13:00", isFeatured: false, featuredScore: 0 },
    { id: "store-3", ownerId: "merchant-user", name: "Electro Tech", description: "Lo último en tecnología y electrónica. Celulares, computadoras y accesorios.", category: "Electrónica", rating: "4.3", isActive: true, subscriptionTier: "premium", address: "Av. Colón 450", provinciaId: "cordoba", ciudadId: "cordoba-capital", lat: "-31.4201", lng: "-64.1888", phone: "+54 351 4777-8901", openingHours: "Lun-Sáb 10:00-20:00", isFeatured: false, featuredScore: 0 },
    { id: "store-4", ownerId: "merchant-user", name: "Pizzería Don Luigi", description: "Las mejores pizzas artesanales con ingredientes de primera calidad.", category: "Comida", rating: "4.7", isActive: true, subscriptionTier: "basic", address: "Peatonal Córdoba 1500", provinciaId: "santa-fe", ciudadId: "rosario", lat: "-32.9468", lng: "-60.6393", phone: "+54 341 4111-2233", openingHours: "Lun-Dom 11:00-00:00", isFeatured: false, featuredScore: 0 },
    { id: "store-5", ownerId: "merchant-user", name: "Moda Express", description: "Ropa y accesorios de moda para toda la familia a los mejores precios.", category: "Moda", rating: "4.2", isActive: true, subscriptionTier: "free", address: "Av. San Martín 800", provinciaId: "mendoza", ciudadId: "mendoza-capital", lat: "-32.8908", lng: "-68.8272", phone: "+54 261 4333-4455", openingHours: "Lun-Sáb 10:00-19:00", isFeatured: false, featuredScore: 0 },
    { id: "store-6", ownerId: "merchant-user", name: "Pet Shop Amigos", description: "Todo para tu mascota: alimentos, accesorios y productos de cuidado.", category: "Mascotas", rating: "4.6", isActive: true, subscriptionTier: "basic", address: "Av. Belgrano 2100", provinciaId: "buenos-aires", ciudadId: "la-plata", lat: "-34.9215", lng: "-57.9545", phone: "+54 221 4666-7788", openingHours: "Lun-Vie 9:00-19:00, Sáb 10:00-14:00", isFeatured: false, featuredScore: 0 },
  ]).onConflictDoNothing();

  // Products
  await db.insert(products).values([
    { id: "prod-1", storeId: "store-1", name: "Leche Entera 1L", description: "Leche fresca entera de primera calidad", price: "850", category: "Lácteos", stock: 50, isActive: true, isSponsored: false, sponsoredPriority: 0 },
    { id: "prod-2", storeId: "store-1", name: "Pan Lactal", description: "Pan lactal blanco fresco", price: "1200", originalPrice: "1500", category: "Panadería", stock: 30, isActive: true, isSponsored: false, sponsoredPriority: 0 },
    { id: "prod-3", storeId: "store-1", name: "Aceite de Girasol 1.5L", description: "Aceite de girasol premium", price: "2500", originalPrice: "3000", category: "Almacén", stock: 25, isActive: true, isSponsored: false, sponsoredPriority: 0 },
    { id: "prod-4", storeId: "store-2", name: "Ibuprofeno 400mg x20", description: "Analgésico y antiinflamatorio", price: "1800", category: "Medicamentos", stock: 100, isActive: true, isSponsored: false, sponsoredPriority: 0 },
    { id: "prod-5", storeId: "store-2", name: "Vitamina C 500mg x30", description: "Suplemento de vitamina C", price: "2200", category: "Suplementos", stock: 40, isActive: true, isSponsored: false, sponsoredPriority: 0 },
    { id: "prod-6", storeId: "store-3", name: "Auriculares Bluetooth", description: "Auriculares inalámbricos con cancelación de ruido", price: "15000", originalPrice: "20000", category: "Audio", stock: 15, isActive: true, isSponsored: false, sponsoredPriority: 0 },
    { id: "prod-7", storeId: "store-3", name: "Cargador USB-C 20W", description: "Cargador rápido compatible con todos los dispositivos", price: "5500", category: "Accesorios", stock: 35, isActive: true, isSponsored: false, sponsoredPriority: 0 },
    { id: "prod-8", storeId: "store-4", name: "Pizza Muzzarella Grande", description: "Pizza clásica con muzzarella y salsa de tomate", price: "8500", category: "Pizzas", stock: 99, isActive: true, isSponsored: false, sponsoredPriority: 0 },
    { id: "prod-9", storeId: "store-4", name: "Pizza Especial Grande", description: "Pizza con jamón, morrones, aceitunas y huevo", price: "12000", originalPrice: "14000", category: "Pizzas", stock: 99, isActive: true, isSponsored: false, sponsoredPriority: 0 },
    { id: "prod-10", storeId: "store-5", name: "Remera Algodón Básica", description: "Remera de algodón 100% en varios colores", price: "4500", originalPrice: "6000", category: "Remeras", stock: 50, isActive: true, isSponsored: false, sponsoredPriority: 0 },
    { id: "prod-11", storeId: "store-6", name: "Alimento Perro Adulto 15kg", description: "Alimento balanceado premium para perros adultos", price: "25000", originalPrice: "28000", category: "Alimentos", stock: 20, isActive: true, isSponsored: false, sponsoredPriority: 0 },
    { id: "prod-12", storeId: "store-6", name: "Arena Sanitaria 10kg", description: "Arena aglomerante para gatos con control de olores", price: "8000", category: "Higiene", stock: 30, isActive: true, isSponsored: false, sponsoredPriority: 0 },
  ]).onConflictDoNothing();

  const promoBase = { isActive: true, generatedByAi: false, targetType: "global" as const, impressions: 0, clicks: 0, mediaType: "image" as const, placement: "hero_home" as const, pricingModel: "flat" as const, budget: "0", spentAmount: "0", commercialStatus: "active" as const };

  // Promos — use upsert so images are always in sync
  const bannerPromos = [
    {
      ...promoBase,
      id: "promo-1",
      title: "FECHAS DOBLES",
      description: "Hasta 40% OFF y hasta 18 cuotas sin interés en miles de productos",
      image: uImg("1607082348824-0a96f2a4b9da", 1200, 500),
      link: "/explore?filter=ofertas",
      type: "banner" as const,
      advertiser: "PachaPay",
      discount: "40% OFF",
      priority: 10,
    },
    {
      ...promoBase,
      id: "promo-2",
      title: "Envío Gratis en tu primer pedido",
      description: "Registrate y obtené envío gratis en tu primera compra",
      image: uImg("1553062407-98eeb64c6a62", 1200, 500),
      link: "/account",
      type: "banner" as const,
      advertiser: "PachaPay",
      discount: "ENVÍO GRATIS",
      priority: 9,
    },
    {
      ...promoBase,
      id: "promo-video-1",
      title: "Hot Sale PachaPay",
      description: "Los mejores descuentos del año están aquí. No te los pierdas.",
      videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
      mediaType: "video" as const,
      link: "/explore?filter=hotsale",
      type: "banner" as const,
      advertiser: "PachaPay",
      discount: "HASTA 70% OFF",
      priority: 8,
    },
    {
      ...promoBase,
      id: "promo-kirquincho",
      title: "Kirquincho — Tu viaje en bus",
      description: "Comprá tu pasaje online con los mejores precios. Rutas en todo el país.",
      image: uImg("1570125909517-53cb21c89ff2", 1200, 500),
      link: "/explore?filter=viajes",
      type: "banner" as const,
      advertiser: "Kirquincho",
      discount: "RESERVA YA",
      priority: 7,
    },
    {
      ...promoBase,
      id: "promo-jetmart",
      title: "JetMart — Vuelos desde $12.999",
      description: "Comprá tu pasaje aéreo al mejor precio. Salidas desde Buenos Aires, Córdoba y Mendoza.",
      image: uImg("1474302770737-173ee21bab63", 1200, 500),
      link: "/explore?filter=vuelos",
      type: "banner" as const,
      advertiser: "JetMart",
      discount: "DESDE $12.999",
      priority: 6,
    },
    {
      ...promoBase,
      id: "promo-electro",
      title: "Hot Sale Electrodomésticos",
      description: "Heladeras, lavarropas, TV y más con hasta 60% OFF. 24 cuotas sin interés.",
      image: uImg("1518770660439-4636190af475", 1200, 500),
      link: "/explore?category=electronics",
      type: "banner" as const,
      advertiser: "ElectroHogar",
      discount: "HASTA 60% OFF",
      priority: 5,
    },
  ];

  for (const promo of bannerPromos) {
    const existing = await db.select({ id: promos.id }).from(promos).where(eq(promos.id, promo.id));
    if (existing.length > 0) {
      await db.update(promos).set({
        title: promo.title,
        description: promo.description,
        image: (promo as any).image ?? null,
        videoUrl: (promo as any).videoUrl ?? null,
        mediaType: promo.mediaType,
        link: promo.link ?? null,
        discount: promo.discount ?? null,
        advertiser: promo.advertiser ?? null,
        priority: promo.priority,
        isActive: true,
        placement: promo.placement,
        commercialStatus: promo.commercialStatus,
      }).where(eq(promos.id, promo.id));
    } else {
      await db.insert(promos).values(promo);
    }
  }

  await db.insert(promos).values([
    { ...promoBase, id: "promo-3", title: "Celulares y Tablets", description: "Los mejores precios en tecnología móvil", link: "/explore?category=electronics", type: "category", discount: "Hasta 40% OFF", priority: 1 },
    { ...promoBase, id: "promo-4", title: "Computación", description: "Notebooks, PCs y accesorios", link: "/explore?category=electronics", type: "category", discount: "Hasta 40% OFF", priority: 2 },
    { ...promoBase, id: "promo-5", title: "Zapatillas", description: "Las mejores marcas deportivas", link: "/explore?category=fashion", type: "category", discount: "Hasta 40% OFF", priority: 3 },
    { ...promoBase, id: "promo-6", title: "Moda", description: "Ropa y accesorios para toda la familia", link: "/explore?category=fashion", type: "category", discount: "Hasta 40% OFF", priority: 4 },
    { ...promoBase, id: "promo-7", title: "Nueva temporada de moda", description: "Descubre las últimas tendencias en Moda Express", link: "/explore?category=fashion", type: "notice", advertiser: "Moda Express", priority: 1 },
    { ...promoBase, id: "promo-8", title: "Jornada de vacunación gratuita", description: "Este sábado vacunación antirrábica para mascotas", type: "notice", advertiser: "Municipalidad", priority: 2 },
  ]).onConflictDoNothing();

  // Shoppable Videos (demo with public sample videos)
  await db.insert(shoppableVideos).values([
    {
      id: "video-1",
      merchantId: "merchant-user",
      storeId: "store-3",
      productId: "prod-6",
      title: "Auriculares Bluetooth Premium — ahora con 25% OFF",
      description: "La mejor experiencia de audio sin cables. Cancelación de ruido activa, 30hs de batería.",
      tags: "auriculares,bluetooth,tecnologia,oferta",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      thumbnailUrl: null,
      contentType: "product",
      status: "published",
      isFeatured: true,
      isSponsored: false,
      viewsCount: 312,
      clicksCount: 47,
      addToCartCount: 18,
      purchasesCount: 5,
      savesCount: 22,
      targetProvince: null,
      targetCity: null,
      publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      id: "video-2",
      merchantId: "merchant-user",
      storeId: "store-4",
      productId: "prod-8",
      title: "Pizza Muzzarella Grande — llega en 30 min",
      description: "Masa artesanal, salsa casera y muzzarella de primera. Pedí ahora y la tenés en tu puerta.",
      tags: "pizza,comida,delivery,rapido",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
      thumbnailUrl: null,
      contentType: "product",
      status: "published",
      isFeatured: false,
      isSponsored: true,
      viewsCount: 891,
      clicksCount: 134,
      addToCartCount: 67,
      purchasesCount: 29,
      savesCount: 45,
      targetProvince: "santa-fe",
      targetCity: "rosario",
      publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      id: "video-3",
      merchantId: "merchant-user",
      storeId: "store-1",
      productId: "prod-3",
      title: "Aceite de Girasol al mejor precio del barrio",
      description: "Calidad premium, precio imbatible. Stock limitado. ¡Aprovechá ahora!",
      tags: "supermercado,aceite,oferta,precio",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
      thumbnailUrl: null,
      contentType: "product",
      status: "published",
      isFeatured: false,
      isSponsored: false,
      viewsCount: 156,
      clicksCount: 28,
      addToCartCount: 12,
      purchasesCount: 8,
      savesCount: 10,
      targetProvince: "buenos-aires",
      targetCity: null,
      publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      id: "video-4",
      merchantId: "merchant-user",
      storeId: "store-6",
      productId: "prod-11",
      title: "Alimento Premium para tu perro — envío gratis",
      description: "Lo mejor para tu compañero. Fórmula balanceada con proteínas naturales. 15kg.",
      tags: "mascotas,perros,alimento,enviogratis",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
      thumbnailUrl: null,
      contentType: "product",
      status: "published",
      isFeatured: false,
      isSponsored: false,
      viewsCount: 203,
      clicksCount: 31,
      addToCartCount: 14,
      purchasesCount: 6,
      savesCount: 17,
      targetProvince: "buenos-aires",
      targetCity: null,
      publishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    },
    {
      id: "video-5",
      merchantId: "merchant-user",
      storeId: "store-5",
      productId: "prod-10",
      title: "Moda Express — Nueva colección de verano",
      description: "Remeras 100% algodón en todos los colores. Comodidad y estilo para cada día.",
      tags: "moda,remeras,verano,local",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
      thumbnailUrl: null,
      contentType: "store",
      status: "published",
      isFeatured: false,
      isSponsored: false,
      viewsCount: 78,
      clicksCount: 11,
      addToCartCount: 4,
      purchasesCount: 2,
      savesCount: 8,
      targetProvince: "mendoza",
      targetCity: "mendoza-capital",
      publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  ]).onConflictDoNothing();

  console.log("[db] Seed complete.");
}

// Helper: Unsplash CDN URL builder
function uImg(id: string, w = 800, h = 600) {
  return `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=80`;
}

export async function updateDemoData() {
  console.log("[db] Updating demo data...");

  // ─── STORES ───────────────────────────────────────────────────────────────

  // Store 1: Super Mercado Central
  await db.update(stores).set({
    name: "Super Mercado Central",
    description: "Tu supermercado de confianza con los mejores precios, productos frescos y las mejores marcas todos los días. Envío a domicilio en 24 hs.",
    logo: uImg("1542838132-92c53300491e", 200, 200),
    banner: uImg("1608198093002-ad4e005484ec", 1200, 400),
    images: JSON.stringify([
      uImg("1567306301408-9b74779a11af", 800, 600),
      uImg("1586201375761-83865001e31c", 800, 600),
      uImg("1550583724-b2692b85b150", 800, 600),
    ]),
    rating: "4.5",
    isFeatured: false,
    featuredScore: 40,
  }).where(eq(stores.id, "store-1"));

  // Store 3: Electro Tech — FEATURED + POPULAR
  await db.update(stores).set({
    name: "Electro Tech",
    description: "Lo último en tecnología y electrónica al mejor precio. Celulares, auriculares, accesorios y más. Garantía oficial en todos los productos.",
    logo: uImg("1518770660439-4636190af475", 200, 200),
    banner: uImg("1550009158-9ebf69173e03", 1200, 400),
    images: JSON.stringify([
      uImg("1468495244123-6c6c332eeece", 800, 600),
      uImg("1574269909862-7e1d70bb8078", 800, 600),
      uImg("1498049794561-7780e7231661", 800, 600),
    ]),
    rating: "4.8",
    isFeatured: true,
    featuredScore: 95,
  }).where(eq(stores.id, "store-3"));

  // Store 4: Pizzería Don Luigi — FEATURED + POPULAR
  await db.update(stores).set({
    name: "Pizzería Don Luigi",
    description: "Las mejores pizzas artesanales de la ciudad. Masa madre, ingredientes frescos y horno a leña. Delivery en 30 minutos.",
    logo: uImg("1513104890138-7c749659a591", 200, 200),
    banner: uImg("1579871494447-9811cf80d66c", 1200, 400),
    images: JSON.stringify([
      uImg("1565299624946-b28f40a0ae38", 800, 600),
      uImg("1571407970349-bc81e7e96d47", 800, 600),
      uImg("1604382354936-07c5d9983bd3", 800, 600),
    ]),
    rating: "4.7",
    isFeatured: true,
    featuredScore: 85,
  }).where(eq(stores.id, "store-4"));

  // Store 5: Moda Express — FEATURED (productos destacados)
  await db.update(stores).set({
    name: "Moda Express",
    description: "Ropa y accesorios de temporada para toda la familia. Última colección de verano con los mejores precios. Envío gratis en compras mayores a $10.000.",
    logo: uImg("1441986300917-64674bd600d8", 200, 200),
    banner: uImg("1523381210434-271e8be1f52b", 1200, 400),
    images: JSON.stringify([
      uImg("1558769132-cb1aea458c5e", 800, 600),
      uImg("1487222477894-8943e31ef7b2", 800, 600),
      uImg("1469334031218-e382a71b716b", 800, 600),
    ]),
    rating: "4.4",
    isFeatured: false,
    featuredScore: 60,
  }).where(eq(stores.id, "store-5"));

  // Store 6: Pet Shop Amigos — POPULAR
  await db.update(stores).set({
    name: "Pet Shop Amigos",
    description: "Todo lo que tu mascota necesita: alimentos premium, accesorios, higiene y juguetes. Atención veterinaria online incluida.",
    logo: uImg("1587300003388-59208cc962cb", 200, 200),
    banner: uImg("1601758124510-52d02ddb7cbd", 1200, 400),
    images: JSON.stringify([
      uImg("1548199973-03cce0bbc87b", 800, 600),
      uImg("1583511655857-d19b40a7a54e", 800, 600),
      uImg("1561037404-61cd46aa615b", 800, 600),
    ]),
    rating: "4.6",
    isFeatured: true,
    featuredScore: 80,
  }).where(eq(stores.id, "store-6"));

  // ─── PRODUCTS (update existing + insert new) ──────────────────────────────

  // --- Store 1: Super Mercado Central ---
  await db.update(products).set({
    name: "Aceite de Girasol Premium 1.5L",
    description: "Aceite de girasol de primera prensada, bajo en grasas saturadas. Ideal para frituras y aderezos. Pack familiar.",
    price: "2490",
    originalPrice: "3100",
    image: uImg("1474979266404-7eaacbcd87c5", 500, 500),
    images: JSON.stringify([
      uImg("1474979266404-7eaacbcd87c5", 800, 800),
      uImg("1586201375761-83865001e31c", 800, 800),
      uImg("1567306301408-9b74779a11af", 800, 800),
    ]),
    isSponsored: false,
    sponsoredPriority: 0,
  }).where(eq(products.id, "prod-3"));

  await db.update(products).set({
    description: "Leche entera UAT de primera calidad, sin aditivos. 1 litro.",
    image: uImg("1550583724-b2692b85b150", 500, 500),
    images: JSON.stringify([
      uImg("1550583724-b2692b85b150", 800, 800),
      uImg("1567306301408-9b74779a11af", 800, 800),
      uImg("1608198093002-ad4e005484ec", 800, 800),
    ]),
  }).where(eq(products.id, "prod-1"));

  await db.update(products).set({
    description: "Pan lactal blanco suave, sin corteza. Ideal para sandwiches y tostadas. 500g.",
    image: uImg("1509440159596-0249088772ff", 500, 500),
    images: JSON.stringify([
      uImg("1509440159596-0249088772ff", 800, 800),
      uImg("1586201375761-83865001e31c", 800, 800),
      uImg("1567306301408-9b74779a11af", 800, 800),
    ]),
  }).where(eq(products.id, "prod-2"));

  await db.insert(products).values([
    {
      id: "prod-1b", storeId: "store-1",
      name: "Yerba Mate Taragüí 500g",
      description: "Yerba mate seleccionada de las mejores plantaciones de Misiones. Suave y fragante.",
      price: "2800", originalPrice: "3400",
      image: uImg("1576092768241-dec231879fc3", 500, 500),
      images: JSON.stringify([uImg("1576092768241-dec231879fc3",800,800),uImg("1544787219-7f47ccb76574",800,800),uImg("1589365278-7da5de724b51",800,800)]),
      category: "Infusiones", stock: 60, isActive: true, isSponsored: false, sponsoredPriority: 0,
    },
    {
      id: "prod-1c", storeId: "store-1",
      name: "Arroz Largo Fino 1kg",
      description: "Arroz largo fino de alta calidad, sin aditivos. Perfecto para guarniciones.",
      price: "1200",
      image: uImg("1586201375761-83865001e31c", 500, 500),
      images: JSON.stringify([uImg("1586201375761-83865001e31c",800,800),uImg("1567306301408-9b74779a11af",800,800),uImg("1542838132-92c53300491e",800,800)]),
      category: "Almacén", stock: 80, isActive: true, isSponsored: false, sponsoredPriority: 0,
    },
    {
      id: "prod-1d", storeId: "store-1",
      name: "Gaseosa Cola 1.5L",
      description: "Bebida cola refrescante, versión retornable. Ideal para compartir.",
      price: "1850", originalPrice: "2200",
      image: uImg("1624557957-2d60f5afb36c", 500, 500),
      images: JSON.stringify([uImg("1624557957-2d60f5afb36c",800,800),uImg("1527960669566-c7f07c47d2da",800,800),uImg("1550583724-b2692b85b150",800,800)]),
      category: "Bebidas", stock: 100, isActive: true, isSponsored: false, sponsoredPriority: 0,
    },
  ]).onConflictDoNothing();
  // Update multi-images for store-1 inserted products (idempotent)
  await db.update(products).set({ images: JSON.stringify([uImg("1576092768241-dec231879fc3",800,800),uImg("1544787219-7f47ccb76574",800,800),uImg("1589365278-7da5de724b51",800,800)]) }).where(eq(products.id, "prod-1b"));
  await db.update(products).set({ images: JSON.stringify([uImg("1586201375761-83865001e31c",800,800),uImg("1567306301408-9b74779a11af",800,800),uImg("1542838132-92c53300491e",800,800)]) }).where(eq(products.id, "prod-1c"));
  await db.update(products).set({ images: JSON.stringify([uImg("1624557957-2d60f5afb36c",800,800),uImg("1527960669566-c7f07c47d2da",800,800),uImg("1550583724-b2692b85b150",800,800)]) }).where(eq(products.id, "prod-1d"));

  // --- Store 3: Electro Tech ---
  await db.update(products).set({
    name: "Auriculares Bluetooth Premium",
    description: "Auriculares inalámbricos con cancelación activa de ruido, 30hs de batería y sonido Hi-Fi. Compatibles con todos los dispositivos.",
    price: "14999",
    originalPrice: "20000",
    image: uImg("1505740420928-5e560c06d30e", 500, 500),
    images: JSON.stringify([
      uImg("1505740420928-5e560c06d30e", 800, 800),
      uImg("1484704849700-f032a568e944", 800, 800),
      uImg("1574269909862-7e1d70bb8078", 800, 800),
    ]),
    isSponsored: true,
    sponsoredPriority: 3,
  }).where(eq(products.id, "prod-6"));

  await db.update(products).set({
    name: "Cargador USB-C 65W GaN",
    description: "Cargador rápido USB-C con tecnología GaN. Compatible con notebooks, tablets y celulares. Carga tu laptop en menos de 1 hora.",
    price: "6800",
    image: uImg("1581091226825-a6a2a5aee158", 500, 500),
    images: JSON.stringify([
      uImg("1581091226825-a6a2a5aee158", 800, 800),
      uImg("1558618666-fcd25c85cd64", 800, 800),
      uImg("1518770660439-4636190af475", 800, 800),
      uImg("1596606764615-aa71b8b07f42", 800, 800),
    ]),
    isSponsored: true,
    sponsoredPriority: 2,
  }).where(eq(products.id, "prod-7"));

  await db.insert(products).values([
    {
      id: "prod-3b", storeId: "store-3",
      name: "Smart TV 55\" 4K UHD",
      description: "Televisor Smart 4K Ultra HD con Android TV. Pantalla QLED de 55 pulgadas. HDR10+ y Dolby Vision.",
      price: "245000", originalPrice: "290000",
      image: uImg("1593359677879-a4bb92f829d1", 500, 500),
      images: JSON.stringify([uImg("1593359677879-a4bb92f829d1",800,800),uImg("1546587687898-ba8fbcde5b93",800,800),uImg("1574269909862-7e1d70bb8078",800,800),uImg("1468495244123-6c6c332eeece",800,800)]),
      category: "Televisores", stock: 8, isActive: true, isSponsored: true, sponsoredPriority: 1,
    },
    {
      id: "prod-3c", storeId: "store-3",
      name: "Teclado Mecánico RGB",
      description: "Teclado mecánico con switches Blue, retroiluminación RGB personalizable y diseño compacto TKL.",
      price: "18500", originalPrice: "22000",
      image: uImg("1587829741301-dc798b83add3", 500, 500),
      images: JSON.stringify([uImg("1587829741301-dc798b83add3",800,800),uImg("1541140532-f5fabb4f8f5e",800,800),uImg("1518770660439-4636190af475",800,800)]),
      category: "Accesorios", stock: 20, isActive: true, isSponsored: false, sponsoredPriority: 0,
    },
    {
      id: "prod-3d", storeId: "store-3",
      name: "Parlante Bluetooth 20W",
      description: "Parlante portátil con 20W de potencia, resistente al agua IPX7, 12hs de batería y sonido 360°.",
      price: "22000", originalPrice: "26500",
      image: uImg("1608043152269-423dbba4e7e1", 500, 500),
      images: JSON.stringify([uImg("1608043152269-423dbba4e7e1",800,800),uImg("1519817914-6895f5c79c6e",800,800),uImg("1484704849700-f032a568e944",800,800)]),
      category: "Audio", stock: 12, isActive: true, isSponsored: false, sponsoredPriority: 0,
    },
  ]).onConflictDoNothing();
  // Update multi-images for store-3 inserted products
  await db.update(products).set({ images: JSON.stringify([uImg("1593359677879-a4bb92f829d1",800,800),uImg("1546587687898-ba8fbcde5b93",800,800),uImg("1574269909862-7e1d70bb8078",800,800),uImg("1468495244123-6c6c332eeece",800,800)]) }).where(eq(products.id, "prod-3b"));
  await db.update(products).set({ images: JSON.stringify([uImg("1587829741301-dc798b83add3",800,800),uImg("1541140532-f5fabb4f8f5e",800,800),uImg("1518770660439-4636190af475",800,800)]) }).where(eq(products.id, "prod-3c"));
  await db.update(products).set({ images: JSON.stringify([uImg("1608043152269-423dbba4e7e1",800,800),uImg("1519817914-6895f5c79c6e",800,800),uImg("1484704849700-f032a568e944",800,800)]) }).where(eq(products.id, "prod-3d"));

  // --- Store 4: Pizzería Don Luigi ---
  await db.update(products).set({
    name: "Pizza Muzzarella Grande",
    description: "Pizza artesanal de masa madre con salsa de tomate casera y muzzarella de primera. 8 porciones.",
    price: "8900",
    image: uImg("1513104890138-7c749659a591", 500, 500),
    images: JSON.stringify([
      uImg("1513104890138-7c749659a591", 800, 800),
      uImg("1565299624946-b28f40a0ae38", 800, 800),
      uImg("1604382354936-07c5d9983bd3", 800, 800),
    ]),
    isSponsored: true,
    sponsoredPriority: 2,
  }).where(eq(products.id, "prod-8"));

  await db.update(products).set({
    name: "Pizza Especial Don Luigi",
    description: "Pizza especial con jamón cocido, morrones asados, aceitunas negras, huevo duro y muzzarella extra.",
    price: "12500",
    originalPrice: "14000",
    image: uImg("1565299624946-b28f40a0ae38", 500, 500),
    images: JSON.stringify([
      uImg("1565299624946-b28f40a0ae38", 800, 800),
      uImg("1520201163981-8cc95007dd2a", 800, 800),
      uImg("1513104890138-7c749659a591", 800, 800),
    ]),
    isSponsored: true,
    sponsoredPriority: 1,
  }).where(eq(products.id, "prod-9"));

  await db.insert(products).values([
    {
      id: "prod-4b", storeId: "store-4",
      name: "Pizza Napolitana Grande",
      description: "Pizza con tomates cherry, ajo, albahaca fresca y aceite de oliva sobre base de muzzarella.",
      price: "11000",
      image: uImg("1571407970349-bc81e7e96d47", 500, 500),
      images: JSON.stringify([uImg("1571407970349-bc81e7e96d47",800,800),uImg("1604382354936-07c5d9983bd3",800,800),uImg("1565299624946-b28f40a0ae38",800,800)]),
      category: "Pizzas", stock: 99, isActive: true, isSponsored: false, sponsoredPriority: 0,
    },
    {
      id: "prod-4c", storeId: "store-4",
      name: "Docena de Empanadas Criolla",
      description: "Empanadas caseras de carne cortada a cuchillo, cebolla, pimiento y huevo. Cocidas al horno.",
      price: "9500", originalPrice: "11000",
      image: uImg("1567620905-ef5e69ea9e9c", 500, 500),
      images: JSON.stringify([uImg("1567620905-ef5e69ea9e9c",800,800),uImg("1565299624946-b28f40a0ae38",800,800),uImg("1513104890138-7c749659a591",800,800)]),
      category: "Empanadas", stock: 50, isActive: true, isSponsored: false, sponsoredPriority: 0,
    },
    {
      id: "prod-4d", storeId: "store-4",
      name: "Combo Familiar (2 Pizzas + Bebida)",
      description: "2 pizzas grandes a elección + 1 gaseosa 1.5L. El combo perfecto para compartir.",
      price: "21000", originalPrice: "25000",
      image: uImg("1604382354936-07c5d9983bd3", 500, 500),
      images: JSON.stringify([uImg("1604382354936-07c5d9983bd3",800,800),uImg("1513104890138-7c749659a591",800,800),uImg("1571407970349-bc81e7e96d47",800,800)]),
      category: "Combos", stock: 99, isActive: true, isSponsored: false, sponsoredPriority: 0,
    },
  ]).onConflictDoNothing();
  // Update multi-images for store-4 inserted products
  await db.update(products).set({ images: JSON.stringify([uImg("1571407970349-bc81e7e96d47",800,800),uImg("1604382354936-07c5d9983bd3",800,800),uImg("1565299624946-b28f40a0ae38",800,800)]) }).where(eq(products.id, "prod-4b"));
  await db.update(products).set({ image: uImg("1567620905-ef5e69ea9e9c",500,500), images: JSON.stringify([uImg("1567620905-ef5e69ea9e9c",800,800),uImg("1565299624946-b28f40a0ae38",800,800),uImg("1513104890138-7c749659a591",800,800)]) }).where(eq(products.id, "prod-4c"));
  await db.update(products).set({ images: JSON.stringify([uImg("1604382354936-07c5d9983bd3",800,800),uImg("1513104890138-7c749659a591",800,800),uImg("1571407970349-bc81e7e96d47",800,800)]) }).where(eq(products.id, "prod-4d"));

  // --- Store 5: Moda Express ---
  await db.update(products).set({
    name: "Remera Algodón 100% Premium",
    description: "Remera de algodón peinado, corte regular fit. Disponible en 12 colores y todos los talles (XS al XXL).",
    price: "4900",
    originalPrice: "6500",
    image: uImg("1521572163474-6864f9cf17ab", 500, 500),
    images: JSON.stringify([
      uImg("1521572163474-6864f9cf17ab", 800, 800),
      uImg("1523381210434-271e8be1f52b", 800, 800),
      uImg("1558769132-cb1aea458c5e", 800, 800),
    ]),
    isSponsored: true,
    sponsoredPriority: 2,
  }).where(eq(products.id, "prod-10"));

  await db.insert(products).values([
    {
      id: "prod-5b", storeId: "store-5",
      name: "Jean Slim Fit Elastizado",
      description: "Jean de corte slim con elastano para mayor comodidad. Lavado clásico. Talles 28 al 42.",
      price: "12500", originalPrice: "15000",
      image: uImg("1542272604-787c3835535d", 500, 500),
      images: JSON.stringify([uImg("1542272604-787c3835535d",800,800),uImg("1487222477894-8943e31ef7b2",800,800),uImg("1523381210434-271e8be1f52b",800,800)]),
      category: "Pantalones", stock: 40, isActive: true, isSponsored: true, sponsoredPriority: 1,
    },
    {
      id: "prod-5c", storeId: "store-5",
      name: "Zapatillas Running Urbanas",
      description: "Zapatillas de running con suela amortiguadora. Ideales para correr y uso diario. Talles 36-45.",
      price: "28000", originalPrice: "35000",
      image: uImg("1542291026-7eec264c27ff", 500, 500),
      images: JSON.stringify([uImg("1542291026-7eec264c27ff",800,800),uImg("1595777457583-95e059d581b8",800,800),uImg("1542272604-787c3835535d",800,800)]),
      category: "Calzado", stock: 25, isActive: true, isSponsored: true, sponsoredPriority: 3,
    },
    {
      id: "prod-5d", storeId: "store-5",
      name: "Vestido Floral Verano",
      description: "Vestido estampado floral en gasa liviana. Perfecto para el verano. Talles S, M, L, XL.",
      price: "9800", originalPrice: "12000",
      image: uImg("1595777457583-95e059d581b8", 500, 500),
      images: JSON.stringify([uImg("1595777457583-95e059d581b8",800,800),uImg("1469334031218-e382a71b716b",800,800),uImg("1558769132-cb1aea458c5e",800,800)]),
      category: "Vestidos", stock: 30, isActive: true, isSponsored: false, sponsoredPriority: 0,
    },
    {
      id: "prod-5e", storeId: "store-5",
      name: "Campera Rompeviento Liviana",
      description: "Campera cortaviento con capucha desmontable. Ideal para primavera-verano. Talle único.",
      price: "16500", originalPrice: "19900",
      image: uImg("1591047139829-d91aecb6caea", 500, 500),
      images: JSON.stringify([uImg("1591047139829-d91aecb6caea",800,800),uImg("1523381210434-271e8be1f52b",800,800),uImg("1521572163474-6864f9cf17ab",800,800)]),
      category: "Camperas", stock: 20, isActive: true, isSponsored: false, sponsoredPriority: 0,
    },
  ]).onConflictDoNothing();
  // Update multi-images for store-5 inserted products
  await db.update(products).set({ images: JSON.stringify([uImg("1542272604-787c3835535d",800,800),uImg("1487222477894-8943e31ef7b2",800,800),uImg("1523381210434-271e8be1f52b",800,800)]) }).where(eq(products.id, "prod-5b"));
  await db.update(products).set({ images: JSON.stringify([uImg("1542291026-7eec264c27ff",800,800),uImg("1595777457583-95e059d581b8",800,800),uImg("1542272604-787c3835535d",800,800)]) }).where(eq(products.id, "prod-5c"));
  await db.update(products).set({ images: JSON.stringify([uImg("1595777457583-95e059d581b8",800,800),uImg("1469334031218-e382a71b716b",800,800),uImg("1558769132-cb1aea458c5e",800,800)]) }).where(eq(products.id, "prod-5d"));
  await db.update(products).set({ images: JSON.stringify([uImg("1591047139829-d91aecb6caea",800,800),uImg("1523381210434-271e8be1f52b",800,800),uImg("1521572163474-6864f9cf17ab",800,800)]) }).where(eq(products.id, "prod-5e"));

  // --- Store 6: Pet Shop Amigos ---
  await db.update(products).set({
    name: "Alimento Perro Adulto Premium 15kg",
    description: "Alimento balanceado premium formulado con proteínas de pollo y arroz. Sin colorantes artificiales. Para razas medianas y grandes.",
    price: "24500",
    originalPrice: "28000",
    image: uImg("1589924691701-c85e27f9f2d8", 500, 500),
    images: JSON.stringify([
      uImg("1589924691701-c85e27f9f2d8", 800, 800),
      uImg("1587300003388-59208cc962cb", 800, 800),
      uImg("1548199973-03cce0bbc87b", 800, 800),
    ]),
    isSponsored: false,
    sponsoredPriority: 0,
  }).where(eq(products.id, "prod-11"));

  await db.update(products).set({
    name: "Arena Sanitaria Aglomerante 10kg",
    description: "Arena aglomerante con control de olores y anti-bacteriana. Sin polvo. Duración 4 semanas para 1 gato.",
    price: "7800",
    image: uImg("1574158622682-e40e69881006", 500, 500),
    images: JSON.stringify([
      uImg("1574158622682-e40e69881006", 800, 800),
      uImg("1561037404-61cd46aa615b", 800, 800),
      uImg("1583511655857-d19b40a7a54e", 800, 800),
    ]),
  }).where(eq(products.id, "prod-12"));

  await db.insert(products).values([
    {
      id: "prod-6b", storeId: "store-6",
      name: "Correa y Arnés Regulable",
      description: "Set de correa y arnés acolchado para perros. Cierre de seguridad doble. Talle S al XL.",
      price: "5200", originalPrice: "6500",
      image: uImg("1591758369239-ac2b76e23eac", 500, 500),
      images: JSON.stringify([uImg("1591758369239-ac2b76e23eac",800,800),uImg("1548199973-03cce0bbc87b",800,800),uImg("1587300003388-59208cc962cb",800,800)]),
      category: "Accesorios", stock: 35, isActive: true, isSponsored: false, sponsoredPriority: 0,
    },
    {
      id: "prod-6c", storeId: "store-6",
      name: "Cama Ortopédica para Mascotas",
      description: "Cama con espuma viscoelástica ortopédica. Funda lavable. Talla M (60x80cm). Ideal para perros y gatos.",
      price: "12800", originalPrice: "15500",
      image: uImg("1590031905406-f18a426d772d", 500, 500),
      images: JSON.stringify([uImg("1590031905406-f18a426d772d",800,800),uImg("1561037404-61cd46aa615b",800,800),uImg("1583511655857-d19b40a7a54e",800,800)]),
      category: "Descanso", stock: 15, isActive: true, isSponsored: false, sponsoredPriority: 0,
    },
    {
      id: "prod-6d", storeId: "store-6",
      name: "Juguete Interactivo para Gatos",
      description: "Juguete electrónico con movimiento aleatorio. Estimula el instinto cazador. Pilas incluidas.",
      price: "3500",
      image: uImg("1572635148818-ef6fd45eb394", 500, 500),
      images: JSON.stringify([uImg("1572635148818-ef6fd45eb394",800,800),uImg("1574158622682-e40e69881006",800,800),uImg("1561037404-61cd46aa615b",800,800)]),
      category: "Juguetes", stock: 40, isActive: true, isSponsored: false, sponsoredPriority: 0,
    },
  ]).onConflictDoNothing();
  // Update multi-images for store-6 inserted products
  await db.update(products).set({ images: JSON.stringify([uImg("1591758369239-ac2b76e23eac",800,800),uImg("1548199973-03cce0bbc87b",800,800),uImg("1587300003388-59208cc962cb",800,800)]) }).where(eq(products.id, "prod-6b"));
  await db.update(products).set({ images: JSON.stringify([uImg("1590031905406-f18a426d772d",800,800),uImg("1561037404-61cd46aa615b",800,800),uImg("1583511655857-d19b40a7a54e",800,800)]) }).where(eq(products.id, "prod-6c"));
  await db.update(products).set({ images: JSON.stringify([uImg("1572635148818-ef6fd45eb394",800,800),uImg("1574158622682-e40e69881006",800,800),uImg("1561037404-61cd46aa615b",800,800)]) }).where(eq(products.id, "prod-6d"));

  // ─── VIDEOS: update to local URLs + thumbnails ────────────────────────────

  await db.update(shoppableVideos).set({
    videoUrl: "/videos/video-1.mp4",
    thumbnailUrl: "/thumbnails/thumb-1.jpg",
    viewsCount: 312, savesCount: 22, clicksCount: 47,
  }).where(eq(shoppableVideos.id, "video-1"));

  await db.update(shoppableVideos).set({
    videoUrl: "/videos/video-2.mp4",
    thumbnailUrl: "/thumbnails/thumb-2.jpg",
    viewsCount: 891, savesCount: 45, clicksCount: 134,
  }).where(eq(shoppableVideos.id, "video-2"));

  await db.update(shoppableVideos).set({
    videoUrl: "/videos/video-3.mp4",
    thumbnailUrl: "/thumbnails/thumb-3.jpg",
    viewsCount: 156, savesCount: 10, clicksCount: 28,
  }).where(eq(shoppableVideos.id, "video-3"));

  await db.update(shoppableVideos).set({
    videoUrl: "/videos/video-4.mp4",
    thumbnailUrl: "/thumbnails/thumb-4.jpg",
    viewsCount: 203, savesCount: 17, clicksCount: 31,
  }).where(eq(shoppableVideos.id, "video-4"));

  await db.update(shoppableVideos).set({
    videoUrl: "/videos/video-5.mp4",
    thumbnailUrl: "/thumbnails/thumb-5.jpg",
    viewsCount: 78, savesCount: 8, clicksCount: 11,
  }).where(eq(shoppableVideos.id, "video-5"));

  console.log("[db] Demo data updated.");
}
