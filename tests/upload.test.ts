import { describe, it, expect } from "vitest";
import { extractZip } from "@core/upload/zip-extractor";
import { validateProject } from "@core/upload/validate-project";
import { TEAM_A_HTML, TEAM_A_CSS, makeZip, maliciousZip } from "./fixtures";

describe("zip extraction and validation", () => {
  it("extracts a valid project and detects the entry point", async () => {
    const zip = await makeZip({ "index.html": TEAM_A_HTML, "styles/main.css": TEAM_A_CSS });
    const { workspace, issues } = await extractZip(zip);
    expect(issues.filter((i) => i.level === "error")).toHaveLength(0);
    expect(workspace.entryPoint()).toBe("index.html");
    expect(workspace.byKind("css")).toHaveLength(1);

    const result = validateProject(workspace, issues);
    expect(result.valid).toBe(true);
    expect(result.entryPoint).toBe("index.html");
  });

  it("rejects a malicious archive containing a traversal escape wholesale", async () => {
    const { workspace, issues } = await extractZip(await maliciousZip());
    expect(issues.some((i) => i.code === "UNSAFE_PATH")).toBe(true);
    // Untrusted archive is rejected entirely: NO files are extracted.
    expect(workspace.list()).toHaveLength(0);
  });

  it("drops disallowed executables but keeps the legitimate project", async () => {
    const zip = await makeZip({
      "index.html": TEAM_A_HTML,
      "styles/main.css": TEAM_A_CSS,
      "scripts/deploy.sh": "#!/bin/sh\necho hi",
    });
    const { workspace, issues } = await extractZip(zip);
    expect(issues.some((i) => i.code === "BLOCKED_FILE")).toBe(true);
    expect(workspace.get("scripts/deploy.sh")).toBeUndefined();
    expect(workspace.get("index.html")).toBeDefined();
    expect(workspace.get("styles/main.css")).toBeDefined();
  });

  it("enforces decompressed size limit (archive bomb)", async () => {
    const big = "a".repeat(2000);
    const zip = await makeZip({ "index.html": "<html></html>", "big.css": big });
    const { issues } = await extractZip(zip, { maxFiles: 500, maxTotalBytes: 100, maxFileBytes: 100 });
    expect(issues.some((i) => i.code === "ARCHIVE_TOO_LARGE" || i.code === "FILE_TOO_LARGE")).toBe(true);
  });

  it("fails validation when there is no HTML", async () => {
    const zip = await makeZip({ "only.css": TEAM_A_CSS });
    const { workspace, issues } = await extractZip(zip);
    const result = validateProject(workspace, issues);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "NO_HTML")).toBe(true);
  });
});
