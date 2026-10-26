import cors from "cors";
import express from "express";
import { applyPatchInDir } from "./apply.js";
import { generatePatch } from "./patch.js";
import { createSandbox, destroySandbox, getToyRoot } from "./sandbox.js";
import { runSmokeTest } from "./smoke.js";

const port = Number(process.env.AGENT_HTTP_PORT) || 4001;
const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

/** @type {Map<string, { sandboxPath: string, diff: string }>} */
const sessions = new Map();

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "agent",
    mock: !process.env.OPENAI_API_KEY,
    codexSessionConfigured: Boolean(process.env.CODEX_SESSION_ID),
  });
});

app.post("/patch", async (req, res) => {
  const { jobId, kind, instruction } = req.body ?? {};
  if (!jobId || !kind || !instruction) {
    res.status(400).json({ error: "jobId, kind, instruction required" });
    return;
  }

  let sandboxPath;
  try {
    sandboxPath = await createSandbox(jobId);
    const patch = await generatePatch({ kind, instruction });
    await applyPatchInDir(sandboxPath, patch.diff);
    const smoke = await runSmokeTest(sandboxPath);

    sessions.set(jobId, { sandboxPath, diff: patch.diff });

    res.json({
      jobId,
      sandboxPath,
      diffSummary: patch.summary,
      changedLines: patch.changedLines,
      files: patch.files,
      smoke,
      statusColor: "green",
      mock: patch.mock,
    });
  } catch (err) {
    if (sandboxPath) await destroySandbox(sandboxPath);
    res.status(500).json({ error: err.message });
  }
});

app.post("/resolve", async (req, res) => {
  const { jobId, decision, sandboxPath: bodyPath } = req.body ?? {};
  const session = sessions.get(jobId);
  const sandboxPath = session?.sandboxPath || bodyPath;

  if (!jobId || !decision) {
    res.status(400).json({ error: "jobId and decision required" });
    return;
  }

  try {
    if (decision === "accept") {
      if (!session?.diff) {
        throw new Error("no pending patch for job");
      }
      await applyPatchInDir(getToyRoot(), session.diff);
      await destroySandbox(sandboxPath);
      sessions.delete(jobId);
      res.json({ ok: true, applied: true, decision: "accept" });
      return;
    }

    if (decision === "reject") {
      await destroySandbox(sandboxPath);
      sessions.delete(jobId);
      res.json({ ok: true, applied: false, decision: "reject" });
      return;
    }

    res.status(400).json({ error: "decision must be accept or reject" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`[agent] http://localhost:${port}`);
});
