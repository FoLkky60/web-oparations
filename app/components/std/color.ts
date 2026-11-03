/*
 * ADD-04 Phase E — color helpers สำหรับ std components
 *
 * ค่าสีของ VariantStyle เป็น DATA ของเว็บต้นฉบับ (hex) — บางคู่สีของต้นฉบับไม่ผ่าน WCAG 2.2 AA
 * (เช่น ตัวอักษรขาวบนเขียว #2E9E4F ≈ 3.4:1) จึงมี "contrast guard" ที่ปรับค่าน้อยที่สุด
 * จนผ่านเกณฑ์ (ไล่เข้ม/อ่อนทีละ 5%) แทนการใช้ค่าดิบตรง ๆ — ข้อมูลต้นฉบับไม่ถูกแก้ (RULE-01)
 * ค่าที่ไม่ใช่ hex (เช่น "transparent", var(...)) ส่งผ่านโดยไม่แปลง
 */

type Rgb = [number, number, number];

const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];

/** พื้นสว่างอ้างอิง สำหรับปุ่ม outline/text-link (วางบนการ์ด/พื้นสว่าง) */
export const LIGHT_SURFACE = "#ffffff";
export const DARK_INK = "#000000";

/** AA สำหรับข้อความปกติ */
export const AA_TEXT = 4.5;
/** AA สำหรับ non-text (เส้นขอบ focus, กราฟ, ไอคอน) */
export const AA_UI = 3;

function parseHex(value: string): Rgb | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  return [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16)) as Rgb;
}

function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((n) => Math.round(n).toString(16).padStart(2, "0")).join("")}`;
}

function luminance([r, g, b]: Rgb): number {
  const ch = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

function ratio(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** contrast ratio ของสอง hex (คืน 21 ถ้าอ่านค่าไม่ได้ — ไม่บล็อกการ render) */
export function contrast(a: string, b: string): number {
  const ra = parseHex(a);
  const rb = parseHex(b);
  if (!ra || !rb) return 21;
  return ratio(ra, rb);
}

/** พื้นเข้ม = ตัวอักษรขาวอ่านง่ายกว่าตัวอักษรดำ */
export function isDark(hex: string): boolean {
  const rgb = parseHex(hex);
  if (!rgb) return false;
  return ratio(rgb, WHITE) >= ratio(rgb, BLACK);
}

/** ผสมสี a → b ด้วยสัดส่วน t (0..1) */
export function mix(a: string, b: string, t: number): string {
  const ra = parseHex(a);
  const rb = parseHex(b);
  if (!ra || !rb) return a;
  return toHex(mixRgb(ra, rb, t));
}

/**
 * คืน fg ที่อ่านได้บน bg (≥ min) — ถ้าไม่ผ่าน ไล่ fg ไปทางขาว/ดำ (ทิศที่ contrast สูงกว่า)
 * ทีละ 5% จนผ่าน
 */
export function readableOn(fg: string, bg: string, min = AA_TEXT): string {
  const f = parseHex(fg);
  const b = parseHex(bg);
  if (!f || !b) return fg;
  if (ratio(f, b) >= min) return fg;
  const target = ratio(WHITE, b) >= ratio(BLACK, b) ? WHITE : BLACK;
  for (let t = 0.05; t <= 1.0001; t += 0.05) {
    const c = mixRgb(f, target, t);
    if (ratio(c, b) >= min) return toHex(c);
  }
  return toHex(target);
}

/**
 * คืน bg ที่ทำให้ fg อ่านได้ (≥ min) — ไล่ bg ไปทางตรงข้ามกับ fg ทีละ 5% (สูงสุด 60%)
 * ใช้กับพื้นปุ่ม/แถบ ที่อยากคงสีตัวอักษรเดิมไว้ (เช่น ตัวอักษรขาว)
 */
export function readableBg(bg: string, fg: string, min = AA_TEXT): string {
  const b = parseHex(bg);
  const f = parseHex(fg);
  if (!b || !f) return bg;
  if (ratio(f, b) >= min) return bg;
  const target = isDark(fg) ? WHITE : BLACK;
  for (let t = 0.05; t <= 0.6001; t += 0.05) {
    const c = mixRgb(b, target, t);
    if (ratio(f, c) >= min) return toHex(c);
  }
  return bg;
}

/** คู่ bg/fg ที่ผ่าน AA: ปรับ bg ก่อน (คง fg ต้นฉบับ) แล้วค่อยปรับ fg ถ้ายังไม่พอ */
export function readablePair(bg: string, fg: string, min = AA_TEXT): { bg: string; fg: string } {
  const nextBg = readableBg(bg, fg, min);
  return { bg: nextBg, fg: readableOn(fg, nextBg, min) };
}

/** font stack จากชื่อฟอนต์ต้นฉบับ (system/OFL fonts เท่านั้น — ไม่ฝังไฟล์ฟอนต์) */
export function fontStack(family: string): string {
  const generic = /courier|mono/i.test(family) ? "ui-monospace, monospace" : "system-ui, sans-serif";
  return `"${family}", ${generic}`;
}

/** สีของเส้นจาก CSS border shorthand (เช่น "1px solid #E6E8EC") */
export function borderColor(border: string): string | null {
  const m = /#[0-9a-f]{3,6}\b/i.exec(border);
  return m ? m[0] : null;
}
