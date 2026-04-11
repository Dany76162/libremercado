import { eq, and, or, desc, sql, isNull, lte, ilike, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import {
  users, stores, products, orders, orderItems, promos,
  travelOffers, kycDocuments, subscriptionPlans, merchantApplications,
  riderProfiles, riderEarnings, platformCommissions, adBillings, reviews, notifications, travelBookings, disputes, favorites,
  shoppableVideos, storeFollows,
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

  async getVideoFeed(params: { provinciaId?: string; ciudadId?: string; limit?: number; offset?: number; userId?: string }): Promise<ShoppableVideo[]> {
    const { provinciaId, ciudadId, limit = 10, offset = 0, userId } = params;
    const conditions: any[] = [eq(shoppableVideos.status, "published")];
    if (ciudadId) {
      conditions.push(or(isNull(shoppableVideos.targetCity), eq(shoppableVideos.targetCity, ciudadId)));
    } else if (provinciaId) {
      conditions.push(or(isNull(shoppableVideos.targetProvince), eq(shoppableVideos.targetProvince, provinciaId)));
    }

    const rows = await db.select().from(shoppableVideos)
      .where(and(...conditions))
      .orderBy(desc(shoppableVideos.publishedAt))
      .limit(100);

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

  // Promos
  await db.insert(promos).values([
    { ...promoBase, id: "promo-1", title: "LLEGARON LAS FECHAS DOBLES", description: "Hasta 40% OFF y hasta 18 cuotas sin interés", link: "/explore?filter=ofertas", type: "banner", advertiser: "PachaPay", discount: "40% OFF", priority: 1 },
    { ...promoBase, id: "promo-2", title: "Envío Gratis en tu primer pedido", description: "Registrate y obtené envío gratis en tu primera compra", link: "/account", type: "banner", advertiser: "PachaPay", discount: "ENVÍO GRATIS", priority: 2 },
    { ...promoBase, id: "promo-video-1", title: "Hot Sale PachaPay", description: "Los mejores descuentos del año están aquí. No te los pierdas.", videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4", mediaType: "video" as const, link: "/explore?filter=hotsale", type: "banner", advertiser: "PachaPay", discount: "HASTA 70% OFF", priority: 3 },
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
