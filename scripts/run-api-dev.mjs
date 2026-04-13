import { spawn } from "node:child_process";
import { loadRootEnv, repoRoot } from "./load-root-env.mjs";

loadRootEnv();
process.env.PORT = process.env.API_PORT ?? "5000";
process.env.NODE_ENV = "development";

const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const child = spawn(
  pnpmCmd,
  ["--filter", "@workspace/api-server", "run", "dev"],
  {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  },
);
child.on("exit", (code) => process.exit(code ?? 1));
