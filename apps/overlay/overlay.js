const params = new URLSearchParams(window.location.search);
const botBase = params.get("bot") || "http://localhost:4000";
const wsUrl =
  params.get("ws") ||
  botBase.replace(/^http/, "ws").replace(/\/$/, "") + "/ws";

const els = {
  panel: document.getElementById("panel"),
  dot: document.getElementById("status-dot"),
  command: document.getElementById("command"),
  meta: document.getElementById("meta"),
  diff: document.getElementById("diff"),
  actions: document.getElementById("actions"),
  accept: document.getElementById("accept"),
  reject: document.getElementById("reject"),
  footer: document.getElementById("footer"),
};

let currentJobId = null;

function setStatus(color, text) {
  els.panel.classList.remove("green", "red", "idle");
  if (color === "green") els.panel.classList.add("green");
  if (color === "red") els.panel.classList.add("red");
  els.dot.className = `dot ${color === "green" ? "green" : color === "red" ? "red" : "gray"}`;
  if (text) els.footer.textContent = text;
}

function renderJob(job) {
  currentJobId = job.id;
  els.command.textContent = `!${job.kind} ${job.instruction}`;
  els.meta.textContent = `${job.user} · ${job.status}`;
  const preview = job.diffSummary?.preview || "";
  els.diff.textContent = preview;
  const showActions = job.status === "pending_review";
  els.actions.classList.toggle("hidden", !showActions);
  if (job.statusColor === "green" || job.smoke?.ok) {
    setStatus("green", "Smoke test passed — awaiting streamer");
  } else if (job.status === "failed") {
    setStatus("red", job.error || "Failed");
  }
}

async function postDecision(decision) {
  if (!currentJobId) return;
  const path = `/jobs/${currentJobId}/${decision}`;
  const res = await fetch(`${botBase}${path}`, { method: "POST" });
  const data = await res.json();
  if (!res.ok) {
    setStatus("red", data.error || "Request failed");
    return;
  }
  setStatus(decision === "accept" ? "green" : "red", `Patch ${decision}ed`);
  els.actions.classList.add("hidden");
}

els.accept.addEventListener("click", () => postDecision("accept"));
els.reject.addEventListener("click", () => postDecision("reject"));

const socket = new WebSocket(wsUrl);
socket.addEventListener("message", (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.job) renderJob(msg.job);
  if (msg.type === "job_accepted") {
    setStatus("green", "Shipped to toy app");
    els.actions.classList.add("hidden");
  }
  if (msg.type === "job_rejected") {
    setStatus("red", "Rejected — sandbox deleted");
    els.actions.classList.add("hidden");
  }
});

fetch(`${botBase}/state`)
  .then((r) => r.json())
  .then((s) => {
    if (s.latestJob) renderJob(s.latestJob);
  })
  .catch(() => {});
