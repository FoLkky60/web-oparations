import { describe, it, expect, vi, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ProjectWorkspace } from "@core/project/project-files";
import { transformProject } from "@core/transformation/transform-project";
import { TEAM_A_HTML, TEAM_A_CSS, TEAM_B_HTML, TEAM_B_CSS } from "./fixtures";

/**
 * Cross-cutting invariants (design/correctness.md):
 *  RULE-01 original never mutated · off-palette colors preserved ·
 *  RULE-07 non-semantic candidates never auto-applied · DS versions immutable.
 */

const ASSET = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff, 0x10, 0x7f]);

function ws(): ProjectWorkspace {
  const w = new ProjectWorkspace();
  w.add({ path: "index.html", kind: "html", text: TEAM_A_HTML, size: TEAM_A_HTML.length });
  w.add({ path: "styles/main.css", kind: "css", text: TEAM_A_CSS, size: TEAM_A_CSS.length });
  w.add({ path: "b/index.html", kind: "html", text: TEAM_B_HTML, size: TEAM_B_HTML.length });
  w.add({ path: "b/app.css", kind: "css", text: TEAM_B_CSS, size: TEAM_B_CSS.length });
  w.add({ path: "img/logo.png", kind: "asset", binary: Buffer.from(ASSET), size: ASSET.length });
  return w;
}

/** byte snapshot of every file (text as utf8 bytes, binary as-is) */
function bytes(w: ProjectWorkspace): Map<string, Buffer> {
  return new Map(
    w.list().map((f) => [f.path, f.binary ? Buffer.from(f.binary) : Buffer.from(f.text ?? "", "utf8")]),
  );
}

describe("RULE-01: original workspace is byte-identical after transformProject", () => {
  it("every file keeps identical bytes and no file is added/removed", () => {
    const original = ws();
    const before = bytes(original);
    const { output } = transformProject(original);
    const after = bytes(original);
    expect([...after.keys()].sort()).toEqual([...before.keys()].sort());
    for (const [p, buf] of before) {
      expect(Buffer.compare(after.get(p)!, buf), p).toBe(0);
    }
    // sanity: the output did change and is a separate copy
    expect(output.get("styles/main.css")!.text).not.toBe(TEAM_A_CSS);
    expect(output.get("styles/ds-tokens.css")).toBeDefined();
    expect(original.get("styles/ds-tokens.css")).toBeUndefined();
    // mutating the output binary must not leak into the original
    output.get("img/logo.png")!.binary![0] = 0x00;
    expect(Buffer.compare(original.get("img/logo.png")!.binary!, ASSET)).toBe(0);
  });
});

describe("off-palette colors are preserved", () => {
  it("#cc0000 stays literally in the output CSS and is never mapped to a token", () => {
    const { output, report } = transformProject(ws());
    expect(output.get("styles/main.css")!.text).toContain("#cc0000");
    expect(report.changes.some((c) => c.before.toLowerCase() === "#cc0000")).toBe(false);
  });
});

describe("RULE-07: non-semantic div button candidate is never auto-applied", () => {
  it("change is needs-review, not automatic, and no ds class is added to the div", () => {
    const { output, report } = transformProject(ws());
    const candidate = report.changes.filter((c) => c.selector.includes("action-button"));
    expect(candidate.length).toBeGreaterThan(0);
    for (const c of candidate) {
      expect(c.status).toBe("needs-review");
      expect(c.automatic).toBe(false);
    }
    const html = output.get("index.html")!.text ?? "";
    const m = html.match(/<div class="([^"]*\baction-button\b[^"]*)"/);
    expect(m).not.toBeNull();
    expect(m![1]).not.toMatch(/\bds-/);
    // the semantic <button> next to it IS standardized (control)
    expect(html).toMatch(/<button class="[^"]*\bds-button\b/);
  });
});

describe("DesignSystemVersion immutability (app/lib/design-system-service)", () => {
  // repository.ts resolves storage paths from process.cwd() at module load, so
  // point cwd at a temp dir BEFORE importing the service (no real storage/ touched).
  const tmp = mkdtempSync(path.join(tmpdir(), "oper-ds-"));
  afterAll(() => {
    vi.restoreAllMocks();
    rmSync(tmp, { recursive: true, force: true });
  });

  it("creating a new version leaves the previous version's content unchanged", async () => {
    vi.spyOn(process, "cwd").mockReturnValue(tmp);
    const svc = await import("../app/lib/design-system-service");

    const prev = await svc.getActiveVersion();
    expect(prev.version).toBe("3.2.1");
    const prevSnapshot = structuredClone(prev);

    const created = await svc.createVersion({
      tokens: prev.tokens.map((t) => (t.name === "color.primary" ? { ...t, value: "#B5151B" } : t)),
      components: prev.components,
      mappingRules: prev.mappingRules,
      createdBy: "test",
    });
    expect(created.version).not.toBe(prev.version);
    expect(created.active).toBe(true);
    expect((await svc.getActiveVersion()).version).toBe(created.version);

    const stored = await svc.getVersion(prev.version);
    // Only the active pointer flag flips (single-active invariant); content is immutable.
    expect(stored.active).toBe(false);
    const { active: _a, ...storedContent } = stored;
    const { active: _b, ...prevContent } = prevSnapshot;
    void _a;
    void _b;
    expect(storedContent).toEqual(prevContent);
    expect(stored.tokens.find((t) => t.name === "color.primary")?.value).toBe("#D71920");

    const versions = await svc.listVersions();
    expect(new Set(versions.map((v) => v.version)).size).toBe(versions.length);
    expect(versions.map((v) => v.version)).toEqual(expect.arrayContaining(["1.0.0", "3.2.1", created.version]));

    // re-creating an existing id is rejected by the repository (no overwrite)
    const { designSystemRepository } = await import("../app/lib/repository");
    await expect(designSystemRepository.create({ ...prevSnapshot, tokens: [] })).rejects.toThrow(/already exists/);
    expect((await svc.getVersion(prev.version)).tokens).toEqual(prevSnapshot.tokens);
  });
});
