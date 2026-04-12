/**
 * products.test.ts — Productos
 *
 * Cubre:
 *  - Listar productos públicamente → 200
 *  - Ver producto individual inexistente → 404
 *  - Merchant crea producto → 200/201
 *  - Merchant actualiza su producto → 200/204
 *  - Customer no puede crear productos → 403
 *  - Sin auth no puede crear productos → 401/403
 */

import { beforeAll, afterAll, describe, it, expect } from "vitest";
import {
  initApp,
  getAgent,
  createAndLoginUser,
  createTestStore,
  cleanupTestData,
} from "./helpers";

let merchant: Awaited<ReturnType<typeof createAndLoginUser>>;
let customer: Awaited<ReturnType<typeof createAndLoginUser>>;
let store: { id: string };
let createdProductId: string;

beforeAll(async () => {
  await initApp();
  merchant = await createAndLoginUser("prod_merchant", "merchant");
  customer = await createAndLoginUser("prod_customer", "customer");
  store = await createTestStore(merchant, "products");
});

afterAll(async () => {
  await cleanupTestData();
});

describe("Productos — acceso público", () => {
  it("GET /api/products devuelve lista pública", async () => {
    const res = await getAgent().get("/api/products");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET /api/products/discounted devuelve array", async () => {
    const res = await getAgent().get("/api/products/discounted");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET /api/products/:id con ID inexistente devuelve 404", async () => {
    const res = await getAgent().get("/api/products/id-que-no-existe-jamas-000");
    expect(res.status).toBe(404);
  });
});

describe("Productos — merchant CRUD", () => {
  it("merchant puede crear producto en su tienda → 201", async () => {
    const res = await merchant.agent
      .post("/api/merchant/products")
      .send({
        storeId: store.id,
        name: "Yerba Mate Premium",
        description: "La mejor yerba",
        price: "450.00",
        stock: 50,
        category: "alimentos",
      });

    expect([200, 201]).toContain(res.status);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("name", "Yerba Mate Premium");
    createdProductId = res.body.id;
  });

  it("merchant puede actualizar su producto → 200", async () => {
    if (!createdProductId) return;

    const res = await merchant.agent
      .patch(`/api/merchant/products/${createdProductId}`)
      .send({ price: "499.99" });

    expect([200, 204]).toContain(res.status);
  });

  it("merchant puede listar sus productos por tienda → 200", async () => {
    const res = await merchant.agent.get(`/api/stores/${store.id}/products`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("Productos — restricciones de rol", () => {
  it("customer NO puede usar endpoint merchant de productos → 401 o 403", async () => {
    const res = await customer.agent
      .post("/api/merchant/products")
      .send({
        storeId: store.id,
        name: "Producto no autorizado",
        price: "100.00",
        stock: 1,
        category: "test",
      });

    expect([401, 403]).toContain(res.status);
  });

  it("sin auth NO puede crear productos → 401 o 403", async () => {
    const res = await getAgent()
      .post("/api/merchant/products")
      .send({
        storeId: store.id,
        name: "Sin auth",
        price: "100.00",
        stock: 1,
        category: "test",
      });

    expect([401, 403]).toContain(res.status);
  });
});
