/**
 * orders.test.ts — Pedidos
 *
 * Cubre:
 *  - Crear pedido válido → 200/201
 *  - Obtener pedidos propios → solo los del usuario
 *  - Los pedidos devueltos tienen customerId del usuario logueado
 *  - Sin auth → 401
 */

import { beforeAll, afterAll, describe, it, expect } from "vitest";
import {
  initApp,
  getAgent,
  createAndLoginUser,
  createTestStore,
  createTestProduct,
  cleanupTestData,
} from "./helpers";

let customer: Awaited<ReturnType<typeof createAndLoginUser>>;
let merchant: Awaited<ReturnType<typeof createAndLoginUser>>;
let store: { id: string };
let product: { id: string };

beforeAll(async () => {
  await initApp();
  merchant = await createAndLoginUser("ord_merchant", "merchant");
  customer = await createAndLoginUser("ord_customer", "customer");
  store = await createTestStore(merchant, "orders");
  product = await createTestProduct(merchant, store.id);
});

afterAll(async () => {
  await cleanupTestData();
});

describe("Pedidos — creación", () => {
  it("crear pedido válido devuelve 200 o 201 con id", async () => {
    const res = await customer.agent
      .post("/api/orders")
      .send({
        customerId: customer.id,
        storeId: store.id,
        address: "Av. Siempre Viva 742, Springfield",
        total: "199.98",
        items: [{ productId: product.id, quantity: 2 }],
      });

    expect([200, 201]).toContain(res.status);
    expect(res.body).toHaveProperty("id");
  });

  it("sin auth → POST /api/orders devuelve 401", async () => {
    const res = await getAgent()
      .post("/api/orders")
      .send({
        customerId: "fake-id",
        storeId: store.id,
        address: "Algún lugar",
        total: "99.99",
        items: [{ productId: product.id, quantity: 1 }],
      });

    expect(res.status).toBe(401);
  });
});

describe("Pedidos — consulta", () => {
  it("GET /api/orders sin auth → 401", async () => {
    const res = await getAgent().get("/api/orders");
    expect(res.status).toBe(401);
  });

  it("GET /api/orders con auth → 200 + array de pedidos", async () => {
    await customer.agent.post("/api/orders").send({
      storeId: store.id,
      address: "Belgrano 100, CABA",
      items: [{ productId: product.id, quantity: 1 }],
    });

    const res = await customer.agent.get("/api/orders");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("todos los pedidos devueltos pertenecen al customer autenticado", async () => {
    const res = await customer.agent.get("/api/orders");
    expect(res.status).toBe(200);

    const orderList = res.body as { customerId: string }[];
    for (const order of orderList) {
      expect(order.customerId).toBe(customer.id);
    }
  });
});
