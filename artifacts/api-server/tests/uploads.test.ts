/**
 * uploads.test.ts — Uploads de archivos
 *
 * Cubre:
 *  - Subir imagen JPEG válida (magic bytes correctos) → 200 + URL
 *  - Subir archivo con magic bytes incorrectos (ZIP disfrazado de JPG) → 400
 *  - Subir sin auth → 401
 *  - La URL devuelta comienza con /api/files/ (GCS) o /uploads/ (legacy)
 */

import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { initApp, getAgent, createAndLoginUser, cleanupTestData } from "./helpers";

// JPEG mínimo válido con magic bytes FF D8 FF (22 bytes)
const VALID_JPEG = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
]);

// Archivo ZIP disfrazado de JPEG (PK magic bytes)
const FAKE_JPEG = Buffer.from([
  0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00,
  0x21, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

let user: Awaited<ReturnType<typeof createAndLoginUser>>;

beforeAll(async () => {
  await initApp();
  user = await createAndLoginUser("upload_user", "customer");
});

afterAll(async () => {
  await cleanupTestData();
});

describe("Uploads — imagen de producto", () => {
  it("subir JPEG válido → 200 + URL de GCS o /uploads/", async () => {
    const res = await user.agent
      .post("/api/upload/product")
      .attach("image", VALID_JPEG, { filename: "test.jpg", contentType: "image/jpeg" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("url");

    const url = res.body.url as string;
    expect(url).toMatch(/^\/(api\/files|uploads)\/.+/);
  });

  it("subir archivo con magic bytes de ZIP (disfrazado de JPG) → 400", async () => {
    const res = await user.agent
      .post("/api/upload/product")
      .attach("image", FAKE_JPEG, { filename: "malicious.jpg", contentType: "image/jpeg" });

    expect(res.status).toBe(400);
  });

  it("subir sin sesión autenticada → 401", async () => {
    const res = await getAgent()
      .post("/api/upload/product")
      .attach("image", VALID_JPEG, { filename: "test.jpg", contentType: "image/jpeg" });

    expect(res.status).toBe(401);
  });
});

describe("Uploads — avatar de usuario", () => {
  it("subir avatar JPEG válido → 200 + URL", async () => {
    const res = await user.agent
      .post("/api/upload/avatar")
      .attach("image", VALID_JPEG, { filename: "avatar.jpg", contentType: "image/jpeg" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("url");
  });

  it("subir archivo falso como avatar → 400", async () => {
    const res = await user.agent
      .post("/api/upload/avatar")
      .attach("image", FAKE_JPEG, { filename: "fake.jpg", contentType: "image/jpeg" });

    expect(res.status).toBe(400);
  });

  it("subir avatar sin auth → 401", async () => {
    const res = await getAgent()
      .post("/api/upload/avatar")
      .attach("image", VALID_JPEG, { filename: "avatar.jpg", contentType: "image/jpeg" });

    expect(res.status).toBe(401);
  });
});
