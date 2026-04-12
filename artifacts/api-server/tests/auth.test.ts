/**
 * auth.test.ts — Autenticación
 *
 * Cubre:
 *  - Login correcto → 200 + user
 *  - Login inválido → 401
 *  - /api/auth/user sin sesión → null (no autenticado)
 *  - /api/auth/user con sesión válida → user object
 *  - Registro con password corta → 400
 *  - Registro con email duplicado → 400
 *  - Registro sin aceptar términos → 400
 */

import { beforeAll, afterAll, describe, it, expect } from "vitest";
import supertest from "supertest";
import app from "../src/app";
import { initApp, getAgent, createAndLoginUser, cleanupTestData, TEST_PASSWORD, TEST_DOMAIN } from "./helpers";

beforeAll(async () => {
  await initApp();
});

afterAll(async () => {
  await cleanupTestData();
});

describe("Autenticación — login", () => {
  it("login con credenciales correctas devuelve 200 y el user", async () => {
    const user = await createAndLoginUser("auth_valid");

    const res = await getAgent()
      .post("/api/auth/login")
      .send({ email: user.email, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("email", user.email);
    expect(res.body).not.toHaveProperty("password");
  });

  it("login con password incorrecta devuelve 401", async () => {
    const user = await createAndLoginUser("auth_badpw");

    const res = await getAgent()
      .post("/api/auth/login")
      .send({ email: user.email, password: "WrongPassword999" });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("login con email inexistente devuelve 401", async () => {
    const res = await getAgent()
      .post("/api/auth/login")
      .send({ email: `noexiste_jamas_xyz${TEST_DOMAIN}`, password: "cualquier_cosa" });

    expect(res.status).toBe(401);
  });
});

describe("Autenticación — sesión", () => {
  it("/api/auth/user sin cookie de sesión devuelve null", async () => {
    const res = await getAgent().get("/api/auth/user");
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });

  it("/api/auth/user con sesión válida devuelve el user autenticado", async () => {
    const user = await createAndLoginUser("auth_session");

    const res = await user.agent.get("/api/auth/user");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("email", user.email);
    expect(res.body).not.toHaveProperty("password");
  });

  it("después de logout, /api/auth/user devuelve null", async () => {
    const user = await createAndLoginUser("auth_logout");

    await user.agent.post("/api/auth/logout");

    const res = await user.agent.get("/api/auth/user");
    expect(res.body).toBeNull();
  });
});

describe("Autenticación — registro", () => {
  it("registro con password menor a 6 caracteres devuelve 400", async () => {
    const res = await getAgent().post("/api/auth/register").send({
      email: `shortpw_${Date.now()}${TEST_DOMAIN}`,
      username: `shortpwu_${Date.now()}`.slice(0, 30),
      password: "123",
      termsAccepted: true,
    });

    expect(res.status).toBe(400);
    expect(res.body.error ?? JSON.stringify(res.body)).toBeDefined();
  });

  it("registro con email duplicado devuelve 400", async () => {
    const user = await createAndLoginUser("auth_dupemail");

    const res = await getAgent().post("/api/auth/register").send({
      email: user.email,
      username: `otrousr_${Date.now()}`.slice(0, 30),
      password: TEST_PASSWORD,
      termsAccepted: true,
    });

    expect(res.status).toBe(400);
  });

  it("registro sin aceptar términos devuelve 400", async () => {
    const res = await getAgent().post("/api/auth/register").send({
      email: `noterms_${Date.now()}${TEST_DOMAIN}`,
      username: `notermsuser_${Date.now()}`.slice(0, 30),
      password: TEST_PASSWORD,
      termsAccepted: false,
    });

    expect(res.status).toBe(400);
  });
});
