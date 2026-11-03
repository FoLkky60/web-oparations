/**
 * Minimal line-based side-by-side diff (LCS). Pure and deterministic; used by
 * the project compare view. Inputs above MAX_LINES fall back to index pairing
 * to keep the O(n*m) table bounded.
 */
export type DiffRow =
  | { type: "same"; left: string; right: string; leftNo: number; rightNo: number }
  | { type: "removed"; left: string; leftNo: number }
  | { type: "added"; right: string; rightNo: number };

const MAX_LINES = 1500;

export function diffLines(original: string, output: string): { rows: DiffRow[]; approximate: boolean } {
  const a = original.split("\n");
  const b = output.split("\n");
  if (a.length > MAX_LINES || b.length > MAX_LINES) {
    const rows: DiffRow[] = [];
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) {
      if (i < a.length && i < b.length && a[i] === b[i]) {
        rows.push({ type: "same", left: a[i], right: b[i], leftNo: i + 1, rightNo: i + 1 });
      } else {
        if (i < a.length) rows.push({ type: "removed", left: a[i], leftNo: i + 1 });
        if (i < b.length) rows.push({ type: "added", right: b[i], rightNo: i + 1 });
      }
    }
    return { rows, approximate: true };
  }

  // LCS length table (suffix form).
  const m = a.length;
  const n = b.length;
  const dp: Uint16Array[] = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      rows.push({ type: "same", left: a[i], right: b[j], leftNo: i + 1, rightNo: j + 1 });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      rows.push({ type: "removed", left: a[i], leftNo: i + 1 });
      i++;
    } else {
      rows.push({ type: "added", right: b[j], rightNo: j + 1 });
      j++;
    }
  }
  while (i < m) rows.push({ type: "removed", left: a[i], leftNo: ++i });
  while (j < n) rows.push({ type: "added", right: b[j], rightNo: ++j });
  return { rows, approximate: false };
}
