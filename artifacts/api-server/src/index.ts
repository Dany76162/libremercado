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

function parseErrorDetails(err: unknown) {
  if (err instanceof Error) {
    const errorWithCode = err as Error & { code?: string };
    return {
      message: err.message,
      stack: err.stack,
      code: errorWithCode.code,
    };
  }
  return { message: String(err) };
}

function startTravelExpiryJob(): void {
  const disabled =
    process.env.DISABLE_TRAVEL_EXPIRY_JOB === "1" ||
    process.env.DISABLE_TRAVEL_EXPIRY_JOB === "true";
  if (disabled) {
    logger.warn("[travel:expiry] Job disabled by DISABLE_TRAVEL_EXPIRY_JOB");
    return;
  }

  const intervalMs = Number(process.env.TRAVEL_EXPIRY_INTERVAL_MS ?? "60000");
  let running = false;

  const runTick = async () => {
    if (running) {
      logger.warn("[travel:expiry] Previous run still in progress; skipping this tick");
      return;
    }
    running = true;
    const startedAt = Date.now();
    try {
      const freed = await travelBookingService.expireOldReservations();
      const durationMs = Date.now() - startedAt;
      logger.info(
        { freed, durationMs },
        "[travel:expiry] Job run completed"
      );
    } catch (err: unknown) {
      const details = parseErrorDetails(err);
      const code = (details as { code?: string }).code;
      // 42P01: undefined_table (Drizzle/PG) - common during migrations mismatch.
      if (code === "42P01") {
        logger.error(
          { ...details },
          "[travel:expiry] Missing DB table. Job degraded safely; HTTP server remains healthy."
        );
      } else {
        logger.error(
          { ...details },
          "[travel:expiry] Failed to run expiry job"
        );
      }
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => {
    void runTick();
  }, intervalMs);
  timer.unref();
  void runTick();
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
    startTravelExpiryJob();
  });
})();
