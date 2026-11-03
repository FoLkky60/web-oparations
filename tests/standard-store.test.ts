import { describe, it, expect, beforeEach } from "vitest";
import {
  applyToAllProjects,
  confirmCategory,
  decidedCount,
  getBuilderState,
  getSiteBuild,
  getSites,
  getVariant,
  getVariants,
  impactFor,
  openCategoryCount,
  pickVariant,
  rebuildWorkspaces,
  resetStandard,
  setToggle,
  skipCategory,
  sourceStyle,
  standardizedStyle,
  styleSimilarity,
  workspacesOutdated,
} from "../app/lib/standard-store";
import { SEED_BUILDER_STATE, VARIANTS } from "../app/lib/standard-data";
import { CATEGORY_IDS, type CategoryId, type SiteId, type VariantStyle } from "../app/lib/standard-types";

/**
 * ADD-04/ADD-05 standard store (plain TS, runs in node — no localStorage because
 * `window` is undefined, so persist/readStorage are no-ops).
 */

function snapshotSourceStyles(): Record<string, VariantStyle> {
  const out: Record<string, VariantStyle> = {};
  for (const s of getSites()) {
    for (const c of CATEGORY_IDS) out[`${s.id}|${c}`] = structuredClone(sourceStyle(s.id, c));
  }
  return out;
}

beforeEach(() => {
  resetStandard();
});

describe("seed", () => {
  it("has 3 of 7 categories decided and published v3.2.1 / draft v3.2.2", () => {
    const st = getBuilderState();
    expect(decidedCount()).toBe(3);
    expect(CATEGORY_IDS.length).toBe(7);
    expect(openCategoryCount()).toBe(4);
    expect(st.published.version).toBe("3.2.1");
    expect(st.draft.version).toBe("3.2.2");
    expect(workspacesOutdated()).toBe(false);
  });
});

describe("pick / confirm / skip", () => {
  it("pick + confirm increments the decided count", () => {
    expect(pickVariant("table", "table-bd")).toBe(true);
    expect(getBuilderState().draft.decisions.table.status).toBe("choosing");
    expect(decidedCount()).toBe(3);
    expect(confirmCategory("table")).toBe(true);
    expect(getBuilderState().draft.decisions.table).toEqual({ variantId: "table-bd", status: "decided" });
    expect(decidedCount()).toBe(4);
  });

  it("rejects a variant from another category and confirm without a pick", () => {
    expect(pickVariant("table", "button-cp")).toBe(false);
    expect(confirmCategory("footer")).toBe(false);
    expect(decidedCount()).toBe(3);
  });

  it("skip marks the category skipped, clears the pick and removes it from open", () => {
    skipCategory("footer");
    const st = getBuilderState();
    expect(st.draft.decisions.footer).toEqual({ variantId: null, status: "skipped" });
    expect(st.draft.pickedVariantId.footer).toBeNull();
    expect(decidedCount()).toBe(3);
    expect(openCategoryCount()).toBe(3);
  });
});

describe("applyToAllProjects", () => {
  it("publishes the draft version and bumps the draft", () => {
    pickVariant("button", "button-bd");
    confirmCategory("button");
    const res = applyToAllProjects();
    expect(res).not.toBeNull();
    expect(res!.publishedVersion).toBe("3.2.2");
    expect(res!.nextDraftVersion).toBe("3.2.3");
    expect(res!.applied).toEqual(["button", "input", "card", "navbar"]);
    expect(res!.unchanged).toEqual(["table", "badge", "footer"]);
    const st = getBuilderState();
    expect(st.published.version).toBe("3.2.2");
    expect(st.draft.version).toBe("3.2.3");
    expect(st.published.decisions.button).toBe("button-bd");
    // undecided categories keep the previous published standard
    expect(st.published.decisions.table).toBe(SEED_BUILDER_STATE.published.decisions.table);
  });

  it("returns null when nothing is decided", () => {
    for (const c of ["input", "card", "navbar"] as CategoryId[]) skipCategory(c);
    expect(decidedCount()).toBe(0);
    expect(applyToAllProjects()).toBeNull();
    expect(getBuilderState().published.version).toBe("3.2.1");
  });

  it("Auto-rebuild on: all 5 sites are standardized with the new variant immediately", () => {
    expect(getBuilderState().toggles.autoRebuild).toBe(true);
    pickVariant("button", "button-bd");
    confirmCategory("button");
    const res = applyToAllProjects();
    expect(res!.rebuiltWorkspaces).toBe(5);
    expect(getSites()).toHaveLength(5);
    const newStyle = getVariant("button-bd")!.style;
    expect(standardizedStyle("button")).toEqual(newStyle);
    for (const s of getSites()) {
      const build = getSiteBuild(s.id);
      expect(build.version).toBe("3.2.2");
      expect(build.needsRebuild).toBe(false);
    }
    expect(workspacesOutdated()).toBe(false);
  });

  it("Auto-rebuild off: sites need rebuild until rebuildWorkspaces()", () => {
    setToggle("autoRebuild", false);
    pickVariant("button", "button-bd");
    confirmCategory("button");
    const before = standardizedStyle("button");
    const res = applyToAllProjects();
    expect(res!.rebuiltWorkspaces).toBe(0);
    expect(workspacesOutdated()).toBe(true);
    for (const s of getSites()) {
      expect(getSiteBuild(s.id)).toEqual({ siteId: s.id, version: "3.2.1", needsRebuild: true });
    }
    // standardized view still uses the previous build
    expect(standardizedStyle("button")).toEqual(before);

    expect(rebuildWorkspaces()).toBe(5);
    expect(workspacesOutdated()).toBe(false);
    for (const s of getSites()) {
      expect(getSiteBuild(s.id)).toEqual({ siteId: s.id, version: "3.2.2", needsRebuild: false });
    }
    expect(standardizedStyle("button")).toEqual(getVariant("button-bd")!.style);
  });
});

