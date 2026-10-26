import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseChatCommand } from "./twitch.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApi({
  rateLimiter,
  jobQueue,
  broadcast,
  submitToAgent,
  resolveJob,
  getState,
}) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const overlayDir = path.join(__dirname, "../../overlay");
  app.use("/overlay", express.static(overlayDir));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "bot" });
  });

  app.get("/state", (_req, res) => {
    res.json(getState());
  });

  app.post("/mock/chat", async (req, res) => {
    const { message, user = "mock-viewer", userId = "mock-uid" } = req.body ?? {};
    const parsed = parseChatCommand(message);
    if (!parsed) {
      res.status(400).json({ error: "message must be !ship or !fix <instruction>" });
      return;
    }
    try {
      const job = await handleIncomingCommand({
        kind: parsed.kind,
        instruction: parsed.instruction,
        user,
        userId,
        rateLimiter,
        jobQueue,
        broadcast,
        submitToAgent,
      });
      res.json({ ok: true, job });
    } catch (err) {
      res.status(429).json({ error: err.message });
    }
  });

  app.post("/jobs/:id/accept", async (req, res) => {
    try {
      const result = await resolveJob(req.params.id, "accept");
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/jobs/:id/reject", async (req, res) => {
    try {
      const result = await resolveJob(req.params.id, "reject");
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  return app;
}

export async function handleIncomingCommand(ctx) {
  const {
    kind,
    instruction,
    user,
    userId,
    rateLimiter,
    jobQueue,
    broadcast,
    submitToAgent,
  } = ctx;

  if (!rateLimiter.allow(userId)) {
    throw new Error("rate limit exceeded for user");
  }

  const job = {
    id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    kind,
    instruction,
    user,
    userId,
    status: "queued",
    createdAt: new Date().toISOString(),
  };

  await jobQueue.enqueue(job);
  broadcast({ type: "job_queued", job });

  job.status = "processing";
  broadcast({ type: "job_processing", job });

  try {
    const agentResult = await submitToAgent(job);
    Object.assign(job, agentResult, { status: "pending_review" });
    broadcast({ type: "job_ready", job });
    return job;
  } catch (err) {
    job.status = "failed";
    job.error = err.message;
    broadcast({ type: "job_failed", job });
    jobQueue.complete(job.id);
    throw err;
  }
}
