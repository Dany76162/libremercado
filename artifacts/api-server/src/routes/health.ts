import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { pool } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

/** Readiness: proceso vivo + Postgres responde (Railway / k8s). */
router.get("/readyz", async (_req, res) => {
  try {
    await pool.query("select 1 as ok");
    res.json({ status: "ok", db: true });
  } catch {
    res.status(503).json({ status: "error", db: false });
  }
});

export default router;
