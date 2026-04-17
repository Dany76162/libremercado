/**
 * Carga .env desde la raíz y ejecuta `pnpm --filter <pkg> run <script>`
 * (evita problemas de Windows con dotenv-cli + cross-env + pnpm encadenados).
 */
import { spawn } from "node:child_process";
import { loadRootEnv, repoRoot } from "./load-root-env.mjs";

const [, , filter, script] = process.argv;
if (!filter || !script) {
  console.error("Uso: node scripts/run-pnpm-filter.mjs <workspace-package> <script>");
  process.exit(1);
}

loadRootEnv();

const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const child = spawn(
  pnpmCmd,
  ["--filter", filter, "run", script],
  {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  },
);
child.on("exit", (code) => process.exit(code ?? 1));
