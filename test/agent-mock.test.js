import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const agentPort = 4011;
let agentProc;

before(async () => {
  agentProc = spawn("node", ["src/index.js"], {
    cwd: path.join(root, "apps/agent"),
    env: { ...process.env, AGENT_HTTP_PORT: String(agentPort), OPENAI_API_KEY: "" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await waitFor(`http://localhost:${agentPort}/health`);
});

after(() => {
  if (agentProc && !agentProc.killed) agentProc.kill("SIGTERM");
});

describe("agent mock patch", () => {
  it("returns green smoke for !ship", async () => {
    const res = await fetch(`http://localhost:${agentPort}/patch`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jobId: `test_${Date.now()}`,
        kind: "ship",
        instruction: "mock ship test",
      }),
    });
    const data = await res.json();
    assert.equal(res.ok, true, data.error);
    assert.equal(data.statusColor, "green");
    assert.equal(data.mock, true);
    assert.equal(data.smoke.ok, true);

    const rejectRes = await fetch(`http://localhost:${agentPort}/resolve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jobId: data.jobId,
        decision: "reject",
        sandboxPath: data.sandboxPath,
      }),
    });
    const reject = await rejectRes.json();
    assert.equal(rejectRes.ok, true);
    assert.equal(reject.applied, false);
  });
});

async function waitFor(url, attempts = 40) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`timeout waiting for ${url}`);
}
