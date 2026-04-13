import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import pgSession from "connect-pg-simple";
import pg from "pg";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import router from "./routes";
import { logger } from "./lib/logger";
import { WebhookHandlers } from "./webhookHandlers";
import { setupWebSocket } from "./ws";

const PgStore = pgSession(session);
const pgPool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const app: Express = express();
const httpServer = createServer(app);
app.set("trust proxy", process.env.TRUST_PROXY === "0" ? false : true);

// Railway default checks often probe "/" or "/health".
app.get("/", (_req, res) => {
  res.status(200).json({ status: "ok", service: "api-server" });
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }

  const explicit = [
    ...(process.env.CORS_ORIGINS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  ];
  if (process.env.ALLOWED_ORIGIN?.trim()) {
    explicit.push(process.env.ALLOWED_ORIGIN.trim());
  }

  if (explicit.length > 0) {
    return explicit.includes(origin);
  }

  return /^https?:\/\/localhost(:\d+)?$/.test(origin);
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
  })
);

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos. Esperá 15 minutos." },
});

export const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados registros. Esperá 15 minutos." },
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas solicitudes. Esperá 15 minutos." },
});

// Payment webhook — provider-agnostic route. Must be before express.json()
// Legacy alias kept for backward compat with existing Stripe dashboard config.
const webhookHandler = express.raw({ type: "application/json" });
const processWebhook = async (req: any, res: any) => {
  const signature = req.headers["stripe-signature"] as string | string[] | undefined;
  if (!signature) {
    return res.status(400).json({ error: "Missing webhook signature" });
  }
  try {
    const sig = Array.isArray(signature) ? signature[0] : signature;
    if (!Buffer.isBuffer(req.body)) {
      return res.status(500).json({ error: "Webhook processing error" });
    }
    await WebhookHandlers.processWebhook(req.body as Buffer, sig);
    res.status(200).json({ received: true });
  } catch {
    res.status(400).json({ error: "Webhook processing error" });
  }
};

// Primary provider-agnostic path
app.post("/api/payments/webhook", webhookHandler, processWebhook);
// Legacy Stripe-specific alias (keep until Stripe dashboard is updated)
app.post("/api/stripe/webhook", webhookHandler, processWebhook);

// On-disk uploads (solo desarrollo / fallback local)
app.use("/uploads", express.static("uploads"));

// Proxy de objetos en R2 (producción). En USE_LOCAL_UPLOADS las URLs van a /uploads/...
app.get(/^\/api\/files\/(.+)$/, async (req: any, res: any) => {
  const useLocal =
    process.env.USE_LOCAL_UPLOADS === "true" ||
    process.env.USE_LOCAL_UPLOADS === "1";
  if (useLocal) {
    return res.status(404).json({ error: "Archivo no encontrado" });
  }

  try {
    const raw = req.params[0] as string;
    const objectPath = decodeURIComponent(raw);
    if (!objectPath || objectPath.includes("..")) {
      return res.status(400).json({ error: "Ruta inválida" });
    }

    const { getR2ObjectStream } = await import("./lib/gcsUpload");
    const { stream, contentType, contentLength } = await getR2ObjectStream(
      objectPath
    );
    res.setHeader("Content-Type", contentType);
    if (contentLength != null) {
      res.setHeader("Content-Length", String(contentLength));
    }
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    stream.pipe(res);
  } catch (err: any) {
    const code = err?.name || err?.Code || err?.code;
    if (
      code === "NotFound" ||
      code === "NoSuchKey" ||
      String(err?.message || "").includes("Not Found")
    ) {
      return res.status(404).json({ error: "Archivo no encontrado" });
    }
    logger.error({ err }, "Error sirviendo objeto R2");
    res.status(500).json({ error: "Error al servir el archivo" });
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const sessionSecret = process.env.SESSION_SECRET || "libremercado-dev-secret";
const isTest = process.env.NODE_ENV === "test";
const isProd = process.env.NODE_ENV === "production";
const crossSite =
  process.env.SESSION_CROSS_SITE === "1" ||
  process.env.SESSION_CROSS_SITE === "true";

app.use(
  session({
    // In test environment use the default in-memory store to avoid PG connection overhead
    ...(isTest
      ? {}
      : {
          store: new PgStore({
            pool: pgPool,
            tableName: "session",
          }),
        }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProd,
      httpOnly: true,
      // En producción con front (Vercel) y API (Railway) en distinto sitio: SESSION_CROSS_SITE=true + HTTPS.
      sameSite: isProd && crossSite ? ("none" as const) : ("lax" as const),
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use("/api", router);

app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  logger.error({ err }, "Internal Server Error");
  if (res.headersSent) {
    return next(err);
  }
  return res.status(status).json({ message });
});

setupWebSocket(httpServer);

export { httpServer };
export default app;
