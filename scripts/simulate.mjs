const botBase = process.env.BOT_URL || "http://localhost:4000";

async function waitFor(url, attempts = 40) {
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

async function main() {
  await waitFor(`${botBase}/health`);
  await waitFor(
    process.env.AGENT_URL ||
      `http://localhost:${process.env.AGENT_HTTP_PORT || 4001}/health`,
  );

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

  console.log("simulate: ok — mock !ship path is green and patch accepted");
  console.log(JSON.stringify({ jobId: job.id, files: job.files, smoke: job.smoke }, null, 2));
}

main().catch((err) => {
  console.error("simulate failed:", err.message);
  process.exit(1);
});
