/**
 * Color parsing and distance utilities. Used to decide whether a source color
 * is "close enough" to an approved token to be considered the same intent.
 * Deliberately conservative: only hex, rgb(), and rgba() are understood.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
  a: number;
}

const NAMED: Record<string, string> = {
  white: "#ffffff",
  black: "#000000",
  red: "#ff0000",
  green: "#008000",
  blue: "#0000ff",
  transparent: "rgba(0,0,0,0)",
};

export function parseColor(input: string): Rgb | null {
  if (!input) return null;
  let value = input.trim().toLowerCase();
  if (NAMED[value]) value = NAMED[value];

  // #rgb / #rrggbb / #rrggbbaa
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/);
  if (hex) {
    const h = hex[1];
    if (h.length === 3) {
      return {
        r: parseInt(h[0] + h[0], 16),
        g: parseInt(h[1] + h[1], 16),
        b: parseInt(h[2] + h[2], 16),
        a: 1,
      };
    }
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }

  // rgb()/rgba()
  const rgb = value.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/,
  );
  if (rgb) {
    return {
      r: Number(rgb[1]),
      g: Number(rgb[2]),
      b: Number(rgb[3]),
      a: rgb[4] !== undefined ? Number(rgb[4]) : 1,
    };
  }

  return null;
}

/** Euclidean distance in RGB space (0..~441). Ignores alpha mismatch here. */
export function colorDistance(a: Rgb, b: Rgb): number {
  return Math.sqrt(
    (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2,
  );
}

export function isColorValue(value: string): boolean {
  return parseColor(value) !== null;
}

/**
 * Find the nearest token color within `threshold`. Returns null when nothing is
 * close enough — the caller must NOT force a mapping in that case.
 */
export function nearestColor(
  value: string,
  candidates: { name: string; value: string }[],
  threshold = 24,
): { name: string; value: string; distance: number } | null {
  const target = parseColor(value);
  if (!target) return null;

  let best: { name: string; value: string; distance: number } | null = null;
  for (const c of candidates) {
    const rgb = parseColor(c.value);
    if (!rgb) continue;
    const d = colorDistance(target, rgb);
    if (best === null || d < best.distance) {
      best = { name: c.name, value: c.value, distance: d };
    }
  }
  if (best && best.distance <= threshold) return best;
  return null;
}

/** True when two colors are the exact same value (normalized). */
export function sameColor(a: string, b: string): boolean {
  const pa = parseColor(a);
  const pb = parseColor(b);
  if (!pa || !pb) return false;
  return pa.r === pb.r && pa.g === pb.g && pa.b === pb.b && pa.a === pb.a;
}
