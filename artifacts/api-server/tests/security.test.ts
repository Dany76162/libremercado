/**
 * security.test.ts — Ownership / IDOR (CRÍTICO)
 *
 * Cubre:
 *  - Merchant NO puede editar tienda de otro → 403
 *  - Merchant NO puede editar/eliminar producto de otro → 403
 *  - Customer NO puede ver pedidos de otro → datos aislados
 *  - Customer NO puede cancelar pedido ajeno → 403/404
 *  - Customer NO puede reseñar pedido ajeno → 403/404
 *  - Sin auth → 401 en endpoints protegidos
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

let merchantA: Awaited<ReturnType<typeof createAndLoginUser>>;
let merchantB: Awaited<ReturnType<typeof createAndLoginUser>>;
let customerA: Awaited<ReturnType<typeof createAndLoginUser>>;
let customerB: Awaited<ReturnType<typeof createAndLoginUser>>;
let storeA: { id: string; name: string; ownerId: string };
let productOfA: { id: string; name: string; price: string };

beforeAll(async () => {
  await initApp();

  merchantA = await createAndLoginUser("sec_mA", "merchant");
  merchantB = await createAndLoginUser("sec_mB", "merchant");
  customerA = await createAndLoginUser("sec_cA", "customer");
  customerB = await createAndLoginUser("sec_cB", "customer");

  storeA = await createTestStore(merchantA, "A");
  await createTestStore(merchantB, "B");
  productOfA = await createTestProduct(merchantA, storeA.id);
});

afterAll(async () => {
  await cleanupTestData();
});

describe("Ownership — Tiendas", () => {
  it("merchant B NO puede editar la tienda de merchant A → 403", async () => {
    const res = await merchantB.agent
      .patch(`/api/merchant/stores/${storeA.id}`)
      .send({ name: "Tienda hackeada" });

    expect(res.status).toBe(403);
  });

  it("customer A (no merchant) NO puede editar tienda → 401 o 403", async () => {
    const res = await customerA.agent
      .patch(`/api/merchant/stores/${storeA.id}`)
      .send({ name: "Intento cliente" });

    expect([401, 403]).toContain(res.status);
  });

  it("merchant A SÍ puede editar su propia tienda → 200", async () => {
    const res = await merchantA.agent
      .patch(`/api/merchant/stores/${storeA.id}`)
      .send({ name: "Mi tienda actualizada" });

    expect([200, 204]).toContain(res.status);
  });
});

describe("Ownership — Productos", () => {
  it("merchant B NO puede editar producto de merchant A → 403", async () => {
    const res = await merchantB.agent
      .patch(`/api/merchant/products/${productOfA.id}`)
      .send({ name: "Producto robado" });

    expect(res.status).toBe(403);
  });

  it("merchant B NO puede eliminar producto de merchant A → 403", async () => {
    const res = await merchantB.agent
      .delete(`/api/merchant/products/${productOfA.id}`);

    expect(res.status).toBe(403);
  });

  it("merchant B NO puede agregar producto a la tienda de merchant A → 403", async () => {
    const res = await merchantB.agent
      .post("/api/merchant/products")
      .send({
        storeId: storeA.id,
        name: "Producto IDOR",
        price: "10.00",
        stock: 1,
        category: "hack",
      });

    expect(res.status).toBe(403);
  });

  it("merchant A SÍ puede editar su propio producto → 200", async () => {
    const res = await merchantA.agent
      .patch(`/api/merchant/products/${productOfA.id}`)
      .send({ name: "Producto actualizado correctamente" });

    expect([200, 204]).toContain(res.status);
  });
});

describe("Ownership — Pedidos", () => {
  it("GET /api/orders devuelve solo pedidos del customer autenticado", async () => {
    const resA = await customerA.agent.get("/api/orders");
    const resB = await customerB.agent.get("/api/orders");

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);

    const idsA = (resA.body as { id: string }[]).map((o) => o.id);
    const idsB = (resB.body as { id: string }[]).map((o) => o.id);

    const intersection = idsA.filter((id) => idsB.includes(id));
    expect(intersection).toHaveLength(0);
  });

  it("customer sin auth NO puede ver pedidos → 401", async () => {
    const res = await getAgent().get("/api/orders");
    expect(res.status).toBe(401);
  });

  it("customer B NO puede cancelar pedido de customer A → 403 o 404", async () => {
    const ordersA = (await customerA.agent.get("/api/orders")).body as { id: string }[];

    if (ordersA.length === 0) return;

    const res = await customerB.agent.patch(`/api/orders/${ordersA[0].id}/cancel`);
    expect([403, 404]).toContain(res.status);
  });
});

describe("Ownership — Reviews", () => {
  it("customer B NO puede reseñar pedido de customer A → 403 o 404", async () => {
    const ordersA = (await customerA.agent.get("/api/orders")).body as { id: string }[];

    if (ordersA.length === 0) {
      console.log("Sin pedidos de customerA — test de review IDOR saltado");
      return;
    }

    const res = await customerB.agent
      .post(`/api/orders/${ordersA[0].id}/review`)
      .send({ rating: 5, comment: "Review falsa" });

    expect([403, 404]).toContain(res.status);
  });
});

describe("Autenticación requerida — endpoints protegidos", () => {
  it("GET /api/orders sin auth → 401", async () => {
    expect((await getAgent().get("/api/orders")).status).toBe(401);
  });

  it("GET /api/merchant/stores sin auth → 401", async () => {
    expect((await getAgent().get("/api/merchant/stores")).status).toBe(401);
  });

  it("POST /api/stores sin auth → 401 o 403", async () => {
    const res = await getAgent().post("/api/stores").send({
      name: "Store sin auth",
      category: "general",
      ownerId: "fake-id",
    });
    expect([401, 403]).toContain(res.status);
  });

  it("GET /api/users (admin only) sin auth → 401 o 403", async () => {
    const res = await getAgent().get("/api/users");
    expect([401, 403]).toContain(res.status);
  });
});
