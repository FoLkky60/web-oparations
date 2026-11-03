import { parse, serialize } from "parse5";
import type { TransformationChange } from "@shared/index";
import type { ComponentMappingDecision } from "./component-mapping";

/**
 * HTML transformation: add standardized Design System classes to recognized
 * components. We deliberately only add classes (non-destructive) and NEVER
 * change an element's tag. Candidate (non-semantic) detections are reported as
 * needs-review changes and are not applied automatically.
 *
 * We match elements back to decisions using the SourceRef domIndex produced by
 * the analyzer, recomputed here against a fresh parse of the same HTML so the
 * indices line up deterministically.
 */

interface P5Attr {
  name: string;
  value: string;
}
interface P5Node {
  nodeName: string;
  tagName?: string;
  attrs?: P5Attr[];
  childNodes?: P5Node[];
}

export interface HtmlTransformResult {
  html: string;
  changes: TransformationChange[];
}

export function transformHtml(
  file: string,
  html: string,
  decisions: ComponentMappingDecision[],
): HtmlTransformResult {
  // Map of domIndex -> decision for elements in THIS file.
  const byIndex = new Map<number, ComponentMappingDecision>();
  for (const d of decisions) {
    if (d.component.source.file === file) byIndex.set(d.component.source.domIndex, d);
  }

  const doc = parse(html) as unknown as P5Node;
  const changes: TransformationChange[] = [];
  let counter = 0;

  const walk = (node: P5Node): void => {
    for (const child of node.childNodes ?? []) {
      if (!child.tagName) {
        if (child.childNodes) walk(child);
        continue;
      }
      const domIndex = counter++;
      const decision = byIndex.get(domIndex);
      if (decision && decision.standardClass) {
        applyDecision(child, decision, file, changes);
      }
      walk(child);
    }
  };

  walk(doc);

  return { html: serialize(doc as never), changes };
}

function applyDecision(
  node: P5Node,
  decision: ComponentMappingDecision,
  file: string,
  changes: TransformationChange[],
): void {
  const comp = decision.component;
  const selector = comp.source.selector;

  if (decision.eligibility === "ineligible") return;

  if (decision.eligibility === "needs-review") {
    changes.push({
      file,
      selector,
      property: "class",
      before: comp.source.classes.join(" "),
      after: `${comp.source.classes.join(" ")} ${decision.standardClass}`.trim(),
      rule: "add-standard-class",
      reason: decision.reason + " Not applied automatically.",
      category: "components",
      automatic: false,
      status: "needs-review",
      source: comp.source,
    });
    return;
  }

  // eligibility === "auto": add the standardized class if not already present.
  const attrs = node.attrs ?? (node.attrs = []);
  const classAttr = attrs.find((a) => a.name.toLowerCase() === "class");
  const existing = classAttr ? classAttr.value.split(/\s+/).filter(Boolean) : [];
  const toAdd = decision.standardClass!.split(/\s+/).filter((c) => !existing.includes(c));

  if (toAdd.length === 0) {
    return; // already standardized
  }

  const before = existing.join(" ");
  const next = [...existing, ...toAdd].join(" ");
  if (classAttr) classAttr.value = next;
  else attrs.push({ name: "class", value: next });

  changes.push({
    file,
    selector,
    property: "class",
    before,
    after: next,
    rule: "add-standard-class",
    reason: `${decision.reason} Added standardized class for ${decision.targetComponent}.`,
    category: "components",
    automatic: true,
    status: "applied",
    source: comp.source,
  });
}

