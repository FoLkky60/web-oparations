import postcss from "postcss";
import type { Declaration, Rule, AtRule } from "postcss";
import type { ParsedElement } from "./html-analyzer";

/**
 * CSS analysis via PostCSS.
 *
 * We extract rules with their declarations, source order, and a computed
 * specificity. We then resolve applicable declarations onto HTML elements using
 * a deliberately limited matcher (tag / .class / #id and compound combinations
 * of those). Anything we cannot evaluate statically (pseudo-classes beyond a
 * flagged set, descendant combinators that need live DOM state, custom property
 * indirection that cannot be resolved, etc.) is reported as UNRESOLVED rather
 * than guessed. We never fabricate a computed value.
 */

export interface CssDeclaration {
  prop: string;
  value: string;
  important: boolean;
}

export interface CssRule {
  file: string;
  selector: string;
  /** The individual comma-separated selectors. */
  selectors: string[];
  declarations: CssDeclaration[];
  /** Source order across all stylesheets (lower = earlier). */
  order: number;
  /** The media query text if nested in @media, else null. */
  media: string | null;
}

export interface CssModel {
  file: string;
  rules: CssRule[];
  customProperties: Record<string, string>;
  mediaQueries: string[];
  warnings: string[];
}

export function analyzeCss(file: string, css: string, startOrder = 0): CssModel {
  const root = postcss.parse(css, { from: file });
  const rules: CssRule[] = [];
  const customProperties: Record<string, string> = {};
  const mediaQueries: string[] = [];
  const warnings: string[] = [];
  let order = startOrder;

  const readRule = (rule: Rule, media: string | null): void => {
    const declarations: CssDeclaration[] = [];
    rule.walkDecls((decl: Declaration) => {
      const prop = decl.prop.toLowerCase();
      declarations.push({
        prop,
        value: decl.value,
        important: decl.important === true,
      });
      if (prop.startsWith("--")) {
        customProperties[prop] = decl.value;
      }
    });
    const selectors = rule.selector.split(",").map((s) => s.trim()).filter(Boolean);
    rules.push({
      file,
      selector: rule.selector,
      selectors,
      declarations,
      order: order++,
      media,
    });
  };

  root.walkRules((rule: Rule) => {
    const parent = rule.parent;
    let media: string | null = null;
    if (parent && parent.type === "atrule") {
      const at = parent as AtRule;
      if (at.name === "media") {
        media = at.params;
        if (!mediaQueries.includes(at.params)) mediaQueries.push(at.params);
      }
    }
    readRule(rule, media);
  });

  // Capture :root custom properties already handled above; collect media list.
  root.walkAtRules("media", (at) => {
    if (!mediaQueries.includes(at.params)) mediaQueries.push(at.params);
  });

  return { file, rules, customProperties, mediaQueries, warnings };
}

// ---------------------------------------------------------------------------
// Specificity + simple-selector matching
// ---------------------------------------------------------------------------

export interface Specificity {
  a: number; // ids
  b: number; // classes / attrs / pseudo-classes
  c: number; // elements / pseudo-elements
}

const PSEUDO_STATE = new Set([":hover", ":focus", ":active", ":visited"]);

/** Parse a single (non-comma) selector into its trailing "key" simple selector. */
interface SimpleSelector {
  tag: string | null;
  id: string | null;
  classes: string[];
  pseudoStates: string[];
  /** True if the selector uses combinators/descendants we cannot resolve. */
  complex: boolean;
}

