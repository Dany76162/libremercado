import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import OpenAI from "openai";
import { storage } from "../storage-instance";
import { requireAuth, requireRole, getCurrentUser, hashPassword, verifyPassword } from "../auth";
import { getStripePublishableKey } from "../stripeClient";
import { paymentService } from "../payments";
import {
  uploadProduct,
  uploadStore,
  uploadAvatar,
  uploadKyc,
  uploadPromo,
  uploadVideo,
  uploadThumbnail,
  uploadInstitucional,
  processUpload,
} from "../upload";
import rateLimit from "express-rate-limit";

const isTestEnv = process.env.NODE_ENV === "test";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTestEnv ? 10_000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos. Esperá 15 minutos antes de intentar de nuevo." },
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTestEnv ? 10_000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados registros. Esperá 15 minutos." },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTestEnv ? 10_000 : 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas solicitudes de recuperación. Esperá 15 minutos." },
});
import { broadcastOrderStatus } from "../ws";
import {
  sendOrderConfirmationEmail,
  sendMerchantNewOrderEmail,
  sendPasswordResetEmail,
  sendDisputeStatusEmail,
} from "../email";

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || "placeholder",
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
}
const openai = { chat: { completions: { create: async (...args: any[]) => getOpenAI().chat.completions.create(...args) } } };

// ==================== HELPERS ====================

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

async function getUserSubscriptionTier(userId: string): Promise<string> {
  const stores = await storage.getStoresByOwner(userId);
  if (stores.length > 0) {
    const best = stores.reduce((prev, cur) => {
      const order = ["free", "basic", "premium"];
      return order.indexOf(cur.subscriptionTier) > order.indexOf(prev.subscriptionTier) ? cur : prev;
    });
    return best.subscriptionTier;
  }
  return "free";
}

const AI_FREE_LIMIT = 1;

// ==================== PROMO TRACKING DEDUPLICATION ====================
// In-memory TTL cache: prevents same IP from inflating metrics within 60s
const promoTrackCache = new Map<string, number>();
const PROMO_TRACK_TTL_MS = 60_000;

function isRecentlyTracked(promoId: string, ip: string): boolean {
  const key = `${promoId}:${ip}`;
  const now = Date.now();
  const cutoff = now - PROMO_TRACK_TTL_MS;
  Array.from(promoTrackCache.entries()).forEach(([k, t]) => {
    if (t < cutoff) promoTrackCache.delete(k);
  });
  if (promoTrackCache.has(key)) return true;
  promoTrackCache.set(key, now);
  return false;
}

const registerSchema = z.object({
  username: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  phone: z.string().optional(),
  address: z.string().optional(),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "Debés aceptar los términos y condiciones",
  }),
});

