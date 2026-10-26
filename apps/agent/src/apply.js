import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";

export async function applyPatchInDir(targetDir, diffText) {
  const patchFile = path.join(targetDir, ".codecaster.patch");
  await writeFile(patchFile, diffText, "utf8");
  try {
    await patchApply(targetDir, patchFile);
  } catch {
    await gitApply(targetDir, patchFile);
  }
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
      else reject(new Error(err || `git apply failed (${code})`));
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
      else reject(new Error(err || `patch failed (${code})`));
    });
  });
}
