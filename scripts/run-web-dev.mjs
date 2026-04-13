import { spawn } from "node:child_process";
import { loadRootEnv, repoRoot } from "./load-root-env.mjs";

loadRootEnv();
process.env.PORT = process.env.WEB_PORT ?? "3000";
process.env.BASE_PATH = process.env.BASE_PATH ?? "/";
const apiPort = process.env.API_PORT ?? "5000";
process.env.DEV_API_PROXY = process.env.DEV_API_PROXY ?? `http://127.0.0.1:${apiPort}`;

const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const child = spawn(
  pnpmCmd,
  ["--filter", "@workspace/libremercado", "run", "dev"],
  {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  },
);
child.on("exit", (code) => process.exit(code ?? 1));