describe("RULE-01: source styles never change", () => {
  it("sourceStyle is identical after pick/confirm/apply/rebuild/reset", () => {
    const before = snapshotSourceStyles();
    const variantsBefore = structuredClone(VARIANTS);
    for (const c of CATEGORY_IDS) {
      const v = getVariants(c).find((x) => x.siteId === "li")!;
      pickVariant(c, v.id);
      confirmCategory(c);
    }
    setToggle("autoRebuild", false);
    applyToAllProjects();
    rebuildWorkspaces();
    expect(snapshotSourceStyles()).toEqual(before);
    expect(VARIANTS).toEqual(variantsBefore);
    resetStandard();
    expect(snapshotSourceStyles()).toEqual(before);
  });
});

describe("impactFor", () => {
  it("marks exactly one source, the rest replace/match, with usage counts", () => {
    for (const c of CATEGORY_IDS) {
      for (const chosen of getVariants(c)) {
        const impact = impactFor(c, chosen.id);
        expect(impact).toHaveLength(5);
        expect(impact.filter((i) => i.status === "source").map((i) => i.siteId)).toEqual([chosen.siteId]);
        for (const i of impact) {
          expect(["source", "replace", "match"]).toContain(i.status);
          const v = getVariants(c).find((x) => x.siteId === i.siteId)!;
          expect(i.count).toBe(v.usage.count);
          if (i.status === "match") expect(styleSimilarity(v.style, chosen.style)).toBe(1);
          if (i.status === "replace") expect(styleSimilarity(v.style, chosen.style)).toBeLessThan(1);
        }
      }
    }
  });

  it("button-cp: CP is source, other sites replace with their own counts", () => {
    const impact = impactFor("button", "button-cp");
    const by = Object.fromEntries(impact.map((i) => [i.siteId, i])) as Record<SiteId, (typeof impact)[number]>;
    expect(by.cp.status).toBe("source");
    const total = impact.reduce((s, i) => s + i.count, 0);
    const replaced = impact.filter((i) => i.status === "replace").reduce((s, i) => s + i.count, 0);
    expect(total).toBe(getVariants("button").reduce((s, v) => s + v.usage.count, 0));
    expect(replaced).toBe(total - by.cp.count - impact.filter((i) => i.status === "match").reduce((s, i) => s + i.count, 0));
  });

  it("is a stable reference for the same input (memoized)", () => {
    expect(impactFor("card", "card-bd")).toBe(impactFor("card", "card-bd"));
  });
});

describe("resetStandard", () => {
  it("restores the seed state", () => {
    pickVariant("button", "button-bd");
    confirmCategory("button");
    setToggle("enforceAll", false);
    applyToAllProjects();
    resetStandard();
    expect(getBuilderState()).toEqual(SEED_BUILDER_STATE);
    expect(decidedCount()).toBe(3);
  });

  it("does not share references with the seed (seed is never mutated)", () => {
    const seedCopy = structuredClone(SEED_BUILDER_STATE);
    pickVariant("table", "table-hr");
    confirmCategory("table");
    applyToAllProjects();
    expect(SEED_BUILDER_STATE).toEqual(seedCopy);
  });
});
