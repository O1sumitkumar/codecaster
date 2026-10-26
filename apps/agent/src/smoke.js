import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

export async function runSmokeTest(sandboxPath) {
  const apiPort = 3100 + Math.floor(Math.random() * 500);
  const nodePath = [
    path.join(workspaceRoot, "node_modules"),
    path.join(workspaceRoot, "apps/toy/node_modules"),
  ].join(path.delimiter);

  const proc = spawn("node", ["server/index.js"], {
    cwd: sandboxPath,
    env: {
      ...process.env,
      NODE_PATH: nodePath,
      TOY_API_PORT: String(apiPort),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const cleanup = () => {
    if (!proc.killed) proc.kill("SIGTERM");
  };

  try {
    await waitForListen(proc, 8000);
    const res = await fetch(`http://localhost:${apiPort}/api/smoke`);
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error("smoke endpoint failed");
    }
    return { ok: true, message: data.message };
  } finally {
    cleanup();
  }
}

function waitForListen(proc, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("smoke test timeout")), timeoutMs);
    let stderr = "";
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    proc.stdout.on("data", (d) => {
      if (d.toString().includes("listening")) {
        clearTimeout(timer);
        resolve();
      }
    });
    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    proc.on("exit", (code) => {
      if (code !== null && code !== 0) {
        clearTimeout(timer);
        reject(new Error(`smoke server exited: ${code}\n${stderr}`));
      }
    });
  });
}