const kycDocumentSchema = z.object({
  docType: z.enum(["dni_front", "dni_back", "passport", "selfie"]),
  imageUrl: z.string().url("URL de imagen inválida"),
});

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Get current authenticated user
  app.get("/api/auth/user", async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.json(null);
    }
    // Don't send password hash to client
    const { password, ...safeUser } = user;
    res.json(safeUser);
  });

  // Register new user
  app.post("/api/auth/register", registerLimiter, async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      
      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(data.email);
      if (existingEmail) {
        return res.status(400).json({ error: "Este email ya está registrado" });
      }

      // Check if username already exists
      const existingUsername = await storage.getUserByUsername(data.username);
      if (existingUsername) {
        return res.status(400).json({ error: "Este nombre de usuario ya está en uso" });
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(data.password);
      const user = await storage.createUser({
        username: data.username,
        email: data.email,
        password: hashedPassword,
        role: "customer",
        phone: data.phone || null,
        address: data.address || null,
        avatar: null,
        vehicleType: null,
        termsAccepted: true,
        termsAcceptedAt: new Date(),
        kycStatus: "none",
      });

      // Set session
      req.session.userId = user.id;

      // Don't send password hash to client
      const { password, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: "Error al registrar usuario" });
    }
  });

  // Login
  app.post("/api/auth/login", loginLimiter, async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);

      const user = await storage.getUserByEmail(data.email);
      if (!user) {
        return res.status(401).json({ error: "Email o contraseña incorrectos" });
      }

      const validPassword = await verifyPassword(data.password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Email o contraseña incorrectos" });
      }

      // Set session
      req.session.userId = user.id;

      // Don't send password hash to client
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: "Error al iniciar sesión" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Error al cerrar sesión" });
      }
      res.json({ message: "Sesión cerrada exitosamente" });
    });
  });

  // Forgot password — generate token + send email
  app.post("/api/auth/forgot-password", forgotPasswordLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "Email requerido" });
      const user = await storage.getUserByEmail(email);
      // Always respond OK so we don't leak user existence
      if (user) {
        const { randomBytes } = await import("crypto");
        const token = randomBytes(32).toString("hex");
        const expiry = new Date(Date.now() + 3600 * 1000); // 1 hour
        await storage.setPasswordResetToken(user.id, token, expiry);
        await sendPasswordResetEmail(user.email, user.username, token).catch(() => {});
      }
      res.json({ message: "Si ese email existe, te enviamos un enlace de recuperación" });
    } catch (error) {
      res.status(500).json({ error: "Error al procesar solicitud" });
    }
  });

  // Reset password with token
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) return res.status(400).json({ error: "Token y contraseña requeridos" });
      if (newPassword.length < 6) return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
      const user = await storage.getUserByResetToken(token);
      if (!user) return res.status(400).json({ error: "Token inválido o expirado" });
      const hashed = await hashPassword(newPassword);
      await storage.updateUser(user.id, { password: hashed } as any);
      await storage.clearPasswordResetToken(user.id);
      res.json({ message: "Contraseña actualizada correctamente" });
    } catch (error) {
      res.status(500).json({ error: "Error al restablecer contraseña" });
    }
  });

  app.get("/api/users", requireRole("admin"), async (req, res) => {
    const users = await storage.getUsers();
    res.json(users);
  });

  app.get("/api/users/role/:role", requireRole("admin"), async (req, res) => {
    const users = await storage.getUsersByRole(req.params.role);
    res.json(users);
  });

  app.get("/api/users/:id", requireAuth, async (req, res) => {
    const me = await getCurrentUser(req);
    if (!me) return res.status(401).json({ error: "No autenticado" });
    // Only allow users to fetch their own profile; admins can fetch any
    if (me.role !== "admin" && me.id !== req.params.id) {
      return res.status(403).json({ error: "Acceso no autorizado" });
    }
    const user = await storage.getUser(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    const { password, passwordResetToken, passwordResetExpiry, ...safeUser } = user;
    res.json(safeUser);
  });

  // ==================== LOCATION PREFERENCES ====================
  app.get("/api/account/location-preferences", requireAuth, async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "No autenticado" });
    res.json({
      provinciaId: user.locationProvinciaId ?? null,
      ciudadId: user.locationCiudadId ?? null,
      lat: user.locationLat ? parseFloat(user.locationLat as string) : null,
      lng: user.locationLng ? parseFloat(user.locationLng as string) : null,
      radiusKm: user.locationRadiusKm ?? 25,
    });
  });

  app.put("/api/account/location-preferences", requireAuth, async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "No autenticado" });
    const { provinciaId, ciudadId, lat, lng, radiusKm } = req.body;
    const locationUpdate: Parameters<typeof storage.updateUser>[1] = {
      locationProvinciaId: (provinciaId as string) ?? null,
      locationCiudadId: (ciudadId as string) ?? null,
      locationLat: lat != null ? String(lat) : null,
      locationLng: lng != null ? String(lng) : null,
      locationRadiusKm: (radiusKm as number) ?? 25,
    };
    const updated = await storage.updateUser(user.id, locationUpdate);
    if (!updated) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json({
      provinciaId: updated.locationProvinciaId ?? null,
      ciudadId: updated.locationCiudadId ?? null,
      lat: updated.locationLat ? parseFloat(updated.locationLat as string) : null,
      lng: updated.locationLng ? parseFloat(updated.locationLng as string) : null,
      radiusKm: updated.locationRadiusKm ?? 25,
    });
  });

  // KYC Routes
  app.get("/api/kyc/documents", requireAuth, async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "No autenticado" });
    }
    const documents = await storage.getKycDocuments(user.id);
    res.json(documents);
  });

  app.post("/api/kyc/documents", requireAuth, async (req, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "No autenticado" });
      }

      const data = kycDocumentSchema.parse(req.body);
      
      const document = await storage.createKycDocument({
        userId: user.id,
        docType: data.docType,
        imageUrl: data.imageUrl,
        status: "pending",
        rejectionReason: null,
      });

      // Update user KYC status to pending
      await storage.updateUserKycStatus(user.id, "pending");

      res.status(201).json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: "Error al subir documento" });
    }
  });

  app.get("/api/kyc/status", requireAuth, async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "No autenticado" });
    }
    const documents = await storage.getKycDocuments(user.id);
    res.json({
      status: user.kycStatus,
      documents: documents,
    });
  });

  // Admin platform statistics
  app.get("/api/admin/stats", requireRole("admin"), async (req, res) => {
    const [users, stores, products, orders, pendingMerchants, pendingRiders, pendingKyc, featuredProducts] = await Promise.all([
      storage.getUsers(),
      storage.getStores(),
      storage.getProducts(),
      storage.getOrders(),
      storage.getPendingMerchantApplications(),
      storage.getRiderProfiles(),
      storage.getPendingKycDocuments(),
      storage.getFeaturedProducts(),
    ]);

    const totalRevenue = orders.reduce((sum, order) => {
      return sum + parseFloat(order.total || "0");
    }, 0);

    const ordersByStatus = {
      pending: orders.filter(o => o.status === "pending").length,
      confirmed: orders.filter(o => o.status === "confirmed").length,
      preparing: orders.filter(o => o.status === "preparing").length,
      ready: orders.filter(o => o.status === "ready").length,
      in_transit: orders.filter(o => o.status === "in_transit").length,
      delivered: orders.filter(o => o.status === "delivered").length,
      cancelled: orders.filter(o => o.status === "cancelled").length,
    };

    const usersByRole = {
      customer: users.filter(u => u.role === "customer").length,
      merchant: users.filter(u => u.role === "merchant").length,
      rider: users.filter(u => u.role === "rider").length,
      admin: users.filter(u => u.role === "admin").length,
    };

    const pendingRidersCount = pendingRiders.filter(r => r.status === "pending").length;
    const activeRiders = pendingRiders.filter(r => r.status === "active" && r.isAvailable).length;

    res.json({
      users: {
        total: users.length,
        byRole: usersByRole,
      },
      stores: {
        total: stores.length,
        active: stores.filter(s => s.isActive).length,
      },
      products: {
        total: products.length,
        featured: featuredProducts.length,
      },
      orders: {
        total: orders.length,
        byStatus: ordersByStatus,
        totalRevenue: totalRevenue.toFixed(2),
      },
      pending: {
        merchants: pendingMerchants.length,
        riders: pendingRidersCount,
        kyc: pendingKyc.length,
      },
      riders: {
        total: pendingRiders.length,
        active: activeRiders,
      },
    });
  });

  // System health check
  app.get("/api/admin/health", requireRole("admin"), async (req, res) => {
    const checks: { name: string; status: "ok" | "error" | "warning"; latency?: number; detail?: string; message?: string }[] = [];
    const startedAt = Date.now();

    const check = async (name: string, fn: () => Promise<string | undefined>) => {
      const t = Date.now();
      try {
        const detail = await fn();
        checks.push({ name, status: "ok", latency: Date.now() - t, detail });
      } catch (err: any) {
        checks.push({ name, status: "error", latency: Date.now() - t, message: err?.message ?? "Error desconocido" });
      }
    };

    await check("Base de datos (PostgreSQL)", async () => {
      const users = await storage.getUsers();
      return `${users.length} usuarios registrados`;
    });

    await check("Módulo Usuarios", async () => {
      const u = await storage.getUsers();
      const roles = ["admin","merchant","rider","official","customer"];
      const breakdown = roles.map(r => `${r}: ${u.filter(x=>x.role===r).length}`).join(", ");
      return breakdown;
    });

    await check("Módulo Comercios", async () => {
      const items = await storage.getStores();
      return `${items.length} tiendas activas`;
    });

    await check("Módulo Productos", async () => {
      const items = await storage.getProducts();
      return `${items.length} productos`;
    });

    await check("Módulo Pedidos", async () => {
      const items = await storage.getOrders();
      const pending = items.filter(o => o.status === "pending").length;
      return `${items.length} totales, ${pending} pendientes`;
    });

    await check("Módulo Riders", async () => {
      const items = await storage.getRiderProfiles();
      const active = items.filter(r => r.isAvailable).length;
      return `${items.length} registrados, ${active} disponibles`;
    });

    await check("Módulo Novedades", async () => {
      const entities = await storage.getPublicEntities({});
      return `${entities.length} entidades institucionales`;
    });

    await check("KYC / Verificación", async () => {
      const docs = await storage.getPendingKycDocuments();
      return `${docs.length} documentos pendientes`;
    });

    await check("Módulo Videos (ReelMark)", async () => {
      const videos = await storage.getVideoFeed({});
      return `${videos.length} videos publicados`;
    });

    const { existsSync } = await import("fs");
    const { join } = await import("path");
    const uploadsOk = existsSync(join(process.cwd(), "uploads"));
    checks.push({
      name: "Servicio de archivos (Upload)",
      status: uploadsOk ? "ok" : "warning",
      detail: uploadsOk ? "Directorio accesible" : undefined,
      message: uploadsOk ? undefined : "Directorio /uploads no encontrado",
    });

    const hasError = checks.some(c => c.status === "error");
    const hasWarning = checks.some(c => c.status === "warning");
    res.json({
      status: hasError ? "degraded" : hasWarning ? "warning" : "healthy",
      uptime: Math.floor(process.uptime()),
      checkedAt: new Date().toISOString(),
      totalMs: Date.now() - startedAt,
      checks,
    });
  });

  // Admin KYC management routes
  app.get("/api/admin/kyc/pending", requireRole("admin"), async (req, res) => {
    const documents = await storage.getPendingKycDocuments();
    // Get user info for each document
    const documentsWithUsers = await Promise.all(
      documents.map(async (doc) => {
        const user = await storage.getUser(doc.userId);
        return {
          ...doc,
          user: user ? { id: user.id, username: user.username, email: user.email } : null,
        };
      })
    );
    res.json(documentsWithUsers);
  });

  app.patch("/api/admin/kyc/:docId/approve", requireRole("admin"), async (req, res) => {
    const adminUser = await getCurrentUser(req);
    if (!adminUser) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const document = await storage.getKycDocument(req.params.docId);
    if (!document) {
      return res.status(404).json({ error: "Documento no encontrado" });
    }

    // Approve the document
    const updatedDoc = await storage.updateKycDocument(req.params.docId, {
      status: "approved",
      reviewedAt: new Date(),
      reviewedBy: adminUser.id,
    });

    // Check if all documents for this user are approved
    const userDocs = await storage.getKycDocuments(document.userId);
    const allApproved = userDocs.every((d) => d.status === "approved" || d.id === req.params.docId);
    
    if (allApproved && userDocs.length >= 2) {
      // Require at least 2 docs (front and back of ID)
      await storage.updateUserKycStatus(document.userId, "approved");
    }

    res.json(updatedDoc);
  });

  app.patch("/api/admin/kyc/:docId/reject", requireRole("admin"), async (req, res) => {
    const adminUser = await getCurrentUser(req);
    if (!adminUser) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const { reason } = req.body;
    
    const document = await storage.getKycDocument(req.params.docId);
    if (!document) {
      return res.status(404).json({ error: "Documento no encontrado" });
    }

    // Reject the document
    const updatedDoc = await storage.updateKycDocument(req.params.docId, {
      status: "rejected",
      rejectionReason: reason || "Documento rechazado",
      reviewedAt: new Date(),
      reviewedBy: adminUser.id,
    });

    // Update user KYC status to rejected
    await storage.updateUserKycStatus(document.userId, "rejected");

    res.json(updatedDoc);
  });

  // M2 — Tiendas destacadas
  app.get("/api/stores/featured", async (req, res) => {
    const { provinciaId, ciudadId, lat, lng, radiusKm } = req.query;
    let stores = await storage.getFeaturedStores();
    const userLat = lat && typeof lat === "string" ? parseFloat(lat) : null;
    const userLng = lng && typeof lng === "string" ? parseFloat(lng) : null;
    const radius = radiusKm && typeof radiusKm === "string" ? parseFloat(radiusKm) : null;
    if (userLat !== null && userLng !== null && radius !== null) {
      stores = stores.filter((s) => {
        const sLat = s.lat ? parseFloat(s.lat as string) : null;
        const sLng = s.lng ? parseFloat(s.lng as string) : null;
        return sLat && sLng && haversineKm(userLat, userLng, sLat, sLng) <= radius;
      });
    } else if (provinciaId && typeof provinciaId === "string") {
      stores = stores.filter((s) => s.provinciaId === provinciaId);
      if (ciudadId && typeof ciudadId === "string") {
        stores = stores.filter((s) => s.ciudadId === ciudadId);
      }
    }
    res.json(stores);
  });

  // ==================== UPLOAD ROUTES ====================

  app.post("/api/upload/product", requireAuth, (req, res) => {
    uploadProduct(req, res, async (err) => {
      if (err) return res.status(400).json({ message: err.message });
      if (!req.file) return res.status(400).json({ message: "No se recibió ningún archivo" });
      try {
        const url = await processUpload(req.file, "products", true, false);
        res.json({ url });
      } catch (e: any) { res.status(400).json({ message: e.message }); }
    });
  });

  app.post("/api/upload/store", requireAuth, (req, res) => {
    uploadStore(req, res, async (err) => {
      if (err) return res.status(400).json({ message: err.message });
      if (!req.file) return res.status(400).json({ message: "No se recibió ningún archivo" });
      try {
        const url = await processUpload(req.file, "stores", true, false);
        res.json({ url });
      } catch (e: any) { res.status(400).json({ message: e.message }); }
    });
  });

  app.post("/api/upload/avatar", requireAuth, (req, res) => {
    uploadAvatar(req, res, async (err) => {
      if (err) return res.status(400).json({ message: err.message });
      if (!req.file) return res.status(400).json({ message: "No se recibió ningún archivo" });
      try {
        const url = await processUpload(req.file, "avatars", true, false);
        res.json({ url });
      } catch (e: any) { res.status(400).json({ message: e.message }); }
    });
  });

  app.post("/api/upload/kyc", requireAuth, (req, res) => {
    uploadKyc(req, res, async (err) => {
      if (err) return res.status(400).json({ message: err.message });
      if (!req.file) return res.status(400).json({ message: "No se recibió ningún archivo" });
      try {
        const url = await processUpload(req.file, "kyc", true, false);
        res.json({ url });
      } catch (e: any) { res.status(400).json({ message: e.message }); }
    });
  });

  app.post("/api/upload/promo", requireAuth, (req, res) => {
    uploadPromo(req, res, async (err) => {
      if (err) return res.status(400).json({ message: err.message });
      if (!req.file) return res.status(400).json({ message: "No se recibió ningún archivo" });
      try {
        const url = await processUpload(req.file, "promos", true, false);
        res.json({ url });
      } catch (e: any) { res.status(400).json({ message: e.message }); }
    });
  });

  app.get("/api/stores", async (req, res) => {
    const { provinciaId, ciudadId, lat, lng, radiusKm } = req.query;
    let stores = await storage.getStores();

    const userLat = lat && typeof lat === "string" ? parseFloat(lat) : null;
    const userLng = lng && typeof lng === "string" ? parseFloat(lng) : null;
    const radius = radiusKm && typeof radiusKm === "string" ? parseFloat(radiusKm) : null;
    const now = new Date();

    // M4 — Ranking comercial
    const commercialScore = (s: typeof stores[0], dist: number): number => {
      const base = userLat && userLng ? 100 / (dist + 1) : 50;
      const featuredBonus = s.isFeatured && (!s.featuredUntil || new Date(s.featuredUntil) > now) ? 20 : 0;
      const priorityBonus = s.featuredScore ?? 0;
      return base + featuredBonus + priorityBonus;
    };

    if (userLat !== null && userLng !== null && radius !== null) {
      stores = stores
        .map((s) => {
          const storeLat = s.lat ? parseFloat(s.lat as string) : null;
          const storeLng = s.lng ? parseFloat(s.lng as string) : null;
          const dist = storeLat && storeLng ? haversineKm(userLat, userLng, storeLat, storeLng) : 99999;
          return { store: s, dist, score: commercialScore(s, dist) };
        })
        .filter(({ dist }) => dist <= radius)
        .sort((a, b) => b.score - a.score)
        .map(({ store }) => store);
    } else if (provinciaId && typeof provinciaId === "string") {
      stores = stores
        .filter((s) => s.provinciaId === provinciaId && (!ciudadId || s.ciudadId === ciudadId))
        .sort((a, b) => commercialScore(b, 50) - commercialScore(a, 50));
    }

    res.json(stores);
  });

  app.get("/api/stores/:id", async (req, res) => {
    const store = await storage.getStore(req.params.id);
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }
    res.json(store);
  });

  app.get("/api/stores/:id/products", async (req, res) => {
    const products = await storage.getProductsByStore(req.params.id);
    res.json(products);
  });

  app.post("/api/stores", requireRole("merchant", "admin"), async (req, res) => {
    try {
      const store = await storage.createStore(req.body);
      res.status(201).json(store);
    } catch (error) {
      res.status(400).json({ error: "Failed to create store" });
    }
  });

  app.patch("/api/stores/:id", requireRole("merchant", "admin"), async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "No autenticado" });

    const existing = await storage.getStore(req.params.id);
    if (!existing) return res.status(404).json({ error: "Tienda no encontrada" });

    if (user.role !== "admin" && existing.ownerId !== user.id) {
      return res.status(403).json({ error: "No tenés permiso para editar esta tienda" });
    }

    const store = await storage.updateStore(req.params.id, req.body);
    res.json(store);
  });

  app.delete("/api/stores/:id", requireRole("admin"), async (req, res) => {
    const deleted = await storage.deleteStore(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Store not found" });
    }
    res.status(204).send();
  });

  app.get("/api/products", async (req, res) => {
    const { provinciaId, ciudadId, lat, lng, radiusKm } = req.query;
    let products = await storage.getProducts();

    const userLat = lat && typeof lat === "string" ? parseFloat(lat) : null;
    const userLng = lng && typeof lng === "string" ? parseFloat(lng) : null;
    const radius = radiusKm && typeof radiusKm === "string" ? parseFloat(radiusKm) : null;
    const now = new Date();

    // M4 — Ranking comercial para productos
    const productScore = (p: typeof products[0]): number => {
      const sponsoredBonus = p.isSponsored && (!p.sponsoredUntil || new Date(p.sponsoredUntil) > now) ? 30 : 0;
      const availabilityBonus = p.stock > 0 ? 5 : 0;
      return sponsoredBonus + availabilityBonus + (p.sponsoredPriority ?? 0);
    };

    if (userLat !== null && userLng !== null && radius !== null) {
      const allStores = await storage.getStores();
      const nearbyStoreIds = new Set(
        allStores
          .filter((s) => {
            const sLat = s.lat ? parseFloat(s.lat as string) : null;
            const sLng = s.lng ? parseFloat(s.lng as string) : null;
            return sLat && sLng && haversineKm(userLat, userLng, sLat, sLng) <= radius;
          })
          .map((s) => s.id)
      );
      products = products
        .filter((p) => nearbyStoreIds.has(p.storeId))
        .sort((a, b) => productScore(b) - productScore(a));
    } else if (provinciaId && typeof provinciaId === "string") {
      const stores = await storage.getStores();
      const storeIds = new Set(
        stores
          .filter((s) => {
            if (s.provinciaId !== provinciaId) return false;
            if (ciudadId && typeof ciudadId === "string" && s.ciudadId !== ciudadId) return false;
            return true;
          })
          .map((s) => s.id)
      );
      products = products
        .filter((p) => storeIds.has(p.storeId))
        .sort((a, b) => productScore(b) - productScore(a));
    } else {
      products = products.sort((a, b) => productScore(b) - productScore(a));
    }

    res.json(products);
  });

  app.get("/api/products/featured", async (req, res) => {
    const { provinciaId, ciudadId, lat, lng, radiusKm } = req.query;
    let products = await storage.getFeaturedProducts();

    const userLat = lat && typeof lat === "string" ? parseFloat(lat) : null;
    const userLng = lng && typeof lng === "string" ? parseFloat(lng) : null;
    const radius = radiusKm && typeof radiusKm === "string" ? parseFloat(radiusKm) : null;

    if (userLat !== null && userLng !== null && radius !== null) {
      const allStores = await storage.getStores();
      const storeDistances = new Map<string, number>();
      for (const s of allStores) {
        const sLat = s.lat ? parseFloat(s.lat as string) : null;
        const sLng = s.lng ? parseFloat(s.lng as string) : null;
        if (sLat && sLng) {
          const dist = haversineKm(userLat, userLng, sLat, sLng);
          if (dist <= radius) storeDistances.set(s.id, dist);
        }
      }
      products = products
        .filter((p) => storeDistances.has(p.storeId))
        .sort((a, b) => (storeDistances.get(a.storeId) ?? 99999) - (storeDistances.get(b.storeId) ?? 99999));
    } else if (provinciaId && typeof provinciaId === "string") {
      const stores = await storage.getStores();
      const storeIds = new Set(
        stores
          .filter((s) => {
            if (s.provinciaId !== provinciaId) return false;
            if (ciudadId && typeof ciudadId === "string" && s.ciudadId !== ciudadId) return false;
            return true;
          })
          .map((s) => s.id)
      );
      products = products.filter((p) => storeIds.has(p.storeId));
    }

    res.json(products.slice(0, 10));
  });

  app.get("/api/products/discounted", async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const limit = parseInt((req.query.limit as string) || "8", 10);
      const result = await storage.getDiscountedProducts(category, limit);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: "Error fetching discounted products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    const product = await storage.getProduct(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
  });

  app.post("/api/products", requireRole("merchant", "admin"), async (req, res) => {
    try {
      const product = await storage.createProduct(req.body);
      res.status(201).json(product);
    } catch (error) {
      res.status(400).json({ error: "Failed to create product" });
    }
  });

  app.patch("/api/products/:id", requireRole("merchant", "admin"), async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "No autenticado" });

    const product = await storage.getProduct(req.params.id);
    if (!product) return res.status(404).json({ error: "Producto no encontrado" });

    if (user.role !== "admin") {
      const store = await storage.getStore(product.storeId);
      if (!store || store.ownerId !== user.id) {
        return res.status(403).json({ error: "No tenés permiso para editar este producto" });
      }
    }

    const updated = await storage.updateProduct(req.params.id, req.body);
    res.json(updated);
  });

  app.delete("/api/products/:id", requireRole("merchant", "admin"), async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "No autenticado" });

    const product = await storage.getProduct(req.params.id);
    if (!product) return res.status(404).json({ error: "Producto no encontrado" });

    if (user.role !== "admin") {
      const store = await storage.getStore(product.storeId);
      if (!store || store.ownerId !== user.id) {
        return res.status(403).json({ error: "No tenés permiso para eliminar este producto" });
      }
    }

    await storage.deleteProduct(req.params.id);
    res.status(204).send();
  });

  app.get("/api/orders", requireAuth, async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "No autenticado" });

    if (user.role === "admin") {
      return res.json(await storage.getOrders());
    }
    if (user.role === "merchant") {
      const merchantStores = await storage.getStoresByOwner(user.id);
      const ordersPerStore = await Promise.all(
        merchantStores.map((s) => storage.getOrdersByStore(s.id))
      );
      return res.json(ordersPerStore.flat());
    }
    if (user.role === "rider") {
      return res.json(await storage.getOrdersByRider(user.id));
    }
    return res.json(await storage.getOrdersByCustomer(user.id));
  });

  app.get("/api/orders/:id", requireAuth, async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "No autenticado" });

    const order = await storage.getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: "Pedido no encontrado" });

    const isCustomer = order.customerId === user.id;
    const isRider = order.riderId === user.id;
    const isAdmin = user.role === "admin";
    let isMerchant = false;
    if (user.role === "merchant") {
      const store = await storage.getStore(order.storeId);
      isMerchant = !!store && store.ownerId === user.id;
    }

    if (!isCustomer && !isRider && !isAdmin && !isMerchant) {
      return res.status(403).json({ error: "No tenés acceso a este pedido" });
    }

    const items = await storage.getOrderItems(req.params.id);
    res.json({ ...order, items });
  });

  app.get("/api/orders/store/:storeId", requireRole("merchant", "admin"), async (req, res) => {
    const orders = await storage.getOrdersByStore(req.params.storeId);
    res.json(orders);
  });

  app.get("/api/orders/rider/available", requireRole("rider", "admin"), async (req, res) => {
    const orders = await storage.getAvailableOrders();
    res.json(orders);
  });

  app.get("/api/orders/rider/assigned", requireRole("rider", "admin"), async (req, res) => {
    const orders = await storage.getOrdersByRider("demo-rider");
    res.json(orders);
  });

  app.post("/api/orders", requireAuth, async (req, res) => {
    try {
      const { items, ...orderData } = req.body;
      const order = await storage.createOrder(orderData);
      
      if (items && Array.isArray(items)) {
        for (const item of items) {
          const product = await storage.getProduct(item.productId);
          if (product) {
            await storage.createOrderItem({
              orderId: order.id,
              productId: item.productId,
              quantity: item.quantity,
              price: product.price,
            });
          }
        }
      }
      
      res.status(201).json(order);
    } catch (error) {
      res.status(400).json({ error: "Failed to create order" });
    }
  });

  app.patch("/api/orders/:id", requireAuth, async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "No autenticado" });

    const existing = await storage.getOrder(req.params.id);
    if (!existing) return res.status(404).json({ error: "Pedido no encontrado" });

    const isCustomer = existing.customerId === user.id;
    const isRider = existing.riderId === user.id;
    const isAdmin = user.role === "admin";
    let isMerchant = false;
    if (user.role === "merchant") {
      const store = await storage.getStore(existing.storeId);
      isMerchant = !!store && store.ownerId === user.id;
    }

    if (!isCustomer && !isRider && !isAdmin && !isMerchant) {
      return res.status(403).json({ error: "No tenés permiso para modificar este pedido" });
    }

    const order = await storage.updateOrder(req.params.id, req.body);
    res.json(order);
  });

  app.get("/api/promos", async (req, res) => {
    const promos = await storage.getPromos();
    res.json(promos);
  });

  app.get("/api/promos/banners", async (req, res) => {
    const { provinciaId, ciudadId, lat, lng } = req.query;
    const prov = typeof provinciaId === "string" ? provinciaId : undefined;
    const city = typeof ciudadId === "string" ? ciudadId : undefined;
    const userLat = typeof lat === "string" ? parseFloat(lat) : undefined;
    const userLng = typeof lng === "string" ? parseFloat(lng) : undefined;
    const banners = await storage.getPromoBannersByLocation(prov, city, userLat, userLng);
    res.json(banners);
  });

  app.post("/api/promos/:id/impression", async (req, res) => {
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() || req.ip || "unknown";
    if (!isRecentlyTracked(req.params.id, ip)) {
      await storage.trackPromoImpression(req.params.id);
    }
    res.json({ ok: true });
  });

  app.post("/api/promos/:id/click", async (req, res) => {
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() || req.ip || "unknown";
    if (!isRecentlyTracked(`click:${req.params.id}`, ip)) {
      await storage.trackPromoClick(req.params.id);
    }
    res.json({ ok: true });
  });

  app.get("/api/promos/notices", async (req, res) => {
    const notices = await storage.getPromoNotices();
    res.json(notices);
  });

  app.get("/api/promos/categories", async (req, res) => {
    const categories = await storage.getPromoCategories();
    res.json(categories);
  });

  // Travel offers (bus companies)
  app.get("/api/travel/offers", async (req, res) => {
    const offers = await storage.getTravelOffers();
    res.json(offers);
  });

  // ==================== SUBSCRIPTION PLANS ====================
  app.get("/api/subscription-plans", async (req, res) => {
    const plans = await storage.getSubscriptionPlans();
    res.json(plans);
  });

  // ==================== MERCHANT APPLICATION ====================
  const merchantApplicationSchema = z.object({
    businessName: z.string().min(3, "El nombre del negocio debe tener al menos 3 caracteres"),
    businessType: z.string().min(1, "Debe seleccionar un tipo de negocio"),
    description: z.string().optional(),
    address: z.string().min(5, "La dirección debe tener al menos 5 caracteres"),
    provinciaId: z.string().min(1, "Debe seleccionar una provincia"),
    ciudadId: z.string().optional(),
    phone: z.string().min(8, "El teléfono debe tener al menos 8 caracteres"),
  });

  app.get("/api/merchant/application", requireAuth, async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "No autenticado" });
    }
    const application = await storage.getMerchantApplicationByUser(user.id);
    res.json(application || null);
  });

  app.post("/api/merchant/apply", requireAuth, async (req, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "No autenticado" });
      }

      // Check if user already has a pending/approved application
      const existingApp = await storage.getMerchantApplicationByUser(user.id);
      if (existingApp) {
        if (existingApp.status === "pending") {
          return res.status(400).json({ error: "Ya tenés una solicitud pendiente" });
        }
        if (existingApp.status === "approved") {
          return res.status(400).json({ error: "Tu solicitud ya fue aprobada" });
        }
      }

      const data = merchantApplicationSchema.parse(req.body);
      
      const application = await storage.createMerchantApplication({
        userId: user.id,
        businessName: data.businessName,
        businessType: data.businessType,
        description: data.description || null,
        address: data.address,
        provinciaId: data.provinciaId,
        ciudadId: data.ciudadId || null,
        phone: data.phone,
        status: "pending",
        rejectionReason: null,
      });

      res.status(201).json(application);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: "Error al enviar la solicitud" });
    }
  });

  // Admin: Get pending merchant applications
  app.get("/api/admin/merchants/pending", requireRole("admin"), async (req, res) => {
    const applications = await storage.getPendingMerchantApplications();
    const appsWithUsers = await Promise.all(
      applications.map(async (app) => {
        const user = await storage.getUser(app.userId);
        return {
          ...app,
          user: user ? { id: user.id, username: user.username, email: user.email } : null,
        };
      })
    );
    res.json(appsWithUsers);
  });

  // Admin: Approve merchant application
  app.patch("/api/admin/merchants/:id/approve", requireRole("admin"), async (req, res) => {
    const adminUser = await getCurrentUser(req);
    if (!adminUser) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const application = await storage.getMerchantApplication(req.params.id);
    if (!application) {
      return res.status(404).json({ error: "Solicitud no encontrada" });
    }

    // Update application status
    const updatedApp = await storage.updateMerchantApplication(req.params.id, {
      status: "approved",
      reviewedAt: new Date(),
      reviewedBy: adminUser.id,
    });

    // Update user role to merchant
    await storage.updateUser(application.userId, { role: "merchant" });

    // Create a default store for the merchant
    await storage.createStore({
      ownerId: application.userId,
      name: application.businessName,
      description: application.description || "",
      logo: null,
      banner: null,
      category: application.businessType,
      rating: "0",
      isActive: true,
      subscriptionTier: "free",
      subscriptionExpiresAt: null,
      address: application.address,
      provinciaId: application.provinciaId,
      ciudadId: application.ciudadId || null,
      lat: null,
      lng: null,
      phone: application.phone,
      openingHours: null,
    });

    res.json(updatedApp);
  });

  // Admin: Reject merchant application
  app.patch("/api/admin/merchants/:id/reject", requireRole("admin"), async (req, res) => {
    const adminUser = await getCurrentUser(req);
    if (!adminUser) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const { reason } = req.body;
    
    const application = await storage.getMerchantApplication(req.params.id);
    if (!application) {
      return res.status(404).json({ error: "Solicitud no encontrada" });
    }

    const updatedApp = await storage.updateMerchantApplication(req.params.id, {
      status: "rejected",
      rejectionReason: reason || "Solicitud rechazada",
      reviewedAt: new Date(),
      reviewedBy: adminUser.id,
    });

    res.json(updatedApp);
  });

  // ==================== MERCHANT STORE MANAGEMENT ====================
  app.get("/api/merchant/stores", requireRole("merchant", "admin"), async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "No autenticado" });
    }
    const stores = await storage.getStoresByOwner(user.id);
    res.json(stores);
  });

  const storeUpdateSchema = z.object({
    name: z.string().min(3).optional(),
    description: z.string().optional(),
    address: z.string().optional(),
    lat: z.string().optional(),
    lng: z.string().optional(),
    phone: z.string().optional(),
    openingHours: z.string().optional(),
    isActive: z.boolean().optional(),
  });

  app.patch("/api/merchant/stores/:id", requireRole("merchant", "admin"), async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const store = await storage.getStore(req.params.id);
    if (!store) {
      return res.status(404).json({ error: "Tienda no encontrada" });
    }

    // Verify ownership (unless admin)
    if (user.role !== "admin" && store.ownerId !== user.id) {
      return res.status(403).json({ error: "No tenés permiso para editar esta tienda" });
    }

    try {
      const data = storeUpdateSchema.parse(req.body);
      const updated = await storage.updateStore(req.params.id, data);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: "Error al actualizar tienda" });
    }
  });

  // ==================== MERCHANT PRODUCT MANAGEMENT ====================
  app.get("/api/merchant/products", requireRole("merchant", "admin"), async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const stores = await storage.getStoresByOwner(user.id);
    const storeIds = stores.map((s) => s.id);
    
    const allProducts = await storage.getProducts();
    const merchantProducts = allProducts.filter((p) => storeIds.includes(p.storeId));
    res.json(merchantProducts);
  });

  const productSchema = z.object({
    storeId: z.string().min(1, "La tienda es requerida"),
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    description: z.string().optional(),
    price: z.string().min(1, "El precio es requerido"),
    originalPrice: z.string().nullable().optional(),
    image: z.string().nullable().optional(),
    images: z.string().nullable().optional(), // JSON array of image URLs
    attributes: z.string().nullable().optional(), // JSON object of key-value attributes
    category: z.string().optional(),
    stock: z.number().min(0).optional(),
    isActive: z.boolean().optional(),
  });

  app.post("/api/merchant/products", requireRole("merchant", "admin"), async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "No autenticado" });
    }

    try {
      const data = productSchema.parse(req.body);

      // Verify ownership of store
      const store = await storage.getStore(data.storeId);
      if (!store) {
        return res.status(404).json({ error: "Tienda no encontrada" });
      }
      if (user.role !== "admin" && store.ownerId !== user.id) {
        return res.status(403).json({ error: "No tenés permiso para agregar productos a esta tienda" });
      }

      const product = await storage.createProduct({
        storeId: data.storeId,
        name: data.name,
        description: data.description || null,
        price: data.price,
        originalPrice: data.originalPrice || null,
        image: data.image || null,
        images: data.images || null,
        attributes: data.attributes || null,
        category: data.category || null,
        stock: data.stock ?? 0,
        isActive: data.isActive ?? true,
      } as any);

      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: "Error al crear producto" });
    }
  });

  app.patch("/api/merchant/products/:id", requireRole("merchant", "admin"), async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const product = await storage.getProduct(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    // Verify ownership
    const store = await storage.getStore(product.storeId);
    if (!store) {
      return res.status(404).json({ error: "Tienda no encontrada" });
    }
    if (user.role !== "admin" && store.ownerId !== user.id) {
      return res.status(403).json({ error: "No tenés permiso para editar este producto" });
    }

    const updated = await storage.updateProduct(req.params.id, req.body);
    res.json(updated);
  });

  app.delete("/api/merchant/products/:id", requireRole("merchant", "admin"), async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const product = await storage.getProduct(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    // Verify ownership
    const store = await storage.getStore(product.storeId);
    if (!store) {
      return res.status(404).json({ error: "Tienda no encontrada" });
    }
    if (user.role !== "admin" && store.ownerId !== user.id) {
      return res.status(403).json({ error: "No tenés permiso para eliminar este producto" });
    }

    await storage.deleteProduct(req.params.id);
    res.status(204).send();
  });

  // ==================== MERCHANT ORDERS ====================
  app.get("/api/merchant/orders", requireRole("merchant", "admin"), async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const stores = await storage.getStoresByOwner(user.id);
    const orders = [];
    for (const store of stores) {
      const storeOrders = await storage.getOrdersByStore(store.id);
      orders.push(...storeOrders);
    }
    res.json(orders);
  });

  app.patch("/api/merchant/orders/:id/status", requireRole("merchant", "admin"), async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const { status } = req.body;
    const validStatuses = ["confirmed", "preparing", "ready", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Estado inválido" });
    }

    const order = await storage.getOrder(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    // Verify ownership
    const store = await storage.getStore(order.storeId);
    if (!store) {
      return res.status(404).json({ error: "Tienda no encontrada" });
    }
    if (user.role !== "admin" && store.ownerId !== user.id) {
      return res.status(403).json({ error: "No tenés permiso para modificar este pedido" });
    }

    const updated = await storage.updateOrder(req.params.id, { status });
    broadcastOrderStatus(req.params.id, status);

    const statusMessages: Record<string, string> = {
      confirmed: "Tu pedido fue confirmado por la tienda",
      preparing: "Tu pedido está siendo preparado",
      ready: "Tu pedido está listo y esperando al repartidor",
      cancelled: "Tu pedido fue cancelado",
    };
    if (statusMessages[status]) {
      await storage.createNotification({
        userId: order.customerId,
        type: "order_status",
        title: "Actualización de pedido",
        body: statusMessages[status],
        link: `/order/${order.id}/tracking`,
      });
    }

    res.json(updated);
  });

  // Merchant: Dashboard stats
  app.get("/api/merchant/stats", requireRole("merchant", "admin"), async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "No autenticado" });

    const stores = await storage.getStoresByOwner(user.id);
    const store = stores[0];
    if (!store) return res.status(404).json({ error: "Tienda no encontrada" });

    const orders = await storage.getOrdersByStore(store.id);
    const products = await storage.getProductsByStore(store.id);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const delivered = orders.filter((o) => o.status === "delivered");
    const cancelled = orders.filter((o) => o.status === "cancelled");
    const todayOrders = delivered.filter((o) => new Date(o.createdAt as Date) >= todayStart);
    const weekOrders = delivered.filter((o) => new Date(o.createdAt as Date) >= weekStart);

    const totalRevenue = delivered.reduce((s, o) => s + parseFloat(o.total), 0);
    const todayRevenue = todayOrders.reduce((s, o) => s + parseFloat(o.total), 0);
    const weekRevenue = weekOrders.reduce((s, o) => s + parseFloat(o.total), 0);
    const avgOrderValue = delivered.length > 0 ? totalRevenue / delivered.length : 0;

    const commissionRate = store.subscriptionTier === "premium" ? 0.01 : store.subscriptionTier === "basic" ? 0.03 : 0.07;
    const netRevenue = totalRevenue * (1 - commissionRate);
    const platformCommission = totalRevenue * commissionRate;

    // Top products by order frequency (approximate with product occurrences in orders)
    const productMap: Record<string, { name: string; count: number; revenue: number }> = {};
    for (const order of delivered) {
      const items = (order as any).items ?? [];
      for (const item of items) {
        const pid = item.productId ?? item.id;
        const pname = item.name ?? "Producto";
        if (!productMap[pid]) productMap[pid] = { name: pname, count: 0, revenue: 0 };
        productMap[pid].count += item.quantity ?? 1;
        productMap[pid].revenue += parseFloat(item.price ?? "0") * (item.quantity ?? 1);
      }
    }
    const topProducts = Object.entries(productMap)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Last 7 days daily revenue
    const dailyRevenue: { date: string; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const dayRev = delivered
        .filter((o) => {
          const d = new Date(o.createdAt as Date);
          return d >= dayStart && d < dayEnd;
        })
        .reduce((s, o) => s + parseFloat(o.total), 0);
      dailyRevenue.push({
        date: dayStart.toLocaleDateString("es-AR", { weekday: "short", day: "numeric" }),
        revenue: dayRev,
      });
    }

    res.json({
      totalOrders: orders.length,
      deliveredOrders: delivered.length,
      cancelledOrders: cancelled.length,
      totalRevenue,
      todayRevenue,
      weekRevenue,
      avgOrderValue,
      netRevenue,
      platformCommission,
      commissionRate,
      totalProducts: products.length,
      activeProducts: products.filter((p) => p.isActive).length,
      lowStockProducts: products.filter((p) => p.stock <= 3).length,
      topProducts,
      dailyRevenue,
    });
  });

  // ==================== DISPUTES / RETURNS ====================

  // Create a dispute for a delivered order
  app.post("/api/orders/:id/dispute", requireAuth, async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const order = await storage.getOrder(req.params.id);
    if (!order || order.customerId !== user.id) return res.status(404).json({ error: "Pedido no encontrado" });
    if (order.status !== "delivered") return res.status(400).json({ error: "Solo puedes disputar pedidos entregados" });
    const existing = await storage.getDisputeByOrder(req.params.id);
    if (existing) return res.status(400).json({ error: "Ya existe una disputa para este pedido" });
    const { type, description } = req.body;
    if (!type || !description) return res.status(400).json({ error: "type y description son requeridos" });
    const dispute = await storage.createDispute({ orderId: req.params.id, userId: user.id, type, description });
    res.json(dispute);
  });

  // Get current user's disputes
  app.get("/api/disputes", requireAuth, async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const result = await storage.getDisputesByUser(user.id);
    res.json(result);
  });

  // Admin: get all disputes
  app.get("/api/admin/disputes", requireAuth, async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    const result = await storage.getAllDisputes();
    res.json(result);
  });

  // Admin: update dispute status
  app.patch("/api/admin/disputes/:id", requireAuth, async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    const { status, resolution } = req.body;
    if (!status) return res.status(400).json({ error: "status es requerido" });
    const updated = await storage.updateDisputeStatus(req.params.id, status, resolution, user.id);
    // Notify customer by email
    const disputeUser = await storage.getUser(updated.userId);
    if (disputeUser && status !== "pending") {
      sendDisputeStatusEmail(disputeUser.email, disputeUser.username, updated.orderId, status, resolution).catch(() => {});
    }
    res.json(updated);
  });

  // Admin: issue Stripe refund for resolved dispute
  app.post("/api/admin/disputes/:id/refund", requireAuth, async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    try {
      const dispute = await storage.getDisputeByOrder(req.params.id);
      if (!dispute) {
        // Try finding by dispute id
        const allDisputes = await storage.getAllDisputes();
        const d = allDisputes.find((x) => x.id === req.params.id);
        if (!d) return res.status(404).json({ error: "Disputa no encontrada" });
        const order = await storage.getOrder(d.orderId);
        if (!order) return res.status(404).json({ error: "Pedido no encontrado" });
        const payment = await paymentService.getPaymentByOrder(d.orderId);
        if (!payment) return res.status(400).json({ error: "No hay pago asociado a este pedido" });
        await paymentService.refundPayment({ paymentId: payment.id, reason: "dispute_resolved" });
        await storage.updateOrder(d.orderId, { paymentStatus: "refunded" });
        return res.json({ success: true, paymentId: payment.id });
      }
      const order = await storage.getOrder(dispute.orderId);
      if (!order) return res.status(404).json({ error: "Pedido no encontrado" });
      const payment = await paymentService.getPaymentByOrder(dispute.orderId);
      if (!payment) return res.status(400).json({ error: "No hay pago asociado a este pedido" });
      await paymentService.refundPayment({ paymentId: payment.id, reason: "dispute_resolved" });
      await storage.updateOrder(dispute.orderId, { paymentStatus: "refunded" });
      res.json({ success: true, paymentId: payment.id });
    } catch (err: any) {
      res.status(500).json({ error: err.message ?? "Error al procesar reembolso" });
    }
  });

  // ==================== SEARCH ====================

  // Unified search: products + stores
  app.get("/api/search", async (req, res) => {
    const q = String(req.query.q ?? "").trim();
    if (!q || q.length < 2) {
      return res.json({ products: [], stores: [], query: q });
    }
    const category = req.query.category as string | undefined;
    const [products, storeResults] = await Promise.all([
      storage.searchProducts(q, category, 20),
      storage.searchStores(q, category, 10),
    ]);
    res.json({ products, stores: storeResults, query: q });
  });

  // ==================== NOTIFICATIONS ====================

  // Get notifications for current user
  app.get("/api/notifications", requireAuth, async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "No autenticado" });
    const items = await storage.getNotificationsByUser(user.id);
    const unread = await storage.getUnreadNotificationCount(user.id);
    res.json({ notifications: items, unread });
  });

  // Mark one notification as read
  app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "No autenticado" });
    await storage.markNotificationRead(req.params.id, user.id);
    res.json({ success: true });
  });

  // Mark all notifications as read
  app.post("/api/notifications/read-all", requireAuth, async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "No autenticado" });
    await storage.markAllNotificationsRead(user.id);
    res.json({ success: true });
  });

  // ==================== FAVORITES ====================

  app.get("/api/favorites", requireAuth, async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "No autenticado" });
    const type = req.query.type as "product" | "store" | undefined;
    const items = await storage.getFavoritesByUser(user.id, type);
    res.json(items);
  });

  app.post("/api/favorites", requireAuth, async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "No autenticado" });
    const { targetId, type } = req.body;
    if (!targetId || !type) return res.status(400).json({ error: "targetId y type requeridos" });
    if (!["product", "store"].includes(type)) return res.status(400).json({ error: "type inválido" });
    const fav = await storage.addFavorite({ userId: user.id, targetId, type });
    res.json(fav);
  });

  app.delete("/api/favorites", requireAuth, async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "No autenticado" });
    const { targetId, type } = req.body;
    if (!targetId || !type) return res.status(400).json({ error: "targetId y type requeridos" });
    const removed = await storage.removeFavorite(user.id, targetId, type);
    res.json({ removed });
  });

  app.get("/api/favorites/check", requireAuth, async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "No autenticado" });
    const { targetId, type } = req.query as { targetId: string; type: "product" | "store" };
    if (!targetId || !type) return res.status(400).json({ error: "targetId y type requeridos" });
    const isFav = await storage.isFavorite(user.id, targetId, type);
    res.json({ isFavorite: isFav });
  });

  // ==================== REVIEWS ====================
  const reviewSchema = z.object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(500).optional(),
  });

  // Submit review for a delivered order
  app.post("/api/orders/:id/review", requireAuth, async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "No autenticado" });

    const order = await storage.getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: "Pedido no encontrado" });
    if (order.customerId !== user.id) return res.status(403).json({ error: "No tenés acceso" });
    if (order.status !== "delivered") return res.status(400).json({ error: "Solo podés reseñar pedidos entregados" });

    const existing = await storage.getReviewByOrderAndUser(req.params.id, user.id);
    if (existing) return res.status(409).json({ error: "Ya enviaste una reseña para este pedido" });

    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const review = await storage.createReview({
      userId: user.id,
      orderId: req.params.id,
      storeId: order.storeId,
      rating: parsed.data.rating,
      comment: parsed.data.comment ?? null,
    });

    res.status(201).json(review);
  });

  // Get reviews for a store
  app.get("/api/stores/:id/reviews", async (req, res) => {
    const reviews = await storage.getReviewsByStore(req.params.id);
    const avgRating = await storage.getAverageRating(req.params.id);
    res.json({ reviews, avgRating, total: reviews.length });
  });

  // Submit a direct review for a store (no order required)
  app.post("/api/stores/:id/review", requireAuth, async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "No autenticado" });

    const store = await storage.getStore(req.params.id);
    if (!store) return res.status(404).json({ error: "Tienda no encontrada" });

    const existing = await storage.getReviewByStoreAndUser(req.params.id, user.id);
    if (existing) return res.status(409).json({ error: "Ya enviaste una reseña para esta tienda" });

    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const review = await storage.createReview({
      userId: user.id,
      storeId: req.params.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment ?? null,
    });

    res.status(201).json(review);
  });

  // Check if user can review an order
  app.get("/api/orders/:id/review", requireAuth, async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "No autenticado" });

    const order = await storage.getOrder(req.params.id);
    if (!order || order.customerId !== user.id) return res.status(403).json({ error: "No tenés acceso" });

    const existing = await storage.getReviewByOrderAndUser(req.params.id, user.id);
    res.json({ canReview: order.status === "delivered" && !existing, review: existing ?? null });
  });

  // ==================== RIDER MANAGEMENT ====================
  const riderApplicationSchema = z.object({
    vehicleType: z.enum(["moto", "auto", "utilitario"]),
    vehiclePlate: z.string().min(5, "La patente debe tener al menos 5 caracteres"),
    licenseNumber: z.string().min(5, "El número de licencia debe tener al menos 5 caracteres"),
  });

  app.get("/api/rider/profile", requireAuth, async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "No autenticado" });
    }
    const profile = await storage.getRiderProfile(user.id);
    res.json(profile || null);
  });

  app.post("/api/rider/apply", requireAuth, async (req, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "No autenticado" });
      }

      // Check if already has a profile
      const existingProfile = await storage.getRiderProfile(user.id);
      if (existingProfile) {
        return res.status(400).json({ error: "Ya tenés un perfil de repartidor" });
      }

      const data = riderApplicationSchema.parse(req.body);
      
      const profile = await storage.createRiderProfile({
        userId: user.id,
        vehicleType: data.vehicleType,
        vehiclePlate: data.vehiclePlate,
        licenseNumber: data.licenseNumber,
        status: "pending",
        isAvailable: false,
        currentLat: null,
        currentLng: null,
        totalDeliveries: 0,
        rating: "5.0",
      });

      res.status(201).json(profile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: "Error al enviar la solicitud" });
    }
  });

  app.patch("/api/rider/availability", requireRole("rider"), async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const { isAvailable, lat, lng } = req.body;
    
    const profile = await storage.updateRiderProfile(user.id, {
      isAvailable: isAvailable ?? undefined,
      currentLat: lat ?? undefined,
      currentLng: lng ?? undefined,
    });

    if (!profile) {
      return res.status(404).json({ error: "Perfil no encontrado" });
    }

    res.json(profile);
  });

  // Rider: Accept an order
  app.post("/api/rider/orders/:id/accept", requireRole("rider"), async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const order = await storage.getOrder(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    if (order.status !== "ready") {
      return res.status(400).json({ error: "El pedido no está listo para entrega" });
    }

    if (order.riderId) {
      return res.status(400).json({ error: "El pedido ya fue asignado a otro repartidor" });
    }

    const updated = await storage.updateOrder(req.params.id, {
      riderId: user.id,
      status: "in_transit",
    });
    broadcastOrderStatus(req.params.id, "in_transit");
    await storage.createNotification({
      userId: updated.userId,
      type: "order_status",
      title: "Tu pedido está en camino",
      body: "Un repartidor recogió tu pedido y va hacia vos",
      link: `/order/${updated.id}/tracking`,
    });
    res.json(updated);
  });

  // Rider: Mark order as delivered
  app.post("/api/rider/orders/:id/deliver", requireRole("rider"), async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const order = await storage.getOrder(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    if (order.riderId !== user.id) {
      return res.status(403).json({ error: "Este pedido no está asignado a vos" });
    }

    if (order.status !== "in_transit") {
      return res.status(400).json({ error: "El pedido no está en tránsito" });
    }

    const updated = await storage.updateOrder(req.params.id, {
      status: "delivered",
    });
    broadcastOrderStatus(req.params.id, "delivered");
    await storage.createNotification({
      userId: updated.userId,
      type: "order_delivered",
      title: "Pedido entregado",
      body: "Tu pedido fue entregado. Podés calificarlo desde Mis Pedidos.",
      link: "/account/orders",
    });

    // Create earning for rider (10% of order total)
    const earningAmount = parseFloat(order.total) * 0.10;
    await storage.createRiderEarning({
      riderId: user.id,
      orderId: order.id,
      amount: earningAmount.toFixed(2),
      status: "pending",
    });

    // Update rider profile
    const profile = await storage.getRiderProfile(user.id);
    if (profile) {
      await storage.updateRiderProfile(user.id, {
        totalDeliveries: profile.totalDeliveries + 1,
      });
    }

    res.json(updated);
  });

  // Rider: Get my assigned orders
  app.get("/api/rider/orders/assigned", requireRole("rider"), async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const orders = await storage.getOrdersByRider(user.id);
    res.json(orders);
  });

  // Rider: Get my earnings
  app.get("/api/rider/earnings", requireRole("rider"), async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const earnings = await storage.getRiderEarnings(user.id);
    res.json(earnings);
  });

  // Rider: Update live location for an order
  app.post("/api/rider/orders/:id/location", requireRole("rider"), async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "No autenticado" });

    const { lat, lng } = req.body;
    if (!lat || !lng) return res.status(400).json({ error: "Latitud y longitud requeridas" });

    const order = await storage.getOrder(req.params.id);
    if (!order || order.riderId !== user.id) {
      return res.status(403).json({ error: "No tenés acceso a este pedido" });
    }

    await storage.updateOrder(req.params.id, {
      riderLat: String(lat),
      riderLng: String(lng),
    });

    const { broadcastToOrder } = await import("../ws");
    broadcastToOrder(req.params.id, {
      type: "rider_location_update",
      orderId: req.params.id,
      payload: { lat: parseFloat(lat), lng: parseFloat(lng) },
    });

    res.json({ success: true });
  });

  // Admin: Get pending rider applications
  app.get("/api/admin/riders/pending", requireRole("admin"), async (req, res) => {
    const profiles = await storage.getRiderProfiles();
    const pending = profiles.filter((p) => p.status === "pending");
    
    const profilesWithUsers = await Promise.all(
      pending.map(async (profile) => {
        const user = await storage.getUser(profile.userId);
        return {
          ...profile,
          user: user ? { id: user.id, username: user.username, email: user.email } : null,
        };
      })
    );
    res.json(profilesWithUsers);
  });

  // Admin: Approve rider
  app.patch("/api/admin/riders/:userId/approve", requireRole("admin"), async (req, res) => {
    const profile = await storage.getRiderProfile(req.params.userId);
    if (!profile) {
      return res.status(404).json({ error: "Perfil no encontrado" });
    }

    const updated = await storage.updateRiderProfile(req.params.userId, {
      status: "active",
    });

    // Update user role to rider
    await storage.updateUser(req.params.userId, { role: "rider" });

    res.json(updated);
  });

  // Admin: Reject rider
  app.patch("/api/admin/riders/:userId/reject", requireRole("admin"), async (req, res) => {
    const profile = await storage.getRiderProfile(req.params.userId);
    if (!profile) {
      return res.status(404).json({ error: "Perfil no encontrado" });
    }

    const updated = await storage.updateRiderProfile(req.params.userId, {
      status: "inactive",
    });

    res.json(updated);
  });

  // ==================== PLATFORM COMMISSIONS ====================
  
  // Get all platform commissions with calculated totals
  app.get("/api/admin/commissions", requireRole("admin"), async (req, res) => {
    const commissions = await storage.getPlatformCommissions();
    const stores = await storage.getStores();
    const orders = await storage.getOrders();
    
    // Calculate totals
    const totalRevenue = commissions.reduce((sum, c) => sum + parseFloat(c.commissionAmount as string), 0);
    const totalMerchantPayments = commissions.reduce((sum, c) => sum + parseFloat(c.merchantAmount as string), 0);
    const pendingCommissions = commissions.filter(c => c.status === "pending");
    const collectedCommissions = commissions.filter(c => c.status === "collected");
    
    // Get commissions with store info
    const commissionsWithDetails = commissions.map(c => {
      const store = stores.find(s => s.id === c.storeId);
      const order = orders.find(o => o.id === c.orderId);
      return {
        ...c,
        storeName: store?.name || "Tienda eliminada",
        orderStatus: order?.status || "unknown",
      };
    });
    
    res.json({
      commissions: commissionsWithDetails,
      summary: {
        totalRevenue,
        totalMerchantPayments,
        pendingCount: pendingCommissions.length,
        pendingAmount: pendingCommissions.reduce((sum, c) => sum + parseFloat(c.commissionAmount as string), 0),
        collectedCount: collectedCommissions.length,
        collectedAmount: collectedCommissions.reduce((sum, c) => sum + parseFloat(c.commissionAmount as string), 0),
      }
    });
  });

  // Get commissions by store
  app.get("/api/admin/commissions/store/:storeId", requireRole("admin"), async (req, res) => {
    const commissions = await storage.getPlatformCommissionsByStore(req.params.storeId);
    const store = await storage.getStore(req.params.storeId);
    
    const totalEarned = commissions.reduce((sum, c) => sum + parseFloat(c.commissionAmount as string), 0);
    const merchantTotal = commissions.reduce((sum, c) => sum + parseFloat(c.merchantAmount as string), 0);
    
    res.json({
      store,
      commissions,
      summary: {
        totalOrders: commissions.length,
        platformEarnings: totalEarned,
        merchantEarnings: merchantTotal,
      }
    });
  });

  // Get sales report (orders with commission breakdown)
  app.get("/api/admin/sales-report", requireRole("admin"), async (req, res) => {
    const orders = await storage.getOrders();
    const stores = await storage.getStores();
    const commissions = await storage.getPlatformCommissions();
    
    // Only delivered orders count as sales
    const completedOrders = orders.filter(o => o.status === "delivered" && o.paymentStatus === "paid");
    
    const salesReport = completedOrders.map(order => {
      const store = stores.find(s => s.id === order.storeId);
      const commission = commissions.find(c => c.orderId === order.id);
      
      return {
        orderId: order.id,
        storeName: store?.name || "Tienda eliminada",
        storeId: order.storeId,
        total: order.total,
        commissionPercent: commission?.commissionPercent || (store?.subscriptionTier === "premium" ? "3" : store?.subscriptionTier === "basic" ? "5" : "7"),
        platformCommission: commission?.commissionAmount || "0",
        merchantAmount: commission?.merchantAmount || order.total,
        date: commission?.createdAt || new Date(),
      };
    });
    
    res.json({
      sales: salesReport,
      totals: {
        totalSales: completedOrders.reduce((sum, o) => sum + parseFloat(o.total as string), 0),
        totalOrders: completedOrders.length,
      }
    });
  });

  // Deactivate expired promos
  app.post("/api/admin/promos/cleanup-expired", requireRole("admin"), async (req, res) => {
    const deactivatedCount = await storage.deactivateExpiredPromos();
    res.json({ deactivated: deactivatedCount, message: `${deactivatedCount} promociones expiradas desactivadas` });
  });

  // Get expired promos
  app.get("/api/admin/promos/expired", requireRole("admin"), async (req, res) => {
    const expired = await storage.getExpiredPromos();
    res.json(expired);
  });

  // ==================== PAYMENT CORE — ADMIN BACKOFFICE ====================

  // List all internal payments (most recent first)
  app.get("/api/admin/payments", requireRole("admin"), async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const allPayments = await paymentService.listPayments(limit);
      res.json(allPayments);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get single payment + attempts + ledger
  app.get("/api/admin/payments/:id", requireRole("admin"), async (req, res) => {
    try {
      const payment = await paymentService.getPayment(req.params.id);
      if (!payment) return res.status(404).json({ error: "Payment not found" });
      const [attempts, ledger] = await Promise.all([
        paymentService.listAttempts(payment.id),
        paymentService.listLedger(payment.id),
      ]);
      res.json({ payment, attempts, ledger });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get payment for an order
  app.get("/api/admin/payments/by-order/:orderId", requireRole("admin"), async (req, res) => {
    try {
      const payment = await paymentService.getPaymentByOrder(req.params.orderId);
      if (!payment) return res.status(404).json({ error: "No payment for this order" });
      const [attempts, ledger] = await Promise.all([
        paymentService.listAttempts(payment.id),
        paymentService.listLedger(payment.id),
      ]);
      res.json({ payment, attempts, ledger });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Issue refund via admin (for any order, not just disputes)
  app.post("/api/admin/payments/:id/refund", requireRole("admin"), async (req, res) => {
    try {
      const { amount, reason } = req.body;
      await paymentService.refundPayment({
        paymentId: req.params.id,
        amountGross: amount ? parseFloat(amount) : undefined,
        reason: reason ?? "admin_refund",
      });
      // Update order payment status
      const payment = await paymentService.getPayment(req.params.id);
      if (payment) {
        await storage.updateOrder(payment.orderId, { paymentStatus: "refunded" });
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // List provider webhook events (audit log)
  app.get("/api/admin/payment-events", requireRole("admin"), async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const events = await paymentService.listProviderEvents(limit);
      res.json(events);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==================== AI ADVERTISING GENERATION ====================

  // GET admin AI usage info
  app.get("/api/admin/ai-usage", requireRole("admin"), async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "No autenticado" });
    const adminUser = await storage.getUser(user.id);
    if (!adminUser) return res.status(404).json({ error: "Usuario no encontrado" });

    // Admins always have unlimited AI access regardless of store subscription
    if (adminUser.role === "admin") {
      return res.json({
        currentUser: {
          email: adminUser.email,
          username: adminUser.username,
          aiGenerationsUsed: adminUser.aiGenerationsUsed || 0,
          subscriptionTier: "admin",
        },
        freeLimit: AI_FREE_LIMIT,
        isUnlimited: true,
        remainingFreeGenerations: null,
        limit: null,
        message: "Acceso ilimitado a generación de IA (cuenta administrador).",
      });
    }

    const subscriptionTier = await getUserSubscriptionTier(user.id);
    const isUnlimited = subscriptionTier !== "free";
    const aiGenerationsUsed = adminUser.aiGenerationsUsed || 0;
    const remainingFreeGenerations = isUnlimited ? null : Math.max(0, AI_FREE_LIMIT - aiGenerationsUsed);
    res.json({
      currentUser: {
        email: adminUser.email,
        username: adminUser.username,
        aiGenerationsUsed,
        subscriptionTier,
      },
      freeLimit: AI_FREE_LIMIT,
      isUnlimited,
      remainingFreeGenerations,
      limit: isUnlimited ? null : AI_FREE_LIMIT,
      message: isUnlimited
        ? "Generaciones de IA ilimitadas con tu plan actual."
        : remainingFreeGenerations === 0
        ? "Has alcanzado el límite gratuito. Contrata un plan para generaciones ilimitadas."
        : `Tenés ${remainingFreeGenerations} generación gratuita disponible.`,
    });
  });
  
  // Generate advertising content with AI
  app.post("/api/admin/promos/generate-ai", requireRole("admin"), async (req, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "No autenticado" });
      }

      // Check AI usage limits
      const adminUser = await storage.getUser(user.id);
      if (!adminUser) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      const aiGenerationsUsed = adminUser.aiGenerationsUsed || 0;
      // Admins have unlimited AI generation regardless of store subscription
      if (adminUser.role !== "admin") {
        const subscriptionTier = await getUserSubscriptionTier(user.id);
        const isFreePlan = subscriptionTier === "free";
        if (isFreePlan && aiGenerationsUsed >= AI_FREE_LIMIT) {
          return res.status(403).json({
            error: "Has alcanzado el límite de generaciones gratuitas con IA. Contrata un plan para generaciones ilimitadas.",
          });
        }
      }

      const { type, targetAudience, productCategory, tone, duration } = req.body;
      
      const prompt = `Genera contenido publicitario para una plataforma de marketplace local argentina llamada PachaPay.

Tipo de anuncio: ${type || "banner"}
Audiencia objetivo: ${targetAudience || "consumidores generales"}
Categoría de producto: ${productCategory || "productos variados"}
Tono: ${tone || "profesional y amigable"}
Duración de la campaña: ${duration || "1 semana"}

Responde en formato JSON con la siguiente estructura:
{
  "title": "Título corto y atractivo (máximo 50 caracteres)",
  "description": "Descripción persuasiva (máximo 150 caracteres)",
  "discount": "Texto de descuento o promoción (ej: '30% OFF', 'ENVÍO GRATIS')",
  "callToAction": "Texto para el botón de acción",
  "suggestedDuration": "Duración sugerida en días"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Eres un experto en marketing digital y publicidad para e-commerce en Argentina. Genera contenido publicitario efectivo y atractivo." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ error: "No se pudo generar el contenido" });
      }

      const generatedContent = JSON.parse(content);
      
      // Increment AI usage counter
      await storage.updateUser(user.id, {
        aiGenerationsUsed: aiGenerationsUsed + 1,
      });

      res.json({
        ...generatedContent,
        generatedByAi: true,
        suggestedStartDate: new Date().toISOString(),
        suggestedEndDate: new Date(Date.now() + (parseInt(generatedContent.suggestedDuration) || 7) * 24 * 60 * 60 * 1000).toISOString(),
      });
    } catch (error) {
      console.error("Error generating AI content:", error);
      res.status(500).json({ error: "Error al generar contenido con IA" });
    }
  });

  // Create promo from AI-generated content
  app.post("/api/admin/promos/create-from-ai", requireRole("admin"), async (req, res) => {
    try {
      const { title, description, discount, type, startDate, endDate, link, advertiser } = req.body;
      
      const promo = await storage.createPromo({
        title,
        description,
        discount,
        type: type || "banner",
        link: link || "/explore",
        advertiser: advertiser || "PachaPay",
        isActive: true,
        priority: 1,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        generatedByAi: true,
        mediaType: "image",
        image: null,
        videoUrl: null,
      });
      
      res.status(201).json(promo);
    } catch (error) {
      console.error("Error creating promo from AI:", error);
      res.status(500).json({ error: "Error al crear la promoción" });
    }
  });

  // ==================== M1 — COMMERCIAL STATUS ====================

  app.patch("/api/admin/promos/:id/commercial-status", requireRole("admin"), async (req, res) => {
    const { status } = req.body;
    const allowed = ["draft", "active", "paused", "completed", "expired"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Estado inválido. Valores permitidos: ${allowed.join(", ")}` });
    }
    const updated = await storage.updatePromoCommercialStatus(req.params.id, status);
    if (!updated) return res.status(404).json({ error: "Promo no encontrada" });
    res.json(updated);
  });

  // ==================== M2 — FEATURED STORES & SPONSORED PRODUCTS ====================

  app.patch("/api/admin/stores/:id/featured", requireRole("admin"), async (req, res) => {
    const { isFeatured, featuredDays, featuredScore } = req.body;
    if (typeof isFeatured !== "boolean") {
      return res.status(400).json({ error: "isFeatured debe ser boolean" });
    }
    const featuredUntil = isFeatured && featuredDays
      ? new Date(Date.now() + Number(featuredDays) * 86400000)
      : isFeatured ? null : null;
    const updated = await storage.updateStoreFeatured(
      req.params.id, isFeatured, featuredUntil, featuredScore ?? 0
    );
    if (!updated) return res.status(404).json({ error: "Tienda no encontrada" });
    res.json(updated);
  });

  app.patch("/api/admin/products/:id/sponsored", requireRole("admin"), async (req, res) => {
    const { isSponsored, sponsoredDays, sponsoredPriority } = req.body;
    if (typeof isSponsored !== "boolean") {
      return res.status(400).json({ error: "isSponsored debe ser boolean" });
    }
    const sponsoredUntil = isSponsored && sponsoredDays
      ? new Date(Date.now() + Number(sponsoredDays) * 86400000)
      : null;
    const updated = await storage.updateProductSponsored(
      req.params.id, isSponsored, sponsoredUntil, sponsoredPriority ?? 0
    );
    if (!updated) return res.status(404).json({ error: "Producto no encontrado" });
    res.json(updated);
  });

  // ==================== M3 — ADMIN CAMPAIGNS ====================

  app.get("/api/admin/campaigns", requireRole("admin"), async (req, res) => {
    const promos = await storage.getPromos();
    const campaigns = promos
      .filter((p) => p.type === "banner")
      .map((p) => {
        const budget = parseFloat((p.budget as string) || "0");
        const spent = parseFloat((p.spentAmount as string) || "0");
        const ctr = p.impressions > 0 ? ((p.clicks / p.impressions) * 100).toFixed(2) : "0.00";
        return {
          id: p.id,
          title: p.title,
          advertiser: p.advertiser,
          placement: p.placement ?? "hero_home",
          targetType: p.targetType,
          commercialStatus: p.commercialStatus ?? "active",
          pricingModel: p.pricingModel ?? "flat",
          budget,
          spentAmount: spent,
          remainingBudget: Math.max(0, budget - spent),
          impressions: p.impressions,
          clicks: p.clicks,
          ctr,
          maxImpressions: p.maxImpressions,
          maxClicks: p.maxClicks,
          startDate: p.startDate,
          endDate: p.endDate,
          priority: p.priority,
          isActive: p.isActive,
          generatedByAi: p.generatedByAi,
          createdAt: p.createdAt,
        };
      })
      .sort((a, b) => {
        const order = { active: 0, paused: 1, draft: 2, completed: 3, expired: 4 };
        return (order[a.commercialStatus as keyof typeof order] ?? 5) - (order[b.commercialStatus as keyof typeof order] ?? 5);
      });

    const totalBudget = campaigns.reduce((sum, c) => sum + c.budget, 0);
    const totalSpent = campaigns.reduce((sum, c) => sum + c.spentAmount, 0);
    const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);
    const totalImpressions = campaigns.reduce((sum, c) => sum + c.impressions, 0);
    const globalCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00";

    res.json({
      campaigns,
      summary: {
        total: campaigns.length,
        active: campaigns.filter((c) => c.commercialStatus === "active").length,
        paused: campaigns.filter((c) => c.commercialStatus === "paused").length,
        completed: campaigns.filter((c) => c.commercialStatus === "completed").length,
        draft: campaigns.filter((c) => c.commercialStatus === "draft").length,
        totalBudget,
        totalSpent,
        totalClicks,
        totalImpressions,
        globalCtr,
        estimatedRevenue: totalSpent,
      },
    });
  });

  // ==================== M5 — BILLING ====================

  app.get("/api/admin/billing", requireRole("admin"), async (req, res) => {
    const billings = await storage.getAdBillings();
    const total = billings.reduce((sum, b) => sum + parseFloat((b.amount as string) || "0"), 0);
    res.json({ billings, summary: { total, count: billings.length } });
  });

  // ==================== CUSTOMER ORDERS ====================
  app.get("/api/customer/orders", requireAuth, async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "No autenticado" });
    }
    const orders = await storage.getOrdersByCustomer(user.id);
    res.json(orders);
  });

  app.post("/api/promos", requireRole("admin"), async (req, res) => {
    try {
      const promo = await storage.createPromo(req.body);
      res.status(201).json(promo);
    } catch (error) {
      res.status(400).json({ error: "Failed to create promo" });
    }
  });

  app.patch("/api/promos/:id", requireRole("admin"), async (req, res) => {
    const promo = await storage.updatePromo(req.params.id, req.body);
    if (!promo) {
      return res.status(404).json({ error: "Promo not found" });
    }
    res.json(promo);
  });

  app.delete("/api/promos/:id", requireRole("admin"), async (req, res) => {
    const deleted = await storage.deletePromo(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Promo not found" });
    }
    res.status(204).send();
  });

  // Stripe payment routes
  app.get("/api/stripe/config", async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      res.status(500).json({ error: "Failed to get Stripe config" });
    }
  });

  // Create order and initiate payment — calculates amount server-side
  app.post("/api/checkout/create-order", requireAuth, async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req);
      const { items, address, notes } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Cart is empty" });
      }
      if (!address || !address.trim()) {
        return res.status(400).json({ error: "Address is required" });
      }

      // Calculate total server-side from actual product prices
      let total = 0;
      const orderItemsArr: Array<{ productId: string; quantity: number; price: string }> = [];
      let storeId = "";

      for (const item of items) {
        const product = await storage.getProduct(item.productId);
        if (!product) {
          return res.status(400).json({ error: `Product ${item.productId} not found` });
        }
        const price = parseFloat(product.price);
        const quantity = parseInt(item.quantity) || 1;
        total += price * quantity;
        orderItemsArr.push({ productId: item.productId, quantity, price: product.price });
        if (!storeId) storeId = product.storeId;
      }

      // Add shipping
      const shipping = 500;
      total += shipping;

      // Get store to determine commission tier
      const store = await storage.getStore(storeId);
      const storeTier = (store?.subscriptionTier ?? "free") as "free" | "basic" | "premium";
      const merchantId = store?.ownerId ?? storeId;

      // Create internal order
      const order = await storage.createOrder({
        customerId: currentUser!.id,
        storeId,
        status: "pending",
        paymentStatus: "pending",
        paymentIntentId: null,
        total: total.toString(),
        address: address.trim(),
        notes: notes?.trim() || null,
        storeLat: null,
        storeLng: null,
        deliveryLat: null,
        deliveryLng: null,
        riderLat: null,
        riderLng: null,
      });

      for (const item of orderItemsArr) {
        await storage.createOrderItem({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        });
      }

      // Delegate to PaymentService (decoupled from Stripe)
      const checkout = await paymentService.initCheckout({
        orderId: order.id,
        buyerId: currentUser!.id,
        merchantId,
        amountGross: total,
        currency: "ARS",
        storeTier,
        buyerEmail: currentUser!.email,
      });

      // Keep backward-compat: store providerPaymentId on order.paymentIntentId
      await storage.updateOrder(order.id, {
        paymentIntentId: checkout.providerPaymentId,
      });

      res.json({
        orderId: order.id,
        paymentId: checkout.paymentId,
        clientSecret: checkout.clientSecret,
        total,
        breakdown: {
          gross: checkout.amountGross,
          fee: checkout.amountFee,
          net: checkout.amountNet,
          currency: checkout.currency,
        },
      });
    } catch (error: any) {
      console.error("Checkout error:", error);
      res.status(500).json({ error: error.message || "Failed to create order" });
    }
  });

  app.post("/api/checkout/confirm-payment", requireAuth, async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req);
      const { orderId, paymentId } = req.body;

      if (!orderId) {
        return res.status(400).json({ error: "Order ID required" });
      }

      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      if (order.customerId !== currentUser!.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Resolve paymentId: from body, or look it up by orderId
      let resolvedPaymentId = paymentId as string | undefined;
      if (!resolvedPaymentId) {
        const existingPayment = await paymentService.getPaymentByOrder(orderId);
        resolvedPaymentId = existingPayment?.id;
      }

      if (resolvedPaymentId) {
        // Confirm through PaymentService (verifies with provider + records ledger)
        await paymentService.confirmPayment({
          paymentId: resolvedPaymentId,
          actorId: currentUser!.id,
        });
      }

      // Update order status (commercial state, separate from financial state)
      await storage.updateOrder(orderId, {
        status: "confirmed",
        paymentStatus: "paid",
      });

      // Send confirmation emails (fire-and-forget)
      try {
        const updatedOrder = await storage.getOrder(orderId);
        const customer = await storage.getUser(updatedOrder?.customerId ?? "");
        const items = await storage.getOrderItems(orderId);
        if (updatedOrder && customer) {
          const storeIds = [...new Set(items.map((i) => i.storeId))];
          const storeList = await Promise.all(storeIds.map((sid) => storage.getStore(sid)));
          const storeName = storeList[0]?.name ?? "la tienda";
          const totalFormatted = new Intl.NumberFormat("es-AR", {
            style: "currency",
            currency: "ARS",
            maximumFractionDigits: 0,
          }).format(parseFloat(updatedOrder.total));
          sendOrderConfirmationEmail(customer.email, customer.username, orderId, totalFormatted, storeName).catch(() => {});
          for (const store of storeList) {
            if (!store) continue;
            const merchant = await storage.getUser(store.ownerId);
            if (merchant) {
              sendMerchantNewOrderEmail(merchant.email, merchant.username, orderId, totalFormatted, items.length).catch(() => {});
            }
          }
        }
      } catch (_) {}

      res.json({ success: true, orderId, paymentId: resolvedPaymentId });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to confirm payment" });
    }
  });

  // ==================== TRANSPORT & FLIGHTS ====================

  const BUS_COMPANIES = [
    { id: "flechabus", name: "Flecha Bus", initials: "FB", color: "bg-yellow-500", textColor: "text-yellow-600", bgLight: "bg-yellow-50 dark:bg-yellow-950/30", borderColor: "border-yellow-200 dark:border-yellow-800", rating: 4.6, reviews: 2341, services: ["wifi", "ac", "food"], destinations: ["Buenos Aires", "Córdoba", "Rosario", "Mendoza", "San Luis"] },
    { id: "chevallier", name: "Chevallier", initials: "CH", color: "bg-blue-600", textColor: "text-blue-600", bgLight: "bg-blue-50 dark:bg-blue-950/30", borderColor: "border-blue-200 dark:border-blue-800", rating: 4.4, reviews: 1876, services: ["wifi", "ac"], destinations: ["Buenos Aires", "Mendoza", "San Juan", "Neuquén", "Bariloche"] },
    { id: "andesmar", name: "Andesmar", initials: "AM", color: "bg-purple-600", textColor: "text-purple-600", bgLight: "bg-purple-50 dark:bg-purple-950/30", borderColor: "border-purple-200 dark:border-purple-800", rating: 4.3, reviews: 1540, services: ["wifi", "ac", "food"], destinations: ["Mendoza", "San Juan", "La Rioja", "Catamarca", "Tucumán"] },
    { id: "elrapido", name: "El Rápido Argentino", initials: "RA", color: "bg-green-600", textColor: "text-green-600", bgLight: "bg-green-50 dark:bg-green-950/30", borderColor: "border-green-200 dark:border-green-800", rating: 4.5, reviews: 2102, services: ["wifi", "ac"], destinations: ["Buenos Aires", "Rosario", "Santa Fe", "Paraná", "Concordia"] },
    { id: "plusmar", name: "Plusmar", initials: "PM", color: "bg-red-500", textColor: "text-red-600", bgLight: "bg-red-50 dark:bg-red-950/30", borderColor: "border-red-200 dark:border-red-800", rating: 4.2, reviews: 987, services: ["ac", "food"], destinations: ["Mar del Plata", "Miramar", "Necochea", "Bahía Blanca", "Buenos Aires"] },
    { id: "cotap", name: "COTAP", initials: "CT", color: "bg-orange-500", textColor: "text-orange-600", bgLight: "bg-orange-50 dark:bg-orange-950/30", borderColor: "border-orange-200 dark:border-orange-800", rating: 4.1, reviews: 654, services: ["ac"], destinations: ["Tucumán", "Salta", "Jujuy", "Santiago del Estero", "Buenos Aires"] },
  ];

  const AIRLINE_COMPANIES = [
    { id: "aerolineas", name: "Aerolíneas Argentinas", initials: "AR", color: "bg-sky-600", textColor: "text-sky-600", bgLight: "bg-sky-50 dark:bg-sky-950/30", borderColor: "border-sky-200 dark:border-sky-800", rating: 4.3, reviews: 5821, services: ["wifi", "food", "entertainment"], type: "full", destinations: ["Córdoba", "Mendoza", "Bariloche", "Iguazú", "Salta", "Ushuaia"] },
    { id: "latam", name: "LATAM Airlines", initials: "LA", color: "bg-red-600", textColor: "text-red-600", bgLight: "bg-red-50 dark:bg-red-950/30", borderColor: "border-red-200 dark:border-red-800", rating: 4.4, reviews: 4312, services: ["wifi", "food"], type: "full", destinations: ["Córdoba", "Mendoza", "Rosario", "Tucumán", "Santiago de Chile"] },
    { id: "flybondi", name: "Flybondi", initials: "FO", color: "bg-amber-500", textColor: "text-amber-600", bgLight: "bg-amber-50 dark:bg-amber-950/30", borderColor: "border-amber-200 dark:border-amber-800", rating: 3.9, reviews: 2876, services: ["entertainment"], type: "low", destinations: ["Córdoba", "Mendoza", "Mar del Plata", "Salta", "Iguazú", "Bariloche"] },
    { id: "jetsmart", name: "JetSmart", initials: "JA", color: "bg-orange-500", textColor: "text-orange-600", bgLight: "bg-orange-50 dark:bg-orange-950/30", borderColor: "border-orange-200 dark:border-orange-800", rating: 3.8, reviews: 1923, services: [], type: "low", destinations: ["Córdoba", "Mendoza", "Bariloche", "Tucumán", "Salta"] },
    { id: "andes", name: "Andes Líneas Aéreas", initials: "AN", color: "bg-indigo-600", textColor: "text-indigo-600", bgLight: "bg-indigo-50 dark:bg-indigo-950/30", borderColor: "border-indigo-200 dark:border-indigo-800", rating: 4.0, reviews: 1102, services: ["food"], type: "full", destinations: ["Salta", "Tucumán", "Jujuy", "Buenos Aires", "Mendoza"] },
  ];

  const ARG_CITIES = ["Buenos Aires", "Córdoba", "Rosario", "Mendoza", "San Miguel de Tucumán", "Mar del Plata", "Salta", "Santa Fe", "San Juan", "Resistencia", "Neuquén", "Corrientes", "Posadas", "Bahía Blanca", "San Luis", "Bariloche", "La Plata", "Paraná", "Formosa", "La Rioja", "Ushuaia", "Río Gallegos", "Comodoro Rivadavia", "Puerto Madryn", "Iguazú"];

  function buildServerTrips(companies: typeof BUS_COMPANIES | typeof AIRLINE_COMPANIES, origin: string, dest: string, date: string, isBus: boolean, seed: number) {
    const rng = (n: number) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
    return companies.map((c) => {
      const basePrice = isBus ? 18000 + rng(30000) : 55000 + rng(120000);
      const discount = rng(10) > 5 ? 10 + rng(25) : 0;
      const depH = 6 + rng(16);
      const durH = isBus ? 4 + rng(10) : 1 + rng(3);
      const durM = rng(59);
      const depM = rng(59);
      const arrH = (depH + durH) % 24;
      const arrM = (depM + durM) % 60;
      const fmt = (h: number, m: number) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const price = Math.round(basePrice / 100) * 100;
      const discountedPrice = discount > 0 ? Math.round(price * (1 - discount / 100) / 100) * 100 : price;
      return {
        id: `${c.id}-${date}-${origin}-${dest}`,
        company: c,
        origin: origin || "Buenos Aires",
        destination: dest || "Córdoba",
        date: date || new Date().toLocaleDateString("es-AR"),
        departure: fmt(depH, depM),
        arrival: fmt(arrH, arrM),
        duration: `${durH}h ${durM}m`,
        price,
        discountedPrice,
        discount,
        seats: 2 + rng(12),
      };
    });
  }

  app.get("/api/transport/cities", (_req, res) => {
    res.json({ cities: ARG_CITIES });
  });

  app.get("/api/transport/companies", (_req, res) => {
    res.json({ companies: BUS_COMPANIES });
  });

  app.get("/api/transport/routes", (_req, res) => {
    res.json({ routes: [] });
  });

  app.get("/api/transport/trips", (req, res) => {
    const origin = String(req.query.origin ?? "Buenos Aires");
    const dest = String(req.query.dest ?? "Córdoba");
    const date = String(req.query.date ?? new Date().toISOString().split("T")[0]);
    const seed = origin.charCodeAt(0) * dest.charCodeAt(0) + date.split("-").reduce((a, b) => a + Number(b), 0);
    const trips = buildServerTrips(BUS_COMPANIES, origin, dest, date, true, seed);
    res.json({ trips, origin, dest, date });
  });

  app.get("/api/flights/cities", (_req, res) => {
    res.json({ cities: ARG_CITIES });
  });

  app.get("/api/flights/airlines", (_req, res) => {
    res.json({ airlines: AIRLINE_COMPANIES });
  });

  app.get("/api/flights/search", (req, res) => {
    const origin = String(req.query.origin ?? "Buenos Aires");
    const dest = String(req.query.dest ?? "Córdoba");
    const date = String(req.query.date ?? new Date().toISOString().split("T")[0]);
    const seed = origin.charCodeAt(0) * dest.charCodeAt(0) * 7 + date.split("-").reduce((a, b) => a + Number(b), 0);
    const flights = buildServerTrips(AIRLINE_COMPANIES, origin, dest, date, false, seed);
    res.json({ flights, origin, dest, date });
  });

  app.post("/api/transport/bookings", requireAuth, async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { companyId, companyName, origin, destination, travelDate, departureTime, arrivalTime, duration, price, seats } = req.body;
    const booking = await storage.createTravelBooking({
      userId: user.id, type: "bus", companyId, companyName, origin, destination,
      travelDate, departureTime, arrivalTime, duration, price: Number(price), seats: Number(seats ?? 1), status: "confirmed",
    });
    res.json(booking);
  });

  app.post("/api/flights/bookings", requireAuth, async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { companyId, companyName, origin, destination, travelDate, departureTime, arrivalTime, duration, price, seats } = req.body;
    const booking = await storage.createTravelBooking({
      userId: user.id, type: "flight", companyId, companyName, origin, destination,
      travelDate, departureTime, arrivalTime, duration, price: Number(price), seats: Number(seats ?? 1), status: "confirmed",
    });
    res.json(booking);
  });

  app.get("/api/travel/my-bookings", requireAuth, async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const bookings = await storage.getTravelBookingsByUser(user.id);
    res.json(bookings);
  });

  app.get("/api/flights/bookings", requireAuth, async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const bookings = await storage.getTravelBookingsByUser(user.id);
    res.json(bookings.filter((b) => b.type === "flight"));
  });

  // ==================== SHOPPABLE VIDEOS ====================

  // Store follows
  app.post("/api/stores/:id/follow", requireAuth, async (req, res) => {
    const userId = (req.session as any).userId as string;
    await storage.followStore(userId, req.params.id);
    res.json({ ok: true });
  });

  app.delete("/api/stores/:id/follow", requireAuth, async (req, res) => {
    const userId = (req.session as any).userId as string;
    await storage.unfollowStore(userId, req.params.id);
    res.json({ ok: true });
  });

  app.get("/api/stores/:id/follow", requireAuth, async (req, res) => {
    const userId = (req.session as any).userId as string;
    const isFollowing = await storage.isFollowingStore(userId, req.params.id);
    const followersCount = await storage.getStoreFollowersCount(req.params.id);
    res.json({ isFollowing, followersCount });
  });

  app.get("/api/stores/:id/followers/count", async (req, res) => {
    const count = await storage.getStoreFollowersCount(req.params.id);
    res.json({ count });
  });

  // Public: get video feed with enriched store+product data
  app.get("/api/videos/feed", async (req, res) => {
    const provinciaId = String(req.query.provinciaId ?? "");
    const ciudadId = String(req.query.ciudadId ?? "");
    const storeIdFilter = req.query.storeId ? String(req.query.storeId) : undefined;
    const productIdFilter = req.query.productId ? String(req.query.productId) : undefined;
    const limit = Math.min(Number(req.query.limit ?? 10), 50);
    const offset = Number(req.query.offset ?? 0);
    const userId = (req.session as any)?.userId as string | undefined;

    const videos = await storage.getVideoFeed({
      provinciaId: provinciaId || undefined,
      ciudadId: ciudadId || undefined,
      storeId: storeIdFilter,
      productId: productIdFilter,
      limit,
      offset,
      userId,
    });

    // Enrich with store and product data
    const enriched = await Promise.all(
      videos.map(async (video) => {
        const store = video.storeId ? await storage.getStore(video.storeId) : undefined;
        const product = video.productId ? await storage.getProduct(video.productId) : undefined;
        const followersCount = video.storeId ? await storage.getStoreFollowersCount(video.storeId) : 0;
        const isFollowing = (userId && video.storeId) ? await storage.isFollowingStore(userId, video.storeId) : false;
        return {
          ...video,
          store: store ? { id: store.id, name: store.name, category: store.category, rating: store.rating, lat: store.lat, lng: store.lng, followersCount, isFollowing } : undefined,
          product: product ? { id: product.id, name: product.name, price: product.price, image: product.image, originalPrice: product.originalPrice } : undefined,
        };
      })
    );

    res.json(enriched);
  });

  // Public: get single video
  app.get("/api/videos/:id", async (req, res) => {
    const video = await storage.getVideo(req.params.id);
    if (!video) return res.status(404).json({ error: "Video no encontrado" });
    const store = video.storeId ? await storage.getStore(video.storeId) : undefined;
    const product = video.productId ? await storage.getProduct(video.productId) : undefined;
    res.json({
      ...video,
      store: store ? { id: store.id, name: store.name, category: store.category, rating: store.rating, lat: store.lat, lng: store.lng } : undefined,
      product: product ? { id: product.id, name: product.name, price: product.price, image: product.image, originalPrice: product.originalPrice } : undefined,
    });
  });

  // Public: track video view
  app.post("/api/videos/:id/view", async (req, res) => {
    await storage.trackVideoView(req.params.id);
    res.json({ ok: true });
  });

  // Public: track add to cart from video
  app.post("/api/videos/:id/add-to-cart", async (req, res) => {
    await storage.trackVideoAddToCart(req.params.id);
    res.json({ ok: true });
  });

  // Merchant: upload video file
  app.post("/api/merchant/videos/upload-video", requireAuth, requireRole("merchant"), (req, res) => {
    uploadVideo(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: "No se recibió ningún archivo de video" });
      try {
        const url = await processUpload(req.file, "videos", false, true);
        res.json({ url });
      } catch (e: any) { res.status(400).json({ error: e.message }); }
    });
  });

  // Merchant: upload thumbnail
  app.post("/api/merchant/videos/upload-thumbnail", requireAuth, requireRole("merchant"), (req, res) => {
    uploadThumbnail(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: "No se recibió ninguna imagen" });
      try {
        const url = await processUpload(req.file, "thumbnails", true, false);
        res.json({ url });
      } catch (e: any) { res.status(400).json({ error: e.message }); }
    });
  });

  // Merchant: list own videos
  app.get("/api/merchant/videos", requireAuth, requireRole("merchant"), async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const videos = await storage.getVideosByMerchant(user.id);
    const enriched = await Promise.all(
      videos.map(async (video) => {
        const product = video.productId ? await storage.getProduct(video.productId) : undefined;
        return { ...video, product: product ? { id: product.id, name: product.name } : undefined };
      })
    );
    res.json(enriched);
  });

  // Merchant: create video
  app.post("/api/merchant/videos", requireAuth, requireRole("merchant"), async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const stores = await storage.getStoresByOwner(user.id);
    if (stores.length === 0) return res.status(400).json({ error: "No tenés ninguna tienda activa" });
    const { title, description, tags, videoUrl, thumbnailUrl, productId, contentType, targetProvince, targetCity } = req.body;
    if (!title || !videoUrl) return res.status(400).json({ error: "Título y URL de video son requeridos" });
    const video = await storage.createVideo({
      merchantId: user.id,
      storeId: stores[0].id,
      productId: productId || null,
      title,
      description: description || null,
      tags: tags || null,
      videoUrl,
      thumbnailUrl: thumbnailUrl || null,
      contentType: contentType || "product",
      status: "pending",
      isFeatured: false,
      isSponsored: false,
      viewsCount: 0,
      clicksCount: 0,
      addToCartCount: 0,
      purchasesCount: 0,
      savesCount: 0,
      targetProvince: targetProvince || null,
      targetCity: targetCity || null,
      publishedAt: null,
    });
    res.status(201).json(video);
  });

  // Merchant: update own video
  app.patch("/api/merchant/videos/:id", requireAuth, requireRole("merchant"), async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const video = await storage.getVideo(req.params.id);
    if (!video || video.merchantId !== user.id) return res.status(404).json({ error: "Video no encontrado" });
    const { title, description, tags, thumbnailUrl, productId, contentType, targetProvince, targetCity, status } = req.body;
    const allowedStatus = video.status === "draft" || video.status === "rejected" ? "pending" : undefined;
    const updated = await storage.updateVideo(req.params.id, {
      title: title ?? video.title,
      description: description ?? video.description,
      tags: tags ?? video.tags,
      thumbnailUrl: thumbnailUrl ?? video.thumbnailUrl,
      productId: productId ?? video.productId,
      contentType: contentType ?? video.contentType,
      targetProvince: targetProvince ?? video.targetProvince,
      targetCity: targetCity ?? video.targetCity,
      ...(status === "pending" && allowedStatus ? { status: "pending" } : {}),
    });
    res.json(updated);
  });

  // Merchant: delete own video
  app.delete("/api/merchant/videos/:id", requireAuth, requireRole("merchant"), async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const video = await storage.getVideo(req.params.id);
    if (!video || video.merchantId !== user.id) return res.status(404).json({ error: "Video no encontrado" });
    await storage.deleteVideo(req.params.id);
    res.json({ ok: true });
  });

  // Admin: list all videos
  app.get("/api/admin/videos", requireAuth, requireRole("admin"), async (req, res) => {
    const status = req.query.status as string | undefined;
    const videos = await storage.getAllVideosForAdmin(status as any);
    const enriched = await Promise.all(
      videos.map(async (video) => {
        const store = await storage.getStore(video.storeId);
        const product = video.productId ? await storage.getProduct(video.productId) : undefined;
        return {
          ...video,
          store: store ? { id: store.id, name: store.name } : undefined,
          product: product ? { id: product.id, name: product.name } : undefined,
        };
      })
    );
    res.json(enriched);
  });

  // Admin: update video status (approve/reject/feature)
  app.patch("/api/admin/videos/:id/status", requireAuth, requireRole("admin"), async (req, res) => {
    const { status } = req.body;
    if (!["draft", "pending", "approved", "rejected", "published"].includes(status)) {
      return res.status(400).json({ error: "Estado inválido" });
    }
    const video = await storage.getVideo(req.params.id);
    if (!video) return res.status(404).json({ error: "Video no encontrado" });
    const updates: any = { status };
    if (status === "published" && !video.publishedAt) updates.publishedAt = new Date();
    const updated = await storage.updateVideo(req.params.id, updates);
    res.json(updated);
  });

  // Admin: toggle featured
  app.patch("/api/admin/videos/:id/featured", requireAuth, requireRole("admin"), async (req, res) => {
    const video = await storage.getVideo(req.params.id);
    if (!video) return res.status(404).json({ error: "Video no encontrado" });
    const updated = await storage.updateVideo(req.params.id, { isFeatured: !video.isFeatured });
    res.json(updated);
  });

  // Admin: toggle sponsored
  app.patch("/api/admin/videos/:id/sponsored", requireAuth, requireRole("admin"), async (req, res) => {
    const video = await storage.getVideo(req.params.id);
    if (!video) return res.status(404).json({ error: "Video no encontrado" });
    const updated = await storage.updateVideo(req.params.id, { isSponsored: !video.isSponsored });
    res.json(updated);
  });

  // Site settings: get all
  app.get("/api/config/home-settings", async (_req, res) => {
    try {
      const settings = await storage.getAllSiteSettings();
      res.json(settings);
    } catch (err) {
      res.status(500).json({ error: "Error fetching home settings" });
    }
  });

  // Site settings: update one
  app.patch("/api/config/home-settings", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { key, value } = req.body as { key: string; value: string };
      if (!key || value === undefined) return res.status(400).json({ error: "key and value required" });
      await storage.setSiteSetting(key, value);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: "Error updating home setting" });
    }
  });

  // ─── NOVEDADES ──────────────────────────────────────────────────────────────

  app.get("/api/novedades", async (req, res) => {
    try {
      const { provincia, official, category, limit } = req.query as Record<string, string>;
      const items = await storage.getNovedades({
        provinciaId: provincia || undefined,
        isOfficial: official !== undefined ? official === "true" : undefined,
        category: category || undefined,
        limit: limit ? parseInt(limit) : undefined,
      });
      res.json(items);
    } catch (err) {
      res.status(500).json({ error: "Error fetching novedades" });
    }
  });

  app.get("/api/novedades/:id", async (req, res) => {
    const item = await storage.getNovedadById(req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  });

  app.get("/api/admin/novedades", requireRole("admin"), async (_req, res) => {
    const items = await storage.getAllNovedadesAdmin();
    res.json(items);
  });

  app.post("/api/admin/novedades", requireRole("admin"), async (req, res) => {
    try {
      const item = await storage.createNovedad(req.body);
      res.status(201).json(item);
    } catch (err) {
      res.status(400).json({ error: "Invalid data" });
    }
  });

  app.patch("/api/admin/novedades/:id", requireRole("admin"), async (req, res) => {
    try {
      const item = await storage.updateNovedad(req.params.id, req.body);
      if (!item) return res.status(404).json({ error: "Not found" });
      res.json(item);
    } catch (err) {
      res.status(400).json({ error: "Error updating novedad" });
    }
  });

  app.delete("/api/admin/novedades/:id", requireRole("admin"), async (req, res) => {
    await storage.deleteNovedad(req.params.id);
    res.json({ ok: true });
  });

  // ─── OFICIAL PANEL ──────────────────────────────────────────────────────────

  app.get("/api/oficial/me", requireRole("official", "admin"), async (req, res) => {
    const user = (req as any).user;
    const entity = await storage.getEntityForUser(user.id);
    if (!entity) return res.status(404).json({ error: "No tenés ninguna entidad vinculada a tu cuenta" });
    const secretaria = await storage.getSecretariaForUser(user.id);
    res.json({ user, entity, secretaria: secretaria ?? null });
  });

  app.get("/api/oficial/novedades", requireRole("official", "admin"), async (req, res) => {
    const user = (req as any).user;
    const entity = await storage.getEntityForUser(user.id);
    if (!entity) return res.status(404).json({ error: "Sin entidad vinculada" });
    const items = await storage.getNovedadesForEntity(entity.id);
    res.json(items);
  });

  app.post("/api/oficial/novedades", requireRole("official", "admin"), async (req, res) => {
    try {
      const user = (req as any).user;
      const item = await storage.createOfficialNovedad(user.id, req.body);
      res.status(201).json(item);
    } catch (err: any) {
      res.status(400).json({ error: err.message ?? "Error al crear novedad" });
    }
  });

  app.patch("/api/oficial/novedades/:id", requireRole("official", "admin"), async (req, res) => {
    try {
      const user = (req as any).user;
      const item = await storage.updateOfficialNovedad(user.id, req.params.id, req.body);
      if (!item) return res.status(404).json({ error: "Novedad no encontrada o sin permiso" });
      res.json(item);
    } catch (err: any) {
      res.status(400).json({ error: err.message ?? "Error al actualizar" });
    }
  });

  app.delete("/api/oficial/novedades/:id", requireRole("official", "admin"), async (req, res) => {
    const user = (req as any).user;
    const ok = await storage.deleteOfficialNovedad(user.id, req.params.id);
    if (!ok) return res.status(404).json({ error: "No encontrada o sin permiso" });
    res.json({ ok: true });
  });

  // ─── UPLOAD INSTITUCIONAL ──────────────────────────────────────────────────

  app.post("/api/oficial/upload", requireRole("official", "admin"), (req, res) => {
    uploadInstitucional(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message ?? "Error al subir archivo" });
      if (!req.file) return res.status(400).json({ error: "No se recibió ningún archivo" });
      const isVideo = req.file.mimetype.startsWith("video/");
      try {
        const url = await processUpload(req.file, "institucional", true, isVideo);
        res.json({ url, type: isVideo ? "video" : "image" });
      } catch (e: any) { res.status(400).json({ error: e.message }); }
    });
  });

  // ─── EDITAR ENTIDAD ────────────────────────────────────────────────────────

  app.patch("/api/oficial/entity", requireRole("official", "admin"), async (req, res) => {
    try {
      const user = (req as any).user;
      const entity = await storage.getEntityForUser(user.id);
      if (!entity) return res.status(404).json({ error: "Sin entidad vinculada" });
      const allowed = [
        "name", "description", "logo", "banner", "institutionalEmail", "phone",
        "website", "address", "responsibleName", "responsibleTitle",
        "facebook", "instagram", "twitter", "tiktok", "youtube",
      ];
      const updates: Record<string, any> = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }
      const updated = await storage.updatePublicEntity(entity.id, updates);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message ?? "Error al actualizar entidad" });
    }
  });

  // ─── SECRETARÍAS ──────────────────────────────────────────────────────────

  app.get("/api/oficial/secretarias", requireRole("official", "admin"), async (req, res) => {
    const user = (req as any).user;
    const entity = await storage.getEntityForUser(user.id);
    if (!entity) return res.status(404).json({ error: "Sin entidad vinculada" });
    const items = await storage.getSecretarias(entity.id);
    res.json(items);
  });

  app.post("/api/oficial/secretarias", requireRole("official", "admin"), async (req, res) => {
    try {
      const user = (req as any).user;
      const entity = await storage.getEntityForUser(user.id);
      if (!entity) return res.status(404).json({ error: "Sin entidad vinculada" });
      const { name, area, description, logo } = req.body;
      if (!name) return res.status(400).json({ error: "name requerido" });
      const item = await storage.createSecretaria(entity.id, { name, area, description, logo });
      res.status(201).json(item);
    } catch (err: any) {
      res.status(400).json({ error: err.message ?? "Error al crear secretaría" });
    }
  });

  app.patch("/api/oficial/secretarias/:id", requireRole("official", "admin"), async (req, res) => {
    try {
      const me = (req as any).user;
      if (me.role !== "admin") {
        const entity = await storage.getEntityForUser(me.id);
        const secs = entity ? await storage.getSecretarias(entity.id) : [];
        if (!secs.find(s => s.id === req.params.id)) {
          return res.status(403).json({ error: "No podés modificar secretarías de otra entidad" });
        }
      }
      const item = await storage.updateSecretaria(req.params.id, req.body);
      if (!item) return res.status(404).json({ error: "Secretaría no encontrada" });
      res.json(item);
    } catch (err: any) {
      res.status(400).json({ error: err.message ?? "Error al actualizar secretaría" });
    }
  });

  app.delete("/api/oficial/secretarias/:id", requireRole("official", "admin"), async (req, res) => {
    const me = (req as any).user;
    if (me.role !== "admin") {
      const entity = await storage.getEntityForUser(me.id);
      const secs = entity ? await storage.getSecretarias(entity.id) : [];
      if (!secs.find(s => s.id === req.params.id)) {
        return res.status(403).json({ error: "No podés eliminar secretarías de otra entidad" });
      }
    }
    await storage.deleteSecretaria(req.params.id);
    res.json({ ok: true });
  });

  app.post("/api/oficial/secretarias/:id/create-account", requireRole("official", "admin"), async (req, res) => {
    try {
      const me = (req as any).user;
      if (me.role !== "admin") {
        const entity = await storage.getEntityForUser(me.id);
        const secs = entity ? await storage.getSecretarias(entity.id) : [];
        if (!secs.find(s => s.id === req.params.id)) {
          return res.status(403).json({ error: "No podés crear cuentas para secretarías de otra entidad" });
        }
      }
      const { email, username, password } = req.body as { email: string; username: string; password: string };
      if (!email || !username || !password) return res.status(400).json({ error: "email, username y password requeridos" });
      const hashed = await hashPassword(password);
      const newUser = await storage.createSecretariaAccount(req.params.id, email, username, hashed);
      res.status(201).json({ ok: true, userId: newUser.id });
    } catch (err: any) {
      res.status(400).json({ error: err.message ?? "Error al crear cuenta" });
    }
  });

  // Admin crea cuenta oficial para una entidad pública
  app.post("/api/admin/public-entities/:id/create-account", requireRole("admin"), async (req, res) => {
    try {
      const { email, username, password } = req.body as { email: string; username: string; password: string };
      if (!email || !username || !password) return res.status(400).json({ error: "email, username y password requeridos" });
      const hashed = await hashPassword(password);
      const user = await storage.createOfficialAccount(req.params.id, email, username, hashed);
      res.status(201).json({ ok: true, userId: user.id });
    } catch (err: any) {
      res.status(400).json({ error: err.message ?? "Error al crear cuenta" });
    }
  });

  // ─── PUBLIC ENTITIES ────────────────────────────────────────────────────────

  app.get("/api/public-entities", async (req, res) => {
    try {
      const { provincia, status } = req.query as Record<string, string>;
      const items = await storage.getPublicEntities({
        provinciaId: provincia || undefined,
        verificationStatus: status || undefined,
      });
      res.json(items);
    } catch (err) {
      res.status(500).json({ error: "Error fetching public entities" });
    }
  });

  app.get("/api/public-entities/:id", async (req, res) => {
    const item = await storage.getPublicEntityById(req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  });

  app.get("/api/admin/public-entities", requireRole("admin"), async (_req, res) => {
    const items = await storage.getAllPublicEntitiesAdmin();
    res.json(items);
  });

  app.post("/api/admin/public-entities", requireRole("admin"), async (req, res) => {
    try {
      const item = await storage.createPublicEntity(req.body);
      res.status(201).json(item);
    } catch (err) {
      res.status(400).json({ error: "Invalid data" });
    }
  });

  app.patch("/api/admin/public-entities/:id", requireRole("admin"), async (req, res) => {
    try {
      const item = await storage.updatePublicEntity(req.params.id, req.body);
      if (!item) return res.status(404).json({ error: "Not found" });
      res.json(item);
    } catch (err) {
      res.status(400).json({ error: "Error updating entity" });
    }
  });

  return httpServer;
}
