import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";

export async function applyPatchInDir(targetDir, diffText) {
  const patchFile = path.join(targetDir, ".codecaster.patch");
  await writeFile(patchFile, diffText, "utf8");
  const hasGit = existsSync(path.join(targetDir, ".git"));

  if (hasGit) {
    try {
      await gitApply(targetDir, patchFile);
      return;
    } catch (gitErr) {
      try {
        await gitReset(targetDir);
        await patchApply(targetDir, patchFile);
        return;
      } catch (patchErr) {
        throw new Error(mergeErrors(gitErr, patchErr));
      }
    }
  }

  try {
    await patchApply(targetDir, patchFile);
  } catch (patchErr) {
    try {
      await gitApply(targetDir, patchFile);
    } catch (gitErr) {
      throw new Error(mergeErrors(patchErr, gitErr));
    }
  }
}

function mergeErrors(primary, secondary) {
  const a = primary?.message?.trim() || String(primary);
  const b = secondary?.message?.trim() || String(secondary);
  return a.includes(b) ? a : `${a}\n${b}`;
}

function gitReset(cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn("git", ["checkout", "--", "."], {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`git checkout failed (${code})`));
    });
  });
}

function gitApply(cwd, patchFile) {
  return new Promise((resolve, reject) => {
    const proc = spawn("git", ["apply", "--whitespace=nowarn", patchFile], {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let err = "";
    proc.stderr.on("data", (d) => {
      err += d.toString();
    });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(err.trim() || `git apply failed (${code})`));
    });
  });
}

function patchApply(cwd, patchFile) {
  return new Promise((resolve, reject) => {
    const proc = spawn("patch", ["-p1", "--forward", "-i", patchFile], {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let err = "";
    proc.stderr.on("data", (d) => {
      err += d.toString();
    });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(err.trim() || `patch failed (${code})`));
    });
  });
}
