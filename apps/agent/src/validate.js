const MAX_LINES = 50;
const MAX_FILES = 1;

export function parseDiffFiles(diffText) {
  const files = new Set();
  for (const line of diffText.split("\n")) {
    if (line.startsWith("diff --git ")) {
      const parts = line.split(" ");
      const b = parts[3]?.replace(/^b\//, "");
      if (b) files.add(b);
    }
  }
  return [...files];
}

export function countDiffLines(diffText) {
  let count = 0;
  for (const line of diffText.split("\n")) {
    if (line.startsWith("+") && !line.startsWith("+++")) count += 1;
    if (line.startsWith("-") && !line.startsWith("---")) count += 1;
  }
  return count;
}

export function validatePatch(diffText) {
  if (!diffText || !diffText.includes("diff --git")) {
    return { ok: false, error: "not a unified diff" };
  }
  const files = parseDiffFiles(diffText);
  if (files.length > MAX_FILES) {
    return { ok: false, error: `patch touches ${files.length} files (max ${MAX_FILES})` };
  }
  const lines = countDiffLines(diffText);
  if (lines > MAX_LINES) {
    return { ok: false, error: `patch too large (${lines} changed lines, max ${MAX_LINES})` };
  }
  return { ok: true, files, changedLines: lines };
}
