import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
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
  MerchantApplicationStatus,
  RiderStatus,
  PlatformCommission, InsertPlatformCommission,
  CommissionStatus,
  AdBilling, InsertAdBilling,
  PromoCommercialStatus,
  Review, InsertReview,
  Notification, InsertNotification,
  TravelBooking, InsertTravelBooking,
  Dispute, InsertDispute, DisputeStatus,
  Favorite, InsertFavorite, FavoriteType,
  ShoppableVideo, InsertShoppableVideo, VideoStatus,
} from "@workspace/db";

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

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;

  getStores(): Promise<Store[]>;
  getStore(id: string): Promise<Store | undefined>;
  getStoresByOwner(ownerId: string): Promise<Store[]>;
  createStore(store: InsertStore): Promise<Store>;
  updateStore(id: string, data: Partial<InsertStore>): Promise<Store | undefined>;
  deleteStore(id: string): Promise<boolean>;

  getProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  getProductsByStore(storeId: string): Promise<Product[]>;
  getFeaturedProducts(): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, data: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;

  getOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrdersByCustomer(customerId: string): Promise<Order[]>;
  getOrdersByStore(storeId: string): Promise<Order[]>;
  getOrdersByRider(riderId: string): Promise<Order[]>;
  getAvailableOrders(): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, data: Partial<InsertOrder>): Promise<Order | undefined>;

  getOrderItems(orderId: string): Promise<OrderItem[]>;
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;

  getPromos(): Promise<Promo[]>;
  getPromoBanners(): Promise<Promo[]>;
  getPromoNotices(): Promise<Promo[]>;
  getPromoCategories(): Promise<Promo[]>;
  createPromo(promo: InsertPromo): Promise<Promo>;
  updatePromo(id: string, data: Partial<InsertPromo>): Promise<Promo | undefined>;
  deletePromo(id: string): Promise<boolean>;

  getTravelOffers(): Promise<TravelOffer[]>;
  createTravelOffer(offer: InsertTravelOffer): Promise<TravelOffer>;
  updateTravelOffer(id: string, data: Partial<InsertTravelOffer>): Promise<TravelOffer | undefined>;
  deleteTravelOffer(id: string): Promise<boolean>;

  getKycDocuments(userId: string): Promise<KycDocument[]>;
  getKycDocument(id: string): Promise<KycDocument | undefined>;
  getPendingKycDocuments(): Promise<KycDocument[]>;
  createKycDocument(doc: InsertKycDocument): Promise<KycDocument>;
  updateKycDocument(id: string, data: Partial<KycDocument>): Promise<KycDocument | undefined>;
  updateUserKycStatus(userId: string, status: KycStatus): Promise<User | undefined>;

  getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined>;
  createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan>;

  getMerchantApplications(): Promise<MerchantApplication[]>;
  getMerchantApplication(id: string): Promise<MerchantApplication | undefined>;
  getMerchantApplicationByUser(userId: string): Promise<MerchantApplication | undefined>;
  getPendingMerchantApplications(): Promise<MerchantApplication[]>;
  createMerchantApplication(app: InsertMerchantApplication): Promise<MerchantApplication>;
  updateMerchantApplication(id: string, data: Partial<MerchantApplication>): Promise<MerchantApplication | undefined>;

  getRiderProfile(userId: string): Promise<RiderProfile | undefined>;
  getRiderProfiles(): Promise<RiderProfile[]>;
  getAvailableRiders(): Promise<RiderProfile[]>;
  createRiderProfile(profile: InsertRiderProfile): Promise<RiderProfile>;
  updateRiderProfile(userId: string, data: Partial<RiderProfile>): Promise<RiderProfile | undefined>;

  getRiderEarnings(riderId: string): Promise<RiderEarning[]>;
  createRiderEarning(earning: InsertRiderEarning): Promise<RiderEarning>;
  updateRiderEarning(id: string, data: Partial<RiderEarning>): Promise<RiderEarning | undefined>;

  getPlatformCommissions(): Promise<PlatformCommission[]>;
  getPlatformCommissionsByStore(storeId: string): Promise<PlatformCommission[]>;
  createPlatformCommission(commission: InsertPlatformCommission): Promise<PlatformCommission>;
  updatePlatformCommission(id: string, data: Partial<PlatformCommission>): Promise<PlatformCommission | undefined>;
  getExpiredPromos(): Promise<Promo[]>;
  deactivateExpiredPromos(): Promise<number>;
  trackPromoImpression(id: string): Promise<void>;
  trackPromoClick(id: string): Promise<void>;
  getPromoBannersByLocation(provinciaId?: string, ciudadId?: string, userLat?: number, userLng?: number): Promise<Promo[]>;
  updatePromoCommercialStatus(id: string, status: PromoCommercialStatus): Promise<Promo | undefined>;

  getFeaturedStores(): Promise<Store[]>;
  updateStoreFeatured(id: string, isFeatured: boolean, featuredUntil?: Date | null, featuredScore?: number): Promise<Store | undefined>;
  updateProductSponsored(id: string, isSponsored: boolean, sponsoredUntil?: Date | null, sponsoredPriority?: number): Promise<Product | undefined>;

  getAdBillings(): Promise<AdBilling[]>;
  getAdBillingsByPromo(promoId: string): Promise<AdBilling[]>;
  createAdBilling(billing: InsertAdBilling): Promise<AdBilling>;
  updateAdBilling(id: string, data: Partial<AdBilling>): Promise<AdBilling | undefined>;

  createReview(review: InsertReview): Promise<Review>;
  getReviewsByStore(storeId: string): Promise<Review[]>;
  getReviewByOrderAndUser(orderId: string, userId: string): Promise<Review | undefined>;
  getAverageRating(storeId: string): Promise<number>;

  // Disputes
  createDispute(dispute: InsertDispute): Promise<Dispute>;
  getDisputesByUser(userId: string): Promise<Dispute[]>;
  getDisputeByOrder(orderId: string): Promise<Dispute | undefined>;
  getAllDisputes(): Promise<Dispute[]>;
  updateDisputeStatus(id: string, status: DisputeStatus, resolution?: string, adminId?: string): Promise<Dispute>;

  // Travel bookings
  createTravelBooking(booking: InsertTravelBooking): Promise<TravelBooking>;
  getTravelBookingsByUser(userId: string): Promise<TravelBooking[]>;

  searchProducts(q: string, category?: string, limit?: number): Promise<Product[]>;
  searchStores(q: string, category?: string, limit?: number): Promise<Store[]>;

  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  markNotificationRead(id: string, userId: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;

  // Favorites
  getFavoritesByUser(userId: string, type?: FavoriteType): Promise<Favorite[]>;
  addFavorite(data: InsertFavorite): Promise<Favorite>;
  removeFavorite(userId: string, targetId: string, type: FavoriteType): Promise<boolean>;
  isFavorite(userId: string, targetId: string, type: FavoriteType): Promise<boolean>;

  // Password reset
  setPasswordResetToken(userId: string, token: string, expiry: Date): Promise<void>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  clearPasswordResetToken(userId: string): Promise<void>;

  // Store Follows
  followStore(userId: string, storeId: string): Promise<void>;
  unfollowStore(userId: string, storeId: string): Promise<void>;
  isFollowingStore(userId: string, storeId: string): Promise<boolean>;
  getStoreFollowersCount(storeId: string): Promise<number>;
  getFollowedStoreIds(userId: string): Promise<string[]>;

  // Shoppable Videos
  getVideoFeed(params: { provinciaId?: string; ciudadId?: string; limit?: number; offset?: number; userId?: string }): Promise<ShoppableVideo[]>;
  getVideosByMerchant(merchantId: string): Promise<ShoppableVideo[]>;
  getVideo(id: string): Promise<ShoppableVideo | undefined>;
  createVideo(data: InsertShoppableVideo): Promise<ShoppableVideo>;
  updateVideo(id: string, data: Partial<InsertShoppableVideo>): Promise<ShoppableVideo | undefined>;
  deleteVideo(id: string): Promise<boolean>;
  trackVideoView(id: string): Promise<void>;
  trackVideoAddToCart(id: string): Promise<void>;
  getAllVideosForAdmin(status?: VideoStatus): Promise<ShoppableVideo[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private stores: Map<string, Store>;
  private products: Map<string, Product>;
  private orders: Map<string, Order>;
  private orderItems: Map<string, OrderItem>;
  private promos: Map<string, Promo>;
  private travelOffers: Map<string, TravelOffer>;
  private kycDocuments: Map<string, KycDocument>;
  private subscriptionPlans: Map<string, SubscriptionPlan>;
  private merchantApplications: Map<string, MerchantApplication>;
  private riderProfiles: Map<string, RiderProfile>;
  private riderEarnings: Map<string, RiderEarning>;
  private platformCommissions: Map<string, PlatformCommission>;
  private adBillings: Map<string, AdBilling>;

  constructor() {
    this.users = new Map();
    this.stores = new Map();
    this.products = new Map();
    this.orders = new Map();
    this.orderItems = new Map();
    this.promos = new Map();
    this.travelOffers = new Map();
    this.kycDocuments = new Map();
    this.subscriptionPlans = new Map();
    this.merchantApplications = new Map();
    this.riderProfiles = new Map();
    this.riderEarnings = new Map();
    this.platformCommissions = new Map();
    this.adBillings = new Map();

    this.seedData();
  }

  private seedData() {
    // Create admin users for platform management
    // User 1: admin | Password: admin123
    const adminUser: User = {
      id: "admin-principal",
      username: "admin",
      email: "admin@pachapay.com",
      password: bcrypt.hashSync("admin123", 10),
      role: "admin",
      avatar: null,
      phone: null,
      address: null,
      vehicleType: null,
      termsAccepted: true,
      termsAcceptedAt: new Date(),
      kycStatus: "approved",
      aiGenerationsUsed: 0,
      locationProvinciaId: null,
      locationCiudadId: null,
      locationLat: null,
      locationLng: null,
      locationRadiusKm: 25,
    };
    this.users.set(adminUser.id, adminUser);

    // User 2: dany76162@gmail.com | Password: catalina0112192122
    const adminUserDany: User = {
      id: "admin-dany",
      username: "dany76162",
      email: "dany76162@gmail.com",
      password: bcrypt.hashSync("catalina0112192122", 10),
      role: "admin",
      avatar: null,
      phone: null,
      address: null,
      vehicleType: null,
      termsAccepted: true,
      termsAcceptedAt: new Date(),
      kycStatus: "approved",
      aiGenerationsUsed: 0,
      locationProvinciaId: null,
      locationCiudadId: null,
      locationLat: null,
      locationLng: null,
      locationRadiusKm: 25,
    };
    this.users.set(adminUserDany.id, adminUserDany);

    // Seed subscription plans
    const subscriptionPlans: SubscriptionPlan[] = [
      {
        id: "plan-free",
        tier: "free",
        name: "Starter",
        monthlyFee: "0",
        productLimit: 10,
        commissionPercent: "7.00",
        features: "Hasta 10 productos, Soporte básico, 1 generación de IA gratis, Comisión 7% por venta",
        isActive: true,
      },
      {
        id: "plan-basic",
        tier: "basic",
        name: "Básico",
        monthlyFee: "25000",
        productLimit: 50,
        commissionPercent: "3.00",
        features: "Hasta 50 productos, Soporte prioritario, Estadísticas básicas, Generaciones de IA ilimitadas, Comisión 3% por venta",
        isActive: true,
      },
      {
        id: "plan-premium",
        tier: "premium",
        name: "Pro",
        monthlyFee: "50000",
        productLimit: 999,
        commissionPercent: "1.00",
        features: "Productos ilimitados, Soporte 24/7, Estadísticas avanzadas, Destacado en búsquedas, Generaciones de IA ilimitadas, Comisión 1% por venta",
        isActive: true,
      },
    ];
    subscriptionPlans.forEach((p) => this.subscriptionPlans.set(p.id, p));

    const stores: Store[] = [
      {
        id: "store-1",
        ownerId: "merchant-user",
        name: "Super Mercado Central",
        description: "Tu supermercado de confianza con los mejores precios y productos frescos todos los días.",
        logo: null,
        banner: null,
        category: "Supermercado",
        rating: "4.5",
        isActive: true,
        subscriptionTier: "premium",
        subscriptionExpiresAt: null,
        address: "Av. Rivadavia 4500",
        provinciaId: "buenos-aires",
        ciudadId: "caba",
        lat: "-34.6095",
        lng: "-58.4200",
        phone: "+54 11 4123-4567",
        openingHours: "Lun-Sáb 8:00-21:00, Dom 9:00-14:00",
      },
      {
        id: "store-2",
        ownerId: "merchant-user",
        name: "Farmacia Salud",
        description: "Medicamentos, productos de higiene y cuidado personal con atención profesional.",
        logo: null,
        banner: null,
        category: "Farmacia",
        rating: "4.8",
        isActive: true,
        subscriptionTier: "basic",
        subscriptionExpiresAt: null,
        address: "Calle Florida 380",
        provinciaId: "buenos-aires",
        ciudadId: "caba",
        lat: "-34.6037",
        lng: "-58.3816",
        phone: "+54 11 4555-6789",
        openingHours: "Lun-Vie 8:00-20:00, Sáb 9:00-13:00",
      },
      {
        id: "store-3",
        ownerId: "merchant-user",
        name: "Electro Tech",
        description: "Lo último en tecnología y electrónica. Celulares, computadoras y accesorios.",
        logo: null,
        banner: null,
        category: "Electrónica",
        rating: "4.3",
        isActive: true,
        subscriptionTier: "premium",
        subscriptionExpiresAt: null,
        address: "Av. Colón 450",
        provinciaId: "cordoba",
        ciudadId: "cordoba-capital",
        lat: "-31.4201",
        lng: "-64.1888",
        phone: "+54 351 4777-8901",
        openingHours: "Lun-Sáb 10:00-20:00",
      },
      {
        id: "store-4",
        ownerId: "merchant-user",
        name: "Pizzería Don Luigi",
        description: "Las mejores pizzas artesanales con ingredientes de primera calidad.",
        logo: null,
        banner: null,
        category: "Comida",
        rating: "4.7",
        isActive: true,
        subscriptionTier: "basic",
        subscriptionExpiresAt: null,
        address: "Peatonal Córdoba 1500",
        provinciaId: "santa-fe",
        ciudadId: "rosario",
        lat: "-32.9468",
        lng: "-60.6393",
        phone: "+54 341 4111-2233",
        openingHours: "Lun-Dom 11:00-00:00",
      },
      {
        id: "store-5",
        ownerId: "merchant-user",
        name: "Moda Express",
        description: "Ropa y accesorios de moda para toda la familia a los mejores precios.",
        logo: null,
        banner: null,
        category: "Moda",
        rating: "4.2",
        isActive: true,
        subscriptionTier: "free",
        subscriptionExpiresAt: null,
        address: "Av. San Martín 800",
        provinciaId: "mendoza",
        ciudadId: "mendoza-capital",
        lat: "-32.8908",
        lng: "-68.8272",
        phone: "+54 261 4333-4455",
        openingHours: "Lun-Sáb 10:00-19:00",
      },
      {
        id: "store-6",
        ownerId: "merchant-user",
        name: "Pet Shop Amigos",
        description: "Todo para tu mascota: alimentos, accesorios y productos de cuidado.",
        logo: null,
        banner: null,
        category: "Mascotas",
        rating: "4.6",
        isActive: true,
        subscriptionTier: "basic",
        subscriptionExpiresAt: null,
        address: "Av. Belgrano 2100",
        provinciaId: "buenos-aires",
        ciudadId: "la-plata",
        lat: "-34.9215",
        lng: "-57.9545",
        phone: "+54 221 4666-7788",
        openingHours: "Lun-Vie 9:00-19:00, Sáb 10:00-14:00",
      },
    ];
    stores.forEach((s) => this.stores.set(s.id, s));

    const products: Product[] = [
      {
        id: "prod-1",
        storeId: "store-1",
        name: "Leche Entera 1L",
        description: "Leche fresca entera de primera calidad",
        price: "850",
        originalPrice: null,
        image: null,
        category: "Lácteos",
        stock: 50,
        isActive: true,
      },
      {
        id: "prod-2",
        storeId: "store-1",
        name: "Pan Lactal",
        description: "Pan lactal blanco fresco",
        price: "1200",
        originalPrice: "1500",
        image: null,
        category: "Panadería",
        stock: 30,
        isActive: true,
      },
      {
        id: "prod-3",
        storeId: "store-1",
        name: "Aceite de Girasol 1.5L",
        description: "Aceite de girasol premium",
        price: "2500",
        originalPrice: "3000",
        image: null,
        category: "Almacén",
        stock: 25,
        isActive: true,
      },
      {
        id: "prod-4",
        storeId: "store-2",
        name: "Ibuprofeno 400mg x20",
        description: "Analgésico y antiinflamatorio",
        price: "1800",
        originalPrice: null,
        image: null,
        category: "Medicamentos",
        stock: 100,
        isActive: true,
      },
      {
        id: "prod-5",
        storeId: "store-2",
        name: "Vitamina C 500mg x30",
        description: "Suplemento de vitamina C",
        price: "2200",
        originalPrice: null,
        image: null,
        category: "Suplementos",
        stock: 40,
        isActive: true,
      },
      {
        id: "prod-6",
        storeId: "store-3",
        name: "Auriculares Bluetooth",
        description: "Auriculares inalámbricos con cancelación de ruido",
        price: "15000",
        originalPrice: "20000",
        image: null,
        category: "Audio",
        stock: 15,
        isActive: true,
      },
      {
        id: "prod-7",
        storeId: "store-3",
        name: "Cargador USB-C 20W",
        description: "Cargador rápido compatible con todos los dispositivos",
        price: "5500",
        originalPrice: null,
        image: null,
        category: "Accesorios",
        stock: 35,
        isActive: true,
      },
      {
        id: "prod-8",
        storeId: "store-4",
        name: "Pizza Muzzarella Grande",
        description: "Pizza clásica con muzzarella y salsa de tomate",
        price: "8500",
        originalPrice: null,
        image: null,
        category: "Pizzas",
        stock: 99,
        isActive: true,
      },
      {
        id: "prod-9",
        storeId: "store-4",
        name: "Pizza Especial Grande",
        description: "Pizza con jamón, morrones, aceitunas y huevo",
        price: "12000",
        originalPrice: "14000",
        image: null,
        category: "Pizzas",
        stock: 99,
        isActive: true,
      },
      {
        id: "prod-10",
        storeId: "store-5",
        name: "Remera Algodón Básica",
        description: "Remera de algodón 100% en varios colores",
        price: "4500",
        originalPrice: "6000",
        image: null,
        category: "Remeras",
        stock: 50,
        isActive: true,
      },
      {
        id: "prod-11",
        storeId: "store-6",
        name: "Alimento Perro Adulto 15kg",
        description: "Alimento balanceado premium para perros adultos",
        price: "25000",
        originalPrice: "28000",
        image: null,
        category: "Alimentos",
        stock: 20,
        isActive: true,
      },
      {
        id: "prod-12",
        storeId: "store-6",
        name: "Arena Sanitaria 10kg",
        description: "Arena aglomerante para gatos con control de olores",
        price: "8000",
        originalPrice: null,
        image: null,
        category: "Higiene",
        stock: 30,
        isActive: true,
      },
    ];
    products.forEach((p) => this.products.set(p.id, p));

    const promoDefaults = {
      image: null,
      videoUrl: null,
      mediaType: "image" as const,
      isActive: true,
      createdAt: new Date(),
      generatedByAi: false,
      targetType: "global" as const,
      targetProvince: null,
      targetCity: null,
      targetLat: null,
      targetLng: null,
      targetRadiusKm: null,
      impressions: 0,
      clicks: 0,
      startDate: null,
      endDate: null,
    };
    const promos: Promo[] = [
      {
        ...promoDefaults,
        id: "promo-1",
        title: "LLEGARON LAS FECHAS DOBLES",
        description: "Hasta 40% OFF y hasta 18 cuotas sin interés",
        link: "/explore?filter=ofertas",
        type: "banner",
        advertiser: "PachaPay",
        discount: "40% OFF",
        priority: 1,
      },
      {
        ...promoDefaults,
        id: "promo-2",
        title: "Envío Gratis en tu primer pedido",
        description: "Registrate y obtené envío gratis en tu primera compra",
        link: "/account",
        type: "banner",
        advertiser: "PachaPay",
        discount: "ENVÍO GRATIS",
        priority: 2,
      },
      {
        ...promoDefaults,
        id: "promo-video-1",
        title: "Hot Sale PachaPay",
        description: "Los mejores descuentos del año están aquí. No te los pierdas.",
        videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
        mediaType: "video" as const,
        link: "/explore?filter=hotsale",
        type: "banner",
        advertiser: "PachaPay",
        discount: "HASTA 70% OFF",
        priority: 3,
      },
      {
        ...promoDefaults,
        id: "promo-3",
        title: "Celulares y Tablets",
        description: "Los mejores precios en tecnología móvil",
        link: "/explore?category=electronics",
        type: "category",
        advertiser: null,
        discount: "Hasta 40% OFF",
        priority: 1,
      },
      {
        ...promoDefaults,
        id: "promo-4",
        title: "Computación",
        description: "Notebooks, PCs y accesorios",
        link: "/explore?category=electronics",
        type: "category",
        advertiser: null,
        discount: "Hasta 40% OFF",
        priority: 2,
      },
      {
        ...promoDefaults,
        id: "promo-5",
        title: "Zapatillas",
        description: "Las mejores marcas deportivas",
        link: "/explore?category=fashion",
        type: "category",
        advertiser: null,
        discount: "Hasta 40% OFF",
        priority: 3,
      },
      {
        ...promoDefaults,
        id: "promo-6",
        title: "Moda",
        description: "Ropa y accesorios para toda la familia",
        link: "/explore?category=fashion",
        type: "category",
        advertiser: null,
        discount: "Hasta 40% OFF",
        priority: 4,
      },
      {
        ...promoDefaults,
        id: "promo-7",
        title: "Nueva temporada de moda",
        description: "Descubre las últimas tendencias en Moda Express",
        link: "/explore?category=fashion",
        type: "notice",
        advertiser: "Moda Express",
        discount: null,
        priority: 1,
      },
      {
        ...promoDefaults,
        id: "promo-8",
        title: "Jornada de vacunación gratuita",
        description: "Este sábado vacunación antirrábica para mascotas",
        link: null,
        type: "notice",
        advertiser: "Municipalidad",
        discount: null,
        priority: 2,
      },
    ];
    promos.forEach((p) => this.promos.set(p.id, p));

    const orders: Order[] = [
      {
        id: "order-1",
        customerId: "customer-user",
        storeId: "store-1",
        riderId: "rider-moto",
        status: "in_transit",
        paymentStatus: "paid",
        paymentIntentId: null,
        total: "4550",
        address: "Av. Libertador 4500, Buenos Aires",
        notes: "Tocar timbre 2B",
        storeLat: "-34.5895",
        storeLng: "-58.3974",
        deliveryLat: "-34.6037",
        deliveryLng: "-58.3816",
        riderLat: "-34.5960",
        riderLng: "-58.3890",
      },
      {
        id: "order-2",
        customerId: "customer-user",
        storeId: "store-4",
        riderId: null,
        status: "preparing",
        paymentStatus: "paid",
        paymentIntentId: null,
        total: "20500",
        address: "Av. Libertador 4500, Buenos Aires",
        notes: null,
        storeLat: "-34.5750",
        storeLng: "-58.4200",
        deliveryLat: "-34.6037",
        deliveryLng: "-58.3816",
        riderLat: null,
        riderLng: null,
      },
      {
        id: "order-3",
        customerId: "customer-user-2",
        storeId: "store-3",
        riderId: "rider-auto",
        status: "delivered",
        paymentStatus: "paid",
        paymentIntentId: null,
        total: "20500",
        address: "Calle Florida 890, Buenos Aires",
        notes: "Dejar en portería",
        storeLat: "-34.6080",
        storeLng: "-58.3700",
        deliveryLat: "-34.6050",
        deliveryLng: "-58.3750",
        riderLat: "-34.6050",
        riderLng: "-58.3750",
      },
    ];
    orders.forEach((o) => this.orders.set(o.id, o));

    const orderItems: OrderItem[] = [
      { id: "item-1", orderId: "order-1", productId: "prod-1", quantity: 2, price: "850" },
      { id: "item-2", orderId: "order-1", productId: "prod-2", quantity: 1, price: "1200" },
      { id: "item-3", orderId: "order-1", productId: "prod-3", quantity: 1, price: "2500" },
      { id: "item-4", orderId: "order-2", productId: "prod-8", quantity: 1, price: "8500" },
      { id: "item-5", orderId: "order-2", productId: "prod-9", quantity: 1, price: "12000" },
      { id: "item-6", orderId: "order-3", productId: "prod-6", quantity: 1, price: "15000" },
      { id: "item-7", orderId: "order-3", productId: "prod-7", quantity: 1, price: "5500" },
    ];
    orderItems.forEach((i) => this.orderItems.set(i.id, i));

    // Travel offers from bus companies
    const travelOffers: TravelOffer[] = [
      {
        id: "travel-1",
        companyName: "Andesmar",
        companyLogo: null,
        origin: "Buenos Aires",
        destination: "Mendoza",
        price: "45000",
        originalPrice: "65000",
        discount: "30% OFF",
        departureDate: "Diario",
        travelTime: "14 hs",
        amenities: "WiFi, Cama Suite, Comida incluida",
        externalLink: "https://www.andesmar.com",
        isActive: true,
        priority: 1,
      },
      {
        id: "travel-2",
        companyName: "Via Bariloche",
        companyLogo: null,
        origin: "Buenos Aires",
        destination: "San Carlos de Bariloche",
        price: "75000",
        originalPrice: "95000",
        discount: "21% OFF",
        departureDate: "Diario",
        travelTime: "20 hs",
        amenities: "WiFi, Cama Suite, Desayuno",
        externalLink: "https://www.viabariloche.com.ar",
        isActive: true,
        priority: 2,
      },
      {
        id: "travel-3",
        companyName: "Crucero del Norte",
        companyLogo: null,
        origin: "Buenos Aires",
        destination: "Iguazú",
        price: "68000",
        originalPrice: "85000",
        discount: "20% OFF",
        departureDate: "Lun, Mié, Vie",
        travelTime: "18 hs",
        amenities: "WiFi, Semi Cama, Aire Acond.",
        externalLink: "https://www.crucerodelnorte.com.ar",
        isActive: true,
        priority: 3,
      },
      {
        id: "travel-4",
        companyName: "Flecha Bus",
        companyLogo: null,
        origin: "Buenos Aires",
        destination: "Córdoba",
        price: "32000",
        originalPrice: "42000",
        discount: "24% OFF",
        departureDate: "Diario",
        travelTime: "10 hs",
        amenities: "WiFi, Cama Ejecutivo",
        externalLink: "https://www.flechabus.com.ar",
        isActive: true,
        priority: 4,
      },
      {
        id: "travel-5",
        companyName: "El Rápido Internacional",
        companyLogo: null,
        origin: "Buenos Aires",
        destination: "Montevideo (Uruguay)",
        price: "55000",
        originalPrice: "70000",
        discount: "21% OFF",
        departureDate: "Diario",
        travelTime: "9 hs",
        amenities: "WiFi, Cama Suite, Cruce en ferry",
        externalLink: "https://www.elrapido.com.ar",
        isActive: true,
        priority: 5,
      },
      {
        id: "travel-6",
        companyName: "Cata Internacional",
        companyLogo: null,
        origin: "Buenos Aires",
        destination: "Santiago (Chile)",
        price: "85000",
        originalPrice: "110000",
        discount: "23% OFF",
        departureDate: "Mar, Jue, Sáb",
        travelTime: "22 hs",
        amenities: "WiFi, Cama Suite, Comida, Cruce Andes",
        externalLink: "https://www.catainternacional.com",
        isActive: true,
        priority: 6,
      },
    ];
    travelOffers.forEach((t) => this.travelOffers.set(t.id, t));
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return Array.from(this.users.values()).filter((u) => u.role === role);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((u) => u.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((u) => u.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user = { id, ...insertUser } as User;
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...data } as User;
    this.users.set(id, updated);
    return updated;
  }

  async getStores(): Promise<Store[]> {
    return Array.from(this.stores.values()).filter((s) => s.isActive);
  }

  async getStore(id: string): Promise<Store | undefined> {
    return this.stores.get(id);
  }

  async getStoresByOwner(ownerId: string): Promise<Store[]> {
    return Array.from(this.stores.values()).filter((s) => s.ownerId === ownerId);
  }

  async createStore(insertStore: InsertStore): Promise<Store> {
    const id = randomUUID();
    const store = { id, ...insertStore } as Store;
    this.stores.set(id, store);
    return store;
  }

  async updateStore(id: string, data: Partial<InsertStore>): Promise<Store | undefined> {
    const store = this.stores.get(id);
    if (!store) return undefined;
    const updated = { ...store, ...data } as Store;
    this.stores.set(id, updated);
    return updated;
  }

  async deleteStore(id: string): Promise<boolean> {
    return this.stores.delete(id);
  }

  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values()).filter((p) => p.isActive);
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async getProductsByStore(storeId: string): Promise<Product[]> {
    return Array.from(this.products.values()).filter(
      (p) => p.storeId === storeId && p.isActive
    );
  }

  async getFeaturedProducts(): Promise<Product[]> {
    return Array.from(this.products.values()).filter((p) => p.isActive);
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = randomUUID();
    const product = { id, ...insertProduct } as Product;
    this.products.set(id, product);
    return product;
  }

  async updateProduct(id: string, data: Partial<InsertProduct>): Promise<Product | undefined> {
    const product = this.products.get(id);
    if (!product) return undefined;
    const updated = { ...product, ...data } as Product;
    this.products.set(id, updated);
    return updated;
  }

  async deleteProduct(id: string): Promise<boolean> {
    return this.products.delete(id);
  }

  async getOrders(): Promise<Order[]> {
    return Array.from(this.orders.values());
  }

  async getOrder(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async getOrdersByCustomer(customerId: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter((o) => o.customerId === customerId);
  }

  async getOrdersByStore(storeId: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter((o) => o.storeId === storeId);
  }

  async getOrdersByRider(riderId: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter((o) => o.riderId === riderId);
  }

  async getAvailableOrders(): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(
      (o) => o.status === "ready" && !o.riderId
    );
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = randomUUID();
    const order = { id, ...insertOrder } as Order;
    this.orders.set(id, order);
    return order;
  }

  async updateOrder(id: string, data: Partial<InsertOrder>): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;
    const updated = { ...order, ...data } as Order;
    this.orders.set(id, updated);
    return updated;
  }

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return Array.from(this.orderItems.values()).filter((i) => i.orderId === orderId);
  }

  async createOrderItem(insertItem: InsertOrderItem): Promise<OrderItem> {
    const id = randomUUID();
    const item = { id, ...insertItem } as OrderItem;
    this.orderItems.set(id, item);
    return item;
  }

  async getPromos(): Promise<Promo[]> {
    return Array.from(this.promos.values()).filter((p) => p.isActive);
  }

  async getPromoBanners(): Promise<Promo[]> {
    return Array.from(this.promos.values())
      .filter((p) => p.type === "banner" && p.isActive)
      .sort((a, b) => b.priority - a.priority);
  }

  async getPromoNotices(): Promise<Promo[]> {
    return Array.from(this.promos.values())
      .filter((p) => p.type === "notice" && p.isActive)
      .sort((a, b) => b.priority - a.priority);
  }

  async getPromoCategories(): Promise<Promo[]> {
    return Array.from(this.promos.values())
      .filter((p) => p.type === "category" && p.isActive)
      .sort((a, b) => a.priority - b.priority);
  }

  async createPromo(insertPromo: InsertPromo): Promise<Promo> {
    const id = randomUUID();
    const promo = { id, ...insertPromo } as Promo;
    this.promos.set(id, promo);
    return promo;
  }

  async updatePromo(id: string, data: Partial<InsertPromo>): Promise<Promo | undefined> {
    const promo = this.promos.get(id);
    if (!promo) return undefined;
    const updated = { ...promo, ...data } as Promo;
    this.promos.set(id, updated);
    return updated;
  }

  async deletePromo(id: string): Promise<boolean> {
    return this.promos.delete(id);
  }

  async getTravelOffers(): Promise<TravelOffer[]> {
    return Array.from(this.travelOffers.values())
      .filter((o) => o.isActive)
      .sort((a, b) => b.priority - a.priority);
  }

  async createTravelOffer(insertOffer: InsertTravelOffer): Promise<TravelOffer> {
    const id = randomUUID();
    const offer = { id, ...insertOffer } as TravelOffer;
    this.travelOffers.set(id, offer);
    return offer;
  }

  async updateTravelOffer(id: string, data: Partial<InsertTravelOffer>): Promise<TravelOffer | undefined> {
    const offer = this.travelOffers.get(id);
    if (!offer) return undefined;
    const updated = { ...offer, ...data } as TravelOffer;
    this.travelOffers.set(id, updated);
    return updated;
  }

  async deleteTravelOffer(id: string): Promise<boolean> {
    return this.travelOffers.delete(id);
  }

  async getKycDocuments(userId: string): Promise<KycDocument[]> {
    return Array.from(this.kycDocuments.values()).filter((d) => d.userId === userId);
  }

  async getKycDocument(id: string): Promise<KycDocument | undefined> {
    return this.kycDocuments.get(id);
  }

  async getPendingKycDocuments(): Promise<KycDocument[]> {
    return Array.from(this.kycDocuments.values()).filter((d) => d.status === "pending");
  }

  async createKycDocument(insertDoc: InsertKycDocument): Promise<KycDocument> {
    const id = randomUUID();
    const doc = { 
      id, 
      ...insertDoc, 
      createdAt: new Date(),
      reviewedAt: null,
      reviewedBy: null,
    } as KycDocument;
    this.kycDocuments.set(id, doc);
    return doc;
  }

  async updateKycDocument(id: string, data: Partial<KycDocument>): Promise<KycDocument | undefined> {
    const doc = this.kycDocuments.get(id);
    if (!doc) return undefined;
    const updated = { ...doc, ...data } as KycDocument;
    this.kycDocuments.set(id, updated);
    return updated;
  }

  async updateUserKycStatus(userId: string, status: KycStatus): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    const updated = { ...user, kycStatus: status } as User;
    this.users.set(userId, updated);
    return updated;
  }

  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return Array.from(this.subscriptionPlans.values()).filter((p) => p.isActive);
  }

  async getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined> {
    return this.subscriptionPlans.get(id);
  }

  async createSubscriptionPlan(insertPlan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    const id = randomUUID();
    const plan = { id, ...insertPlan } as SubscriptionPlan;
    this.subscriptionPlans.set(id, plan);
    return plan;
  }

  async getMerchantApplications(): Promise<MerchantApplication[]> {
    return Array.from(this.merchantApplications.values());
  }

  async getMerchantApplication(id: string): Promise<MerchantApplication | undefined> {
    return this.merchantApplications.get(id);
  }

  async getMerchantApplicationByUser(userId: string): Promise<MerchantApplication | undefined> {
    return Array.from(this.merchantApplications.values()).find((a) => a.userId === userId);
  }

  async getPendingMerchantApplications(): Promise<MerchantApplication[]> {
    return Array.from(this.merchantApplications.values()).filter((a) => a.status === "pending");
  }

  async createMerchantApplication(insertApp: InsertMerchantApplication): Promise<MerchantApplication> {
    const id = randomUUID();
    const app = { 
      id, 
      ...insertApp, 
      createdAt: new Date(),
      reviewedAt: null,
      reviewedBy: null,
    } as MerchantApplication;
    this.merchantApplications.set(id, app);
    return app;
  }

  async updateMerchantApplication(id: string, data: Partial<MerchantApplication>): Promise<MerchantApplication | undefined> {
    const app = this.merchantApplications.get(id);
    if (!app) return undefined;
    const updated = { ...app, ...data } as MerchantApplication;
    this.merchantApplications.set(id, updated);
    return updated;
  }

  async getRiderProfile(userId: string): Promise<RiderProfile | undefined> {
    return Array.from(this.riderProfiles.values()).find((p) => p.userId === userId);
  }

  async getRiderProfiles(): Promise<RiderProfile[]> {
    return Array.from(this.riderProfiles.values());
  }

  async getAvailableRiders(): Promise<RiderProfile[]> {
    return Array.from(this.riderProfiles.values()).filter(
      (p) => p.status === "active" && p.isAvailable
    );
  }

  async createRiderProfile(insertProfile: InsertRiderProfile): Promise<RiderProfile> {
    const id = randomUUID();
    const profile = { 
      id, 
      ...insertProfile, 
      createdAt: new Date(),
    } as RiderProfile;
    this.riderProfiles.set(id, profile);
    return profile;
  }

  async updateRiderProfile(userId: string, data: Partial<RiderProfile>): Promise<RiderProfile | undefined> {
    const profile = Array.from(this.riderProfiles.values()).find((p) => p.userId === userId);
    if (!profile) return undefined;
    const updated = { ...profile, ...data } as RiderProfile;
    this.riderProfiles.set(profile.id, updated);
    return updated;
  }

  async getRiderEarnings(riderId: string): Promise<RiderEarning[]> {
    return Array.from(this.riderEarnings.values()).filter((e) => e.riderId === riderId);
  }

  async createRiderEarning(insertEarning: InsertRiderEarning): Promise<RiderEarning> {
    const id = randomUUID();
    const earning = { 
      id, 
      ...insertEarning, 
      createdAt: new Date(),
      paidAt: null,
    } as RiderEarning;
    this.riderEarnings.set(id, earning);
    return earning;
  }

  async updateRiderEarning(id: string, data: Partial<RiderEarning>): Promise<RiderEarning | undefined> {
    const earning = this.riderEarnings.get(id);
    if (!earning) return undefined;
    const updated = { ...earning, ...data } as RiderEarning;
    this.riderEarnings.set(id, updated);
    return updated;
  }

  async getPlatformCommissions(): Promise<PlatformCommission[]> {
    return Array.from(this.platformCommissions.values());
  }

  async getPlatformCommissionsByStore(storeId: string): Promise<PlatformCommission[]> {
    return Array.from(this.platformCommissions.values()).filter((c) => c.storeId === storeId);
  }

  async createPlatformCommission(insertCommission: InsertPlatformCommission): Promise<PlatformCommission> {
    const id = randomUUID();
    const commission = {
      id,
      ...insertCommission,
      createdAt: new Date(),
      collectedAt: null,
    } as PlatformCommission;
    this.platformCommissions.set(id, commission);
    return commission;
  }

  async updatePlatformCommission(id: string, data: Partial<PlatformCommission>): Promise<PlatformCommission | undefined> {
    const commission = this.platformCommissions.get(id);
    if (!commission) return undefined;
    const updated = { ...commission, ...data } as PlatformCommission;
    this.platformCommissions.set(id, updated);
    return updated;
  }

  async getExpiredPromos(): Promise<Promo[]> {
    const now = new Date();
    return Array.from(this.promos.values()).filter(
      (p) => p.isActive && p.endDate && new Date(p.endDate) < now
    );
  }

  async deactivateExpiredPromos(): Promise<number> {
    const expired = await this.getExpiredPromos();
    for (const promo of expired) {
      const updated = { ...promo, isActive: false } as Promo;
      this.promos.set(promo.id, updated);
    }
    return expired.length;
  }

  async trackPromoImpression(id: string): Promise<void> {
    const promo = this.promos.get(id);
    if (!promo) return;
    const newImpressions = (promo.impressions || 0) + 1;
    let updated: Promo = { ...promo, impressions: newImpressions };
    // M1 — Auto-complete when maxImpressions reached
    if (promo.maxImpressions && newImpressions >= promo.maxImpressions) {
      updated = { ...updated, commercialStatus: "completed" as PromoCommercialStatus };
    }
    // M1 — Update spentAmount for CPM (cost per 1000 impressions)
    if (promo.pricingModel === "cpm" && promo.budget) {
      const cpmRate = parseFloat(promo.budget as string) / 1000;
      const newSpent = Math.min(
        parseFloat(promo.budget as string),
        (parseFloat((promo.spentAmount as string) || "0")) + cpmRate
      );
      updated = { ...updated, spentAmount: String(newSpent) };
    }
    this.promos.set(id, updated);
  }

  async trackPromoClick(id: string): Promise<void> {
    const promo = this.promos.get(id);
    if (!promo) return;
    const newClicks = (promo.clicks || 0) + 1;
    let updated: Promo = { ...promo, clicks: newClicks };
    // M1 — Auto-complete when maxClicks reached
    if (promo.maxClicks && newClicks >= promo.maxClicks) {
      updated = { ...updated, commercialStatus: "completed" as PromoCommercialStatus };
    }
    // M1 — Update spentAmount for CPC (cost per click)
    if (promo.pricingModel === "cpc" && promo.budget) {
      const cpcRate = promo.maxClicks ? parseFloat(promo.budget as string) / promo.maxClicks : 0;
      const newSpent = Math.min(
        parseFloat(promo.budget as string),
        (parseFloat((promo.spentAmount as string) || "0")) + cpcRate
      );
      updated = { ...updated, spentAmount: String(newSpent) };
    }
    this.promos.set(id, updated);
  }

  async getPromoBannersByLocation(provinciaId?: string, ciudadId?: string, userLat?: number, userLng?: number): Promise<Promo[]> {
    const now = new Date();
    return Array.from(this.promos.values())
      .filter((p) => {
        if (!p.isActive || p.type !== "banner") return false;
        // M1 — Filtrar por commercialStatus; solo "active" se muestra
        const cStatus = p.commercialStatus ?? "active";
        if (cStatus !== "active") return false;
        if (p.startDate && new Date(p.startDate) > now) return false;
        if (p.endDate && new Date(p.endDate) < now) return false;
        if (p.targetType === "global") return true;
        if (p.targetType === "province" && provinciaId && p.targetProvince === provinciaId) return true;
        if (p.targetType === "city" && ciudadId && p.targetCity === ciudadId) return true;
        if (p.targetType === "radius") {
          const bLat = p.targetLat != null ? parseFloat(p.targetLat as string) : null;
          const bLng = p.targetLng != null ? parseFloat(p.targetLng as string) : null;
          const bRadius = p.targetRadiusKm != null ? Number(p.targetRadiusKm) : null;
          if (bLat == null || bLng == null || bRadius == null) return false;
          if (userLat == null || userLng == null) return false;
          return haversineKm(userLat, userLng, bLat, bLng) <= bRadius;
        }
        return false;
      })
      .sort((a, b) => b.priority - a.priority);
  }

  async updatePromoCommercialStatus(id: string, status: PromoCommercialStatus): Promise<Promo | undefined> {
    const promo = this.promos.get(id);
    if (!promo) return undefined;
    const updated = { ...promo, commercialStatus: status } as Promo;
    this.promos.set(id, updated);
    return updated;
  }

  // M2 — Tiendas y productos destacados
  async getFeaturedStores(): Promise<Store[]> {
    const now = new Date();
    return Array.from(this.stores.values())
      .filter((s) => {
        if (!s.isActive || !s.isFeatured) return false;
        if (s.featuredUntil && new Date(s.featuredUntil) < now) return false;
        return true;
      })
      .sort((a, b) => (b.featuredScore ?? 0) - (a.featuredScore ?? 0));
  }

  async updateStoreFeatured(id: string, isFeatured: boolean, featuredUntil?: Date | null, featuredScore?: number): Promise<Store | undefined> {
    const store = this.stores.get(id);
    if (!store) return undefined;
    const updated = {
      ...store,
      isFeatured,
      featuredUntil: featuredUntil !== undefined ? featuredUntil : store.featuredUntil,
      featuredScore: featuredScore !== undefined ? featuredScore : store.featuredScore,
    } as Store;
    this.stores.set(id, updated);
    return updated;
  }

  async updateProductSponsored(id: string, isSponsored: boolean, sponsoredUntil?: Date | null, sponsoredPriority?: number): Promise<Product | undefined> {
    const product = this.products.get(id);
    if (!product) return undefined;
    const updated = {
      ...product,
      isSponsored,
      sponsoredUntil: sponsoredUntil !== undefined ? sponsoredUntil : product.sponsoredUntil,
      sponsoredPriority: sponsoredPriority !== undefined ? sponsoredPriority : product.sponsoredPriority,
    } as Product;
    this.products.set(id, updated);
    return updated;
  }

  // M5 — Facturación publicitaria
  async getAdBillings(): Promise<AdBilling[]> {
    return Array.from(this.adBillings.values()).sort(
      (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getAdBillingsByPromo(promoId: string): Promise<AdBilling[]> {
    return Array.from(this.adBillings.values()).filter((b) => b.promoId === promoId);
  }

  async createAdBilling(insertBilling: InsertAdBilling): Promise<AdBilling> {
    const id = randomUUID();
    const billing = { id, ...insertBilling, createdAt: new Date() } as AdBilling;
    this.adBillings.set(id, billing);
    return billing;
  }

  async updateAdBilling(id: string, data: Partial<AdBilling>): Promise<AdBilling | undefined> {
    const billing = this.adBillings.get(id);
    if (!billing) return undefined;
    const updated = { ...billing, ...data } as AdBilling;
    this.adBillings.set(id, updated);
    return updated;
  }

  async createReview(review: InsertReview): Promise<Review> {
    const r: Review = { ...review, id: randomUUID(), createdAt: new Date() };
    return r;
  }
  async getReviewsByStore(_storeId: string): Promise<Review[]> { return []; }
  async getReviewByOrderAndUser(_orderId: string, _userId: string): Promise<Review | undefined> { return undefined; }
  async getAverageRating(_storeId: string): Promise<number> { return 0; }

  async searchProducts(q: string, _category?: string, limit = 20): Promise<Product[]> {
    const ql = q.toLowerCase();
    return Array.from(this.products.values())
      .filter((p) => p.isActive && (p.name.toLowerCase().includes(ql) || (p.description ?? "").toLowerCase().includes(ql)))
      .slice(0, limit);
  }
  async searchStores(q: string, _category?: string, limit = 10): Promise<Store[]> {
    const ql = q.toLowerCase();
    return Array.from(this.stores.values())
      .filter((s) => s.isActive && (s.name.toLowerCase().includes(ql) || (s.description ?? "").toLowerCase().includes(ql)))
      .slice(0, limit);
  }

  async createDispute(dispute: InsertDispute): Promise<Dispute> {
    const d: Dispute = { ...dispute, id: randomUUID(), status: "pending", resolution: null, adminId: null, createdAt: new Date(), updatedAt: new Date() };
    return d;
  }
  async getDisputesByUser(_userId: string): Promise<Dispute[]> { return []; }
  async getDisputeByOrder(_orderId: string): Promise<Dispute | undefined> { return undefined; }
  async getAllDisputes(): Promise<Dispute[]> { return []; }
  async updateDisputeStatus(_id: string, status: DisputeStatus, _resolution?: string, _adminId?: string): Promise<Dispute> {
    return {} as Dispute;
  }

  async createTravelBooking(booking: InsertTravelBooking): Promise<TravelBooking> {
    const b: TravelBooking = { ...booking, id: randomUUID(), createdAt: new Date(), status: booking.status ?? "confirmed", seats: booking.seats ?? 1 };
    return b;
  }
  async getTravelBookingsByUser(_userId: string): Promise<TravelBooking[]> { return []; }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    return { ...notification, id: randomUUID(), isRead: false, createdAt: new Date() };
  }
  async getNotificationsByUser(_userId: string): Promise<Notification[]> { return []; }
  async getUnreadNotificationCount(_userId: string): Promise<number> { return 0; }
  async markNotificationRead(_id: string, _userId: string): Promise<void> {}
  async markAllNotificationsRead(_userId: string): Promise<void> {}

  async getFavoritesByUser(_userId: string, _type?: FavoriteType): Promise<Favorite[]> { return []; }
  async addFavorite(data: InsertFavorite): Promise<Favorite> {
    return { ...data, id: randomUUID(), createdAt: new Date() };
  }
  async removeFavorite(_userId: string, _targetId: string, _type: FavoriteType): Promise<boolean> { return false; }
  async isFavorite(_userId: string, _targetId: string, _type: FavoriteType): Promise<boolean> { return false; }

  async setPasswordResetToken(_userId: string, _token: string, _expiry: Date): Promise<void> {}
  async getUserByResetToken(_token: string): Promise<User | undefined> { return undefined; }
  async clearPasswordResetToken(_userId: string): Promise<void> {}

  async followStore(_userId: string, _storeId: string): Promise<void> {}
  async unfollowStore(_userId: string, _storeId: string): Promise<void> {}
  async isFollowingStore(_userId: string, _storeId: string): Promise<boolean> { return false; }
  async getStoreFollowersCount(_storeId: string): Promise<number> { return 0; }
  async getFollowedStoreIds(_userId: string): Promise<string[]> { return []; }
}

export const storage = new MemStorage();
