import { cp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const toyRoot = path.resolve(__dirname, "../../toy");
const workspaceRoot = path.resolve(__dirname, "../../..");
const workspaceModules = path.join(workspaceRoot, "node_modules");

export function getSandboxRoot() {
  const env = process.env.CODECASTER_SANDBOX_ROOT;
  if (env) return path.resolve(env);
  return path.join(os.tmpdir(), "codecaster-sandboxes");
}

async function gitInit(dir) {
  await run("git", ["init", "-q"], dir);
  await run("git", ["config", "user.email", "codecaster@local"], dir);
  await run("git", ["config", "user.name", "CodeCaster"], dir);
  await run("git", ["add", "-A"], dir);
  await run("git", ["commit", "-q", "-m", "sandbox"], dir);
}

function run(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd, stdio: "ignore" });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} failed (${code})`));
    });
  });
}

export async function createSandbox(jobId) {
  const root = getSandboxRoot();
  await mkdir(root, { recursive: true });
  const sandboxPath = path.join(root, jobId);
  await rm(sandboxPath, { recursive: true, force: true });
  await cp(toyRoot, sandboxPath, {
    recursive: true,
    filter: (src) => !src.includes("node_modules") && !src.includes("dist"),
  });
  await symlink(workspaceModules, path.join(sandboxPath, "node_modules"), "dir").catch(
    () => {},
  );
  await writeFile(path.join(sandboxPath, ".gitignore"), "node_modules/\n", "utf8");
  await gitInit(sandboxPath);
  return sandboxPath;
}

export async function destroySandbox(sandboxPath) {
  if (!sandboxPath) return;
  await rm(sandboxPath, { recursive: true, force: true });
}

export function getToyRoot() {
  return toyRoot;
}
