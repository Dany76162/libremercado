import app, { httpServer } from "./app";
import { logger } from "./lib/logger";
import { assertProductionConfig } from "./lib/envCheck";
import { registerRoutes } from "./routes/libremercado";
import { seedIfEmpty, updateDemoData } from "./database-storage";
import { travelBookingService } from "./travel/TravelBookingService";

const port = Number(process.env.PORT ?? "5000");

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${process.env.PORT}"`);
}

(async () => {
  assertProductionConfig();

  await registerRoutes(httpServer, app);
  if (process.env.NODE_ENV !== "production") {
    await seedIfEmpty();
    if (process.env.SKIP_DEMO_UPDATE !== "true") {
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
