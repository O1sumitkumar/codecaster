import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildMockFixDiff, buildMockShipDiff } from "./mockDiff.js";
import { validatePatch } from "./validate.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function generatePatch({ kind, instruction }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return loadMockPatch(kind);
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const system = `You output ONLY a unified git diff patch for the CodeCaster toy React app.
Rules: modify exactly ONE file under src/, maximum ~50 changed lines (+ and -).
No markdown fences. Commands: !ship adds/features, !fix repairs bugs.`;

  const user = `${kind} request: ${instruction}

Target repo is a Vite React app. Prefer editing src/App.jsx or src/index.css only.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || "OpenAI request failed");
  }

  let text = data.choices?.[0]?.message?.content?.trim() || "";
  text = stripFences(text);
  const validation = validatePatch(text);
  if (!validation.ok) {
    throw new Error(validation.error);
  }
  return { diff: text, summary: summarizeDiff(text), ...validation, mock: false };
}

export async function loadMockPatch(kind) {
  const diff =
    kind === "fix" ? await buildMockFixDiff() : await buildMockShipDiff();
  const validation = validatePatch(diff);
  if (!validation.ok) {
    throw new Error(validation.error);
  }
  return {
    diff,
    summary: summarizeDiff(diff),
    ...validation,
    mock: true,
  };
}

/** Used by tests to keep checked-in fixtures aligned with toy sources. */
export async function readFixtureDiff(kind) {
  const fixture =
    kind === "fix"
      ? path.join(__dirname, "../fixtures/mock-fix.diff")
      : path.join(__dirname, "../fixtures/mock-ship.diff");
  return readFile(fixture, "utf8");
}

function stripFences(text) {
  if (text.startsWith("```")) {
    return text.replace(/^```[\w]*\n?/, "").replace(/\n?```$/, "").trim();
  }
  return text;
}

export function summarizeDiff(diffText) {
  const files = [];
  for (const line of diffText.split("\n")) {
    if (line.startsWith("+++ b/")) {
      files.push(line.replace("+++ b/", "").trim());
    }
  }
  const adds = diffText.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++")).length;
  const dels = diffText.split("\n").filter((l) => l.startsWith("-") && !l.startsWith("---")).length;
  return {
    files,
    additions: adds,
    deletions: dels,
    preview: diffText.split("\n").slice(0, 12).join("\n"),
  };
}
