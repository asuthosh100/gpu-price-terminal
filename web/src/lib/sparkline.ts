import type { Point } from "./types";

/** SVG path for a sparkline in a width x height box, with `pad` px kept clear top and bottom. */
export function sparkPath(points: readonly Point[], width: number, height: number, pad = 2): string {
  if (points.length === 0) return "";
  const values = points.map((p) => p[1]);
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (hi === lo) {
    hi += 0.01;
    lo -= 0.01;
  }
  const n = points.length;
  const x = (i: number) => (n === 1 ? width / 2 : (i / (n - 1)) * width);
  const y = (v: number) => pad + (1 - (v - lo) / (hi - lo)) * (height - 2 * pad);
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p[1]).toFixed(1)}`)
    .join("");
}
