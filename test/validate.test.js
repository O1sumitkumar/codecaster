import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { countDiffLines, parseDiffFiles, validatePatch } from "../apps/agent/src/validate.js";

const SAMPLE = `diff --git a/src/App.jsx b/src/App.jsx
--- a/src/App.jsx
+++ b/src/App.jsx
@@ -1,3 +1,3 @@
-x
+y
`;

describe("validatePatch", () => {
  it("accepts a small one-file diff", () => {
    const result = validatePatch(SAMPLE);
    assert.equal(result.ok, true);
    assert.deepEqual(result.files, ["src/App.jsx"]);
  });

  it("rejects multi-file diffs", () => {
    const multi = `${SAMPLE}
diff --git a/src/other.jsx b/src/other.jsx
--- a/src/other.jsx
+++ b/src/other.jsx
@@ -1 +1 @@
-a
+b
`;
    const result = validatePatch(multi);
    assert.equal(result.ok, false);
  });

  it("counts changed lines", () => {
    assert.equal(countDiffLines(SAMPLE), 2);
    assert.deepEqual(parseDiffFiles(SAMPLE), ["src/App.jsx"]);
  });
});
