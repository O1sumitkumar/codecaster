import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseChatCommand } from "../apps/bot/src/twitch.js";

describe("parseChatCommand", () => {
  it("parses !ship", () => {
    const parsed = parseChatCommand("!ship make the button purple");
    assert.deepEqual(parsed, { kind: "ship", instruction: "make the button purple" });
  });

  it("parses !fix", () => {
    const parsed = parseChatCommand("!fix counter resets twice");
    assert.deepEqual(parsed, { kind: "fix", instruction: "counter resets twice" });
  });

  it("returns null for other messages", () => {
    assert.equal(parseChatCommand("hello"), null);
  });
});
