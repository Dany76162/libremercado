import app, { httpServer } from "./app";
import { logger } from "./lib/logger";
import { registerRoutes } from "./routes/libremercado";
import { seedIfEmpty, updateDemoData } from "./database-storage";
import { travelBookingService } from "./travel/TravelBookingService";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

(async () => {
  await registerRoutes(httpServer, app);
  if (process.env["NODE_ENV"] !== "production") {
    await seedIfEmpty();
    if (process.env["SKIP_DEMO_UPDATE"] !== "true") {
      await updateDemoData();
    }
  }

  httpServer.listen(port, "0.0.0.0", () => {
    logger.info({ port }, "Server listening");

    // ─── Travel: periodic seat expiry job ─────────────────────────────────────
    // Frees seats that were reserved but never paid (TTL = 15 min).
    // Runs every 60 seconds so inventory stays clean without relying on booking flow.
    setInterval(async () => {
      try {
        const freed = await travelBookingService.expireOldReservations();
        if (freed > 0) {
          logger.info({ freed }, "[travel:expiry] Released stale reserved seats");
        }
      } catch (err: any) {
        logger.warn({ err: err.message }, "[travel:expiry] Failed to run expiry job");
      }
    }, 60_000);
  });
})();
