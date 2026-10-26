import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildMockFixDiff, buildMockShipDiff } from "../apps/agent/src/mockDiff.js";
import { readFixtureDiff } from "../apps/agent/src/patch.js";
import { createSandbox } from "../apps/agent/src/sandbox.js";
import { applyPatchInDir } from "../apps/agent/src/apply.js";

describe("mock fixtures", () => {
  it("mock-ship.diff matches generated diff and applies in sandbox", async () => {
    const generated = await buildMockShipDiff();
    const fixture = await readFixtureDiff("ship");
    assert.equal(fixture, generated);

    const sandbox = await createSandbox(`fixture_ship_${Date.now()}`);
    await applyPatchInDir(sandbox, generated);
  });

  it("mock-fix.diff matches generated diff", async () => {
    const generated = await buildMockFixDiff();
    const fixture = await readFixtureDiff("fix");
    assert.equal(fixture, generated);
  });
});
