// Pure price maths shared by the build (Astro) and the browser.
// Change over a window W = last / valueAtOrBefore(last.t - W) - 1, the same rule as site_data.py.

import type { Change, Point } from "./types";

export const DAY = 86_400;

export interface Range {
  readonly key: string;
  readonly seconds: number | null; // null = all history
  readonly label: string;
}

export const RANGES: readonly Range[] = [
  { key: "1D", seconds: DAY, label: "Past day" },
  { key: "1W", seconds: 7 * DAY, label: "Past week" },
  { key: "1M", seconds: 30 * DAY, label: "Past month" },
  { key: "ALL", seconds: null, label: "All time" },
];

export const DEFAULT_RANGE = "1M";

/** Ranges worth offering: drop any window more than twice the history we have. */
export function availableRanges(points: readonly Point[]): readonly Range[] {
  const span = points.length ? points[points.length - 1]![0] - points[0]![0] : 0;
  return RANGES.filter((r) => r.seconds == null || span > r.seconds / 2);
}

export function findRange(ranges: readonly Range[], key: string): Range {
  return ranges.find((r) => r.key === key) ?? ranges[ranges.length - 1]!;
}

/** Index of the last point at or before t, or -1. Points are sorted by time. */
export function indexAtOrBefore(points: readonly Point[], t: number): number {
  let lo = 0;
  let hi = points.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid]![0] <= t) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

export function changeBetween(base: number, value: number): Change {
  return { abs: value - base, pct: (value / base - 1) * 100 };
}

export function changeOver(points: readonly Point[], seconds: number | null): Change | null {
  const last = points[points.length - 1];
  if (!last) return null;
  const i = seconds == null ? 0 : indexAtOrBefore(points, last[0] - seconds);
  return i < 0 ? null : changeBetween(points[i]![1], last[1]);
}

/**
 * The points a range draws: from the base point (at or before the window start) to the latest.
 * Falls back to all history when there isn't a full window yet.
 */
export function rangePoints(points: readonly Point[], seconds: number | null): readonly Point[] {
  const last = points[points.length - 1];
  if (!last || seconds == null) return points;
  const i = indexAtOrBefore(points, last[0] - seconds);
  return points.slice(Math.max(0, i));
}

/** Keep the first point and the last of each block so the line always ends on the latest print. */
export function downsample(points: readonly Point[], limit: number): readonly Point[] {
  const step = Math.ceil(points.length / limit);
  if (step <= 1) return points;
  const out: Point[] = [points[0]!];
  for (let i = step - 1; i < points.length; i += step) out.push(points[i]!);
  if (out[out.length - 1] !== points[points.length - 1]) out.push(points[points.length - 1]!);
  return out;
}

export interface Stats {
  readonly high: number;
  readonly low: number;
  readonly mean: number;
}

export function stats(points: readonly Point[]): Stats {
  let high = -Infinity;
  let low = Infinity;
  let sum = 0;
  for (const [, v] of points) {
    high = Math.max(high, v);
    low = Math.min(low, v);
    sum += v;
  }
  return { high, low, mean: sum / points.length };
}

/** Methodology switch that takes effect at point i (between point i-1 and i), if any. */
export function switchAt<T extends { time: number }>(
  versions: readonly T[],
  points: readonly Point[],
  i: number,
): T | undefined {
  if (i <= 0) return undefined;
  const prev = points[i - 1]![0];
  const cur = points[i]![0];
  return versions.slice(1).find((v) => v.time > prev && v.time <= cur);
}
