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
app.set("trust proxy", 1);

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

const allowedOrigins = [
  /^https?:\/\/localhost(:\d+)?$/,
  /\.replit\.dev$/,
  /\.picard\.replit\.dev$/,
  /\.repl\.co$/,
];

if (process.env.ALLOWED_ORIGIN) {
  allowedOrigins.push(new RegExp(`^${process.env.ALLOWED_ORIGIN.replace(/\./g, "\\.")}$`));
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const ok = allowedOrigins.some((pattern) =>
        pattern instanceof RegExp ? pattern.test(origin) : origin === pattern
      );
      if (ok) return callback(null, true);
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
  } catch (error: any) {
    res.status(400).json({ error: "Webhook processing error" });
  }
};

// Primary provider-agnostic path
app.post("/api/payments/webhook", webhookHandler, processWebhook);
// Legacy Stripe-specific alias (keep until Stripe dashboard is updated)
app.post("/api/stripe/webhook", webhookHandler, processWebhook);

// Serve uploads statically (legacy on-disk files)
app.use("/uploads", express.static("uploads"));

// Serve GCS-stored files via proxy
app.get(/^\/api\/files\/(.+)$/, async (req: any, res: any) => {
  try {
    const { getBucket } = await import("./lib/gcsUpload");
    const objectPath = req.params[0] as string;
    if (!objectPath) return res.status(404).end();
    const bucket = getBucket();
    const file = bucket.file(objectPath);
    const [exists] = await file.exists();
    if (!exists) return res.status(404).json({ error: "Archivo no encontrado" });
    const [metadata] = await file.getMetadata();
    res.setHeader("Content-Type", (metadata as any).contentType || "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    file.createReadStream().pipe(res);
  } catch (err: any) {
    res.status(500).json({ error: "Error al servir el archivo" });
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const sessionSecret = process.env.SESSION_SECRET || "libremercado-dev-secret";
const isTest = process.env.NODE_ENV === "test";
app.use(
  session({
    // In test environment use the default in-memory store to avoid PG connection overhead
    ...(isTest ? {} : {
      store: new PgStore({
        pool: pgPool,
        tableName: "session",
      }),
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
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
