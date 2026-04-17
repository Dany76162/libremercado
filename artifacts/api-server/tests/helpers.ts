/**
 * Test helpers — shared utilities for all test suites.
 *
 * Strategy:
 *  - supertest.agent is used for authenticated requests (auto-manages cookies).
 *  - App is initialized once via singleton guard shared via isolate:false in vitest.
 *  - Users created via API (real register endpoint) → role upgraded via direct DB.
 *  - All test data uses email domain '@test.libremercado.com' for easy cleanup.
 */

import supertest from "supertest";
import { eq, like } from "drizzle-orm";
import app, { httpServer } from "../src/app";
import { registerRoutes } from "../src/routes/libremercado";
import { db, users, stores, products, orders } from "@workspace/db";

export const TEST_DOMAIN = "@test.libremercado.com";
export const TEST_PASSWORD = "TestPass123!";

let routesInitialized = false;

/** Non-authenticated supertest agent (fresh per call) */
export function getAgent() {
  return supertest(app);
}

/** Initialize the Express app with all routes. Safe to call multiple times. */
export async function initApp() {
  if (!routesInitialized) {
    await registerRoutes(httpServer, app);
    routesInitialized = true;
  }
}

// ─── User helpers ─────────────────────────────────────────────────────────────

export interface TestUser {
  id: string;
  email: string;
  username: string;
  /** Cookie string for use with .set("Cookie", ...) */
  cookie: string;
  /** supertest.agent with active session */
  agent: ReturnType<typeof supertest.agent>;
}

export async function createAndLoginUser(
  tag: string,
  role: "customer" | "merchant" | "admin" = "customer"
): Promise<TestUser> {
  const suffix = `${tag}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const email = `${suffix}${TEST_DOMAIN}`;
  const username = `tu_${suffix}`.slice(0, 30);

  const agent = supertest.agent(app);

  const regRes = await agent.post("/api/auth/register").send({
    email,
    username,
    password: TEST_PASSWORD,
    termsAccepted: true,
  });

  if (regRes.status !== 201 && regRes.status !== 200) {
    throw new Error(`Register failed ${regRes.status}: ${JSON.stringify(regRes.body)}`);
  }

  const userId = regRes.body.id as string;

  if (role !== "customer") {
    await db.update(users).set({ role }).where(eq(users.id, userId));
  }

  const loginRes = await agent.post("/api/auth/login").send({ email, password: TEST_PASSWORD });

  if (loginRes.status !== 200) {
    throw new Error(`Login failed ${loginRes.status}: ${JSON.stringify(loginRes.body)}`);
  }

  const rawCookies = (loginRes.headers["set-cookie"] ?? []) as string[];
  const cookie = rawCookies.map((c) => c.split(";")[0]).join("; ");

  return { id: userId, email, username, cookie, agent };
}

// ─── Store helpers ────────────────────────────────────────────────────────────

export async function createTestStore(merchant: TestUser, nameSuffix = "") {
  const res = await merchant.agent
    .post("/api/stores")
    .send({
      ownerId: merchant.id,
      name: `TestStore_${nameSuffix || "X"}`.slice(0, 40),
      description: "Test store for automated tests",
      category: "general",
    });

  if (res.status !== 201 && res.status !== 200) {
    throw new Error(`Create store failed ${res.status}: ${JSON.stringify(res.body)}`);
  }
  return res.body as { id: string; name: string; ownerId: string };
}

// ─── Product helpers ──────────────────────────────────────────────────────────

export async function createTestProduct(merchant: TestUser, storeId: string) {
  const res = await merchant.agent
    .post("/api/merchant/products")
    .send({
      storeId,
      name: "Test Product Automatizado",
      description: "Automated test product",
      price: "99.99",
      stock: 10,
      category: "test",
    });

  if (res.status !== 201 && res.status !== 200) {
    throw new Error(`Create product failed ${res.status}: ${JSON.stringify(res.body)}`);
  }
  return res.body as { id: string; name: string; price: string };
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

export async function cleanupTestData() {
  try {
    const testUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(like(users.email, `%${TEST_DOMAIN}`));

    for (const { id: uid } of testUsers) {
      await db.delete(orders).where(eq(orders.customerId, uid)).catch(() => {});
      const ownedStores = await db
        .select({ id: stores.id })
        .from(stores)
        .where(eq(stores.ownerId, uid));

      for (const { id: sid } of ownedStores) {
        await db.delete(products).where(eq(products.storeId, sid)).catch(() => {});
        await db.delete(stores).where(eq(stores.id, sid)).catch(() => {});
      }
    }

    if (testUsers.length > 0) {
      await db.delete(users).where(like(users.email, `%${TEST_DOMAIN}`));
    }
  } catch (e) {
    console.warn("Cleanup error (non-fatal):", e);
  }
}
