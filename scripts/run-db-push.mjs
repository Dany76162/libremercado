import { spawn } from "node:child_process";
import { loadRootEnv, repoRoot } from "./load-root-env.mjs";

loadRootEnv();

const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const child = spawn(
  pnpmCmd,
  ["--filter", "@workspace/db", "run", "push"],
  {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  },
);
child.on("exit", (code) => process.exit(code ?? 1));
