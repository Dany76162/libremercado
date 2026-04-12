import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    conditions: ["workspace", "import", "default"],
    alias: {
      "@workspace/db": path.resolve(__dirname, "../../lib/db/src/index.ts"),
      "@workspace/api-zod": path.resolve(__dirname, "../../lib/api-zod/src/index.ts"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: "forks",
    forks: {
      singleFork: true,
    },
    // Ensure test files run sequentially (not in parallel) to avoid DB/session conflicts
    fileParallelism: false,
    // Each file gets its own module context (no cross-file state leakage)
    isolate: true,
    include: ["tests/**/*.test.ts"],
    reporter: ["verbose"],
    env: {
      NODE_ENV: "test",
      SKIP_DEMO_UPDATE: "true",
    },
  },
});
