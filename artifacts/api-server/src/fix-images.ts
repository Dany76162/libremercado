import { db } from "@workspace/db";
import { products } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

function uImg(id: string, w = 800, h = 600) {
  return `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=80`;
}

async function fix() {
  console.log("Fixing images...");

  // prod-1d (Gaseosa)
  await db.update(products).set({
    image: uImg("1622483767028-3f66f32aef97", 500, 500),
    images: JSON.stringify([
      uImg("1622483767028-3f66f32aef97", 800, 800),
      uImg("1527960669566-c7f07c47d2da", 800, 800),
      uImg("1550583724-b2692b85b150", 800, 800)
    ]
  )}).where(eq(products.id, "prod-1d"));

  // prod-4c (Empanadas)
  await db.update(products).set({
    image: uImg("1604908176997-125f25cc6f3d", 500, 500),
    images: JSON.stringify([
      uImg("1604908176997-125f25cc6f3d", 800, 800),
      uImg("1565299624946-b28f40a0ae38", 800, 800),
      uImg("1513104890138-7c749659a591", 800, 800)
    ]
  )}).where(eq(products.id, "prod-4c"));

  // prod-11 (Alimento perro)
  await db.update(products).set({
    image: uImg("1583337130417-3346a1be7dee", 500, 500),
    images: JSON.stringify([
      uImg("1583337130417-3346a1be7dee", 800, 800),
      uImg("1587300003388-59208cc962cb", 800, 800),
      uImg("1548199973-03cce0bbc87b", 800, 800)
    ]
  )}).where(eq(products.id, "prod-11"));

  // prod-6b (Correa)
  await db.update(products).set({
    image: uImg("1601614457193-455bda62babe", 500, 500),
    images: JSON.stringify([
      uImg("1601614457193-455bda62babe", 800, 800),
      uImg("1548199973-03cce0bbc87b", 800, 800),
      uImg("1587300003388-59208cc962cb", 800, 800)
    ]
  )}).where(eq(products.id, "prod-6b"));

  console.log("Done fixing images.");
  process.exit(0);
}

fix();
