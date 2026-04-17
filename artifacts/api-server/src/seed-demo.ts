import { pool } from "@workspace/db";
import { seedDemoContent } from "./database-storage";

async function main() {
  await seedDemoContent();
}

main()
  .catch((error) => {
    console.error("[seed-demo] Failed to seed demo content", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });
