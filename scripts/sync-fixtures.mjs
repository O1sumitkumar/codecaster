import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildMockFixDiff, buildMockShipDiff } from "../apps/agent/src/mockDiff.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const ship = await buildMockShipDiff();
const fix = await buildMockFixDiff();

await writeFile(path.join(root, "apps/agent/fixtures/mock-ship.diff"), ship);
await writeFile(path.join(root, "apps/agent/fixtures/mock-fix.diff"), fix);

console.log("Synced mock-ship.diff and mock-fix.diff from apps/toy sources.");
