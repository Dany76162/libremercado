import app, { httpServer } from "./app";
import { logger } from "./lib/logger";
import { registerRoutes } from "./routes/libremercado";
import { seedIfEmpty, updateDemoData } from "./database-storage";

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
  await seedIfEmpty();
  if (process.env["NODE_ENV"] !== "production" && process.env["SKIP_DEMO_UPDATE"] !== "true") {
    await updateDemoData();
  }

  httpServer.listen(port, "0.0.0.0", () => {
    logger.info({ port }, "Server listening");
  });
})();
