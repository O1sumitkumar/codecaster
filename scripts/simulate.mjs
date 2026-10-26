import { spawn } from "node:child_process";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const botPort = Number(process.env.BOT_HTTP_PORT) || 4000;
const agentPort = Number(process.env.AGENT_HTTP_PORT) || 4001;
const botBase = process.env.BOT_URL || `http://localhost:${botPort}`;
const agentBase = process.env.AGENT_URL || `http://localhost:${agentPort}`;

/** @type {import('node:child_process').ChildProcess[]} */
const children = [];

async function waitFor(url, attempts = 60) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`service not ready: ${url}`);
}

function startService(name, cwd, env) {
  const proc = spawn("node", ["src/index.js"], {
    cwd,
    env: { ...process.env, ...env },
    stdio: "inherit",
  });
  children.push(proc);
  proc.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`[simulate] ${name} exited with code ${code}`);
    }
  });
  return proc;
}

async function ensureStack() {
  try {
    await waitFor(`${botBase}/health`, 2);
    await waitFor(`${agentBase}/health`, 2);
    return false;
  } catch {
    startService("agent", path.join(root, "apps/agent"), {
      AGENT_HTTP_PORT: String(agentPort),
      OPENAI_API_KEY: "",
    });
    startService("bot", path.join(root, "apps/bot"), {
      BOT_HTTP_PORT: String(botPort),
      AGENT_HTTP_PORT: String(agentPort),
      AGENT_URL: agentBase,
    });
    await waitFor(`${agentBase}/health`);
    await waitFor(`${botBase}/health`);
    return true;
  }
}

function restoreToyFiles() {
  try {
    execSync("git checkout -- apps/toy/src/App.jsx apps/toy/src/index.css", {
      cwd: root,
      stdio: "ignore",
    });
  } catch {
    // not a git checkout or nothing to restore
  }
}

function shutdown() {
  for (const proc of children) {
    if (!proc.killed) proc.kill("SIGTERM");
  }
}

async function main() {
  const started = await ensureStack();

  const chatRes = await fetch(`${botBase}/mock/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      message: "!ship add shipped badge styling on the status pill",
      user: "simulate",
      userId: "simulate-1",
    }),
  });
  const chat = await chatRes.json();
  if (!chatRes.ok) {
    throw new Error(chat.error || "mock chat failed");
  }

  const job = chat.job;
  if (job.status !== "pending_review" || job.statusColor !== "green") {
    throw new Error(`expected green pending_review, got ${job.status}`);
  }

  const acceptRes = await fetch(`${botBase}/jobs/${job.id}/accept`, {
    method: "POST",
  });
  const accept = await acceptRes.json();
  if (!acceptRes.ok || !accept.applied) {
    throw new Error(accept.error || "accept failed");
  }

  restoreToyFiles();

  console.log("simulate: ok — mock !ship path is green and patch accepted");
  console.log(JSON.stringify({ jobId: job.id, files: job.files, smoke: job.smoke }, null, 2));

  if (started) {
    shutdown();
    await new Promise((r) => setTimeout(r, 300));
  }
}

main().catch((err) => {
  shutdown();
  console.error("simulate failed:", err.message);
  process.exit(1);
});
