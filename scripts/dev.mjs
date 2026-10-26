import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const children = [
  { name: "toy", cmd: "npm", args: ["run", "dev", "-w", "@codecaster/toy"] },
  { name: "bot", cmd: "npm", args: ["run", "dev", "-w", "@codecaster/bot"] },
  { name: "agent", cmd: "npm", args: ["run", "dev", "-w", "@codecaster/agent"] },
];

for (const child of children) {
  const proc = spawn(child.cmd, child.args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    shell: true,
  });
  proc.on("exit", (code) => {
    if (code && code !== 0) process.exit(code);
  });
}

console.log("[dev] toy web + api, bot, agent");
console.log("[dev] overlay: http://localhost:4000/overlay/");
