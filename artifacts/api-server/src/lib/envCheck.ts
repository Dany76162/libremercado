import { logger } from "./logger";

/**
 * Validación de configuración mínima en producción.
 * No sustituye secret scanning ni revisiones de seguridad.
 */
export function assertProductionConfig(): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const issues: string[] = [];

  if (!process.env.DATABASE_URL?.trim()) {
    issues.push("DATABASE_URL");
  }

  const sessionSecret = process.env.SESSION_SECRET || "";
  if (!sessionSecret || sessionSecret === "libremercado-dev-secret") {
    issues.push("SESSION_SECRET (definí un secreto fuerte, no el valor de desarrollo)");
  }

  const useLocal =
    process.env.USE_LOCAL_UPLOADS === "true" ||
    process.env.USE_LOCAL_UPLOADS === "1";

  if (useLocal) {
    issues.push(
      "USE_LOCAL_UPLOADS está activo: no uses almacenamiento en disco en producción (Railway). Configurá R2 y desactivá USE_LOCAL_UPLOADS."
    );
  }

  if (!useLocal) {
    for (const k of [
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
      "R2_BUCKET",
    ] as const) {
      if (!process.env[k]?.trim()) {
        issues.push(k);
      }
    }
    if (
      !process.env.R2_ACCOUNT_ID?.trim() &&
      !process.env.R2_ENDPOINT?.trim()
    ) {
      issues.push("R2_ACCOUNT_ID o R2_ENDPOINT");
    }
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET?.trim()) {
    issues.push("STRIPE_WEBHOOK_SECRET");
  }

  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    issues.push("STRIPE_SECRET_KEY");
  }

  if (!process.env.STRIPE_PUBLISHABLE_KEY?.trim()) {
    issues.push("STRIPE_PUBLISHABLE_KEY");
  }

  if (!process.env.CORS_ORIGINS?.trim() && !process.env.ALLOWED_ORIGIN?.trim()) {
    logger.warn(
      "Producción sin CORS_ORIGINS ni ALLOWED_ORIGIN: el front en otro dominio será rechazado hasta que configures orígenes explícitos."
    );
  }

  const cross =
    process.env.SESSION_CROSS_SITE === "1" ||
    process.env.SESSION_CROSS_SITE === "true";
  const corsRaw = process.env.CORS_ORIGINS ?? "";
  if (!cross && corsRaw.includes("vercel.app")) {
    logger.warn(
      "Parece un front en Vercel pero SESSION_CROSS_SITE no está habilitado; las cookies de sesión pueden no enviarse en fetch cross-site. Definí SESSION_CROSS_SITE=true y usá HTTPS."
    );
  }

  if (issues.length > 0) {
    throw new Error(
      `Configuración de producción incompleta: ${issues.join(", ")}`
    );
  }
}