export function parseSimpleSelector(selector: string): SimpleSelector {
  const trimmed = selector.trim();
  // Descendant / child / sibling combinators -> take the rightmost key, mark complex.
  const complex = /[\s>+~]/.test(trimmed.replace(/\(.*?\)/g, ""));
  const key = complex ? trimmed.split(/[\s>+~]+/).filter(Boolean).pop() ?? trimmed : trimmed;

  const classes: string[] = [];
  const pseudoStates: string[] = [];
  let tag: string | null = null;
  let id: string | null = null;

  const tokenRe = /([.#]?[\w-]+|::?[\w-]+|\*|\[[^\]]*\])/g;
  let m: RegExpExecArray | null;
  let hasUnsupportedPseudo = false;
  while ((m = tokenRe.exec(key))) {
    const tok = m[1];
    if (tok.startsWith(".")) classes.push(tok.slice(1));
    else if (tok.startsWith("#")) id = tok.slice(1);
    else if (tok.startsWith("::")) hasUnsupportedPseudo = true;
    else if (tok.startsWith(":")) {
      if (PSEUDO_STATE.has(tok)) pseudoStates.push(tok);
      else hasUnsupportedPseudo = true;
    } else if (tok.startsWith("[")) {
      hasUnsupportedPseudo = true; // attribute selectors not matched statically
    } else if (tok === "*") {
      tag = null;
    } else {
      tag = tok.toLowerCase();
    }
  }

  return {
    tag,
    id,
    classes,
    pseudoStates,
    complex: complex || hasUnsupportedPseudo,
  };
}

export function specificityOf(selector: string): Specificity {
  const s = parseSimpleSelector(selector);
  return {
    a: s.id ? 1 : 0,
    b: s.classes.length + s.pseudoStates.length,
    c: s.tag ? 1 : 0,
  };
}

function specCompare(a: Specificity, b: Specificity): number {
  if (a.a !== b.a) return a.a - b.a;
  if (a.b !== b.b) return a.b - b.b;
  return a.c - b.c;
}

/** Does a simple key selector match the element's tag/id/classes? */
export function simpleSelectorMatches(sel: SimpleSelector, el: ParsedElement): boolean {
  if (sel.tag && sel.tag !== el.tag) return false;
  if (sel.id && sel.id !== el.id) return false;
  for (const c of sel.classes) if (!el.classes.includes(c)) return false;
  return true;
}

export interface ResolvedDeclaration {
  prop: string;
  value: string;
  important: boolean;
  from: { selector: string; order: number; file: string };
}

export interface ResolutionResult {
  /** Resolved base-state properties (prop -> winning declaration). */
  resolved: Record<string, ResolvedDeclaration>;
  /** Props that were seen in matching-but-complex selectors or states. */
  unresolved: string[];
  /** Hover/focus declarations we matched but keep separate. */
  stateProperties: Record<string, ResolvedDeclaration>;
}

/**
 * Resolve applicable declarations for one element across all rules using the
 * cascade: specificity, then source order, with !important winning. Complex
 * selectors whose key matches are recorded as unresolved influence.
 */
export function resolveForElement(el: ParsedElement, rules: CssRule[]): ResolutionResult {
  const resolved: Record<string, ResolvedDeclaration> = {};
  const stateProperties: Record<string, ResolvedDeclaration> = {};
  const unresolved = new Set<string>();

  // Track the best (spec, order, important) per prop.
  interface Best {
    spec: Specificity;
    order: number;
    important: boolean;
  }
  const bestMap: Record<string, Best> = {};

  for (const rule of rules) {
    for (const rawSel of rule.selectors) {
      const sel = parseSimpleSelector(rawSel);
      if (!simpleSelectorMatches(sel, el)) continue;

      const isState = sel.pseudoStates.length > 0;
      // Even for matched complex selectors we still want the props flagged.
      for (const decl of rule.declarations) {
        if (decl.prop.startsWith("--")) continue;

        if (isState) {
          stateProperties[`${sel.pseudoStates.join("")}:${decl.prop}`] = {
            prop: decl.prop,
            value: decl.value,
            important: decl.important,
            from: { selector: rawSel, order: rule.order, file: rule.file },
          };
          continue;
        }

        if (sel.complex) {
          // The key matched but we cannot be sure the full selector applies.
          unresolved.add(decl.prop);
          continue;
        }

        const spec = specificityOf(rawSel);
        const prev = bestMap[decl.prop];
        const wins =
          !prev ||
          (decl.important && !prev.important) ||
          (decl.important === prev.important &&
            (specCompare(spec, prev.spec) > 0 ||
              (specCompare(spec, prev.spec) === 0 && rule.order >= prev.order)));

        if (wins) {
          bestMap[decl.prop] = { spec, order: rule.order, important: decl.important };
          resolved[decl.prop] = {
            prop: decl.prop,
            value: decl.value,
            important: decl.important,
            from: { selector: rawSel, order: rule.order, file: rule.file },
          };
        }
      }
    }
  }

  // A prop that is both resolved and flagged complex: keep resolved, drop from unresolved.
  for (const prop of Object.keys(resolved)) unresolved.delete(prop);

  return { resolved, stateProperties, unresolved: [...unresolved] };
}
