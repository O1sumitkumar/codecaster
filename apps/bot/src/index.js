import http from "node:http";
import { createApi, handleIncomingCommand } from "./api.js";
import { createJobQueue } from "./queue.js";
import { createRateLimiter } from "./rateLimit.js";
import { createTwitchClient } from "./twitch.js";
import { createBroadcaster } from "./ws.js";

const botPort = Number(process.env.BOT_HTTP_PORT) || 4000;
const agentBase =
  process.env.AGENT_URL || `http://localhost:${process.env.AGENT_HTTP_PORT || 4001}`;

const rateLimiter = createRateLimiter();
const jobQueue = createJobQueue();

/** @type {Record<string, unknown>} */
let latestJob = null;
const pendingReview = new Map();

function getState() {
  return {
    activeJob: jobQueue.getActive(),
    latestJob,
    queueBusy: jobQueue.isBusy(),
    twitchMock: !process.env.TWITCH_USERNAME,
  };
}

async function submitToAgent(job) {
  const res = await fetch(`${agentBase}/patch`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jobId: job.id,
      kind: job.kind,
      instruction: job.instruction,
      user: job.user,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "agent patch failed");
  }
  pendingReview.set(job.id, data);
  latestJob = { ...job, ...data };
  scheduleReviewTimeout(job.id);
  return data;
}

const REVIEW_TIMEOUT_MS = Number(process.env.REVIEW_TIMEOUT_MS) || 120_000;
const reviewTimers = new Map();

function scheduleReviewTimeout(jobId) {
  if (reviewTimers.has(jobId)) clearTimeout(reviewTimers.get(jobId));
  const timer = setTimeout(() => {
    resolveJob(jobId, "reject").catch(() => {});
    broadcaster.broadcast({
      type: "job_rejected",
      job: { id: jobId, status: "timeout" },
    });
  }, REVIEW_TIMEOUT_MS);
  reviewTimers.set(jobId, timer);
}

async function resolveJob(jobId, decision) {
  const pending = pendingReview.get(jobId);
  if (!pending) {
    throw new Error("job not awaiting review");
  }
  const res = await fetch(`${agentBase}/resolve`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jobId, decision, sandboxPath: pending.sandboxPath }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "resolve failed");
  }
  pendingReview.delete(jobId);
  if (reviewTimers.has(jobId)) {
    clearTimeout(reviewTimers.get(jobId));
    reviewTimers.delete(jobId);
  }
  const active = jobQueue.getActive();
  if (active?.id === jobId) {
    active.status = decision === "accept" ? "accepted" : "rejected";
    latestJob = { ...active, ...data };
    jobQueue.complete(jobId);
    broadcaster.broadcast({
      type: decision === "accept" ? "job_accepted" : "job_rejected",
      job: latestJob,
    });
  }
  return data;
}

const server = http.createServer();
const broadcaster = createBroadcaster(server);

const app = createApi({
  rateLimiter,
  jobQueue,
  broadcast: (payload) => broadcaster.broadcast(payload),
  submitToAgent,
  resolveJob,
  getState,
});

server.on("request", app);

server.listen(botPort, () => {
  console.log(`[bot] http://localhost:${botPort} (overlay: /overlay/)`);
});

const twitch = createTwitchClient({
  onCommand: async (cmd) => {
    try {
      await handleIncomingCommand({
        ...cmd,
        rateLimiter,
        jobQueue,
        broadcast: (payload) => broadcaster.broadcast(payload),
        submitToAgent,
      });
    } catch (err) {
      console.warn("[bot] command failed:", err.message);
    }
  },
});

twitch.connect();
