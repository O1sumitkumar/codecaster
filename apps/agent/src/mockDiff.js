import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { getToyRoot } from "./sandbox.js";

const execFileAsync = promisify(execFile);

const SHIP_SEARCH = '<div className="status-pill" data-testid="api-health">';
const SHIP_REPLACE = '<div className="status-pill shipped" data-testid="api-health">';

export async function buildMockShipDiff(toyRoot = getToyRoot()) {
  const relPath = "src/App.jsx";
  const filePath = path.join(toyRoot, relPath);
  const content = await readFile(filePath, "utf8");

  if (content.includes(SHIP_REPLACE)) {
    throw new Error(
      "mock-ship: App.jsx already contains shipped markup; reset apps/toy/src/App.jsx to repo HEAD",
    );
  }
  if (!content.includes(SHIP_SEARCH)) {
    throw new Error("mock-ship: App.jsx missing expected status-pill markup");
  }

  const next = content.replace(SHIP_SEARCH, SHIP_REPLACE);
  return normalizeDiffPaths(await gitNoIndexDiff(relPath, content, next), relPath);
}

export async function buildMockFixDiff(toyRoot = getToyRoot()) {
  const relPath = "src/index.css";
  const filePath = path.join(toyRoot, relPath);
  const content = await readFile(filePath, "utf8");
  const block = `.status-pill.shipped {
  background: #dbeafe;
  color: #1d4ed8;
}

`;

  if (content.includes(".status-pill.shipped")) {
    throw new Error("mock-fix: index.css already contains shipped styles");
  }

  const anchor = ".status-pill {";
  const idx = content.indexOf(anchor);
  if (idx === -1) {
    throw new Error("mock-fix: index.css missing .status-pill block");
  }

  const next = `${content.slice(0, idx)}${block}${content.slice(idx)}`;
  return normalizeDiffPaths(await gitNoIndexDiff(relPath, content, next), relPath);
}

async function gitNoIndexDiff(relPath, before, after) {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "codecaster-diff-"));
  const oldPath = path.join(tmp, "old", relPath);
  const newPath = path.join(tmp, "new", relPath);
  try {
    await mkdir(path.dirname(oldPath), { recursive: true });
    await mkdir(path.dirname(newPath), { recursive: true });
    await writeFile(oldPath, before);
    await writeFile(newPath, after);
    let stdout = "";
    try {
      const result = await execFileAsync("git", [
        "diff",
        "--no-color",
        "--no-index",
        oldPath,
        newPath,
      ]);
      stdout = result.stdout;
    } catch (err) {
      stdout = err.stdout || "";
      if (!stdout.includes("diff --git")) {
        throw err;
      }
    }
    return stdout;
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

function normalizeDiffPaths(raw, relPath) {
  const lines = raw.split("\n");
  const out = [];
  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      out.push(`diff --git a/${relPath} b/${relPath}`);
      continue;
    }
    if (line.startsWith("--- ")) {
      out.push(`--- a/${relPath}`);
      continue;
    }
    if (line.startsWith("+++ ")) {
      out.push(`+++ b/${relPath}`);
      continue;
    }
    out.push(line);
  }
  return `${out.join("\n").trim()}\n`;
}
