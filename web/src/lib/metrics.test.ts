import { describe, expect, it } from "vitest";
import { DAY, changeOver, downsample, indexAtOrBefore, rangePoints, stats, switchAt } from "./metrics";
import { freshness, pct, shortTime, signedUsd, stampFor, timeAgo } from "./format";
import { sparkPath } from "./sparkline";
import { DataError, parseDetail, parseSummary } from "./types";
import type { Point } from "./types";

const QUARTER = 900;
/** One point every 15 min for `days`, rising by 0.001 each point. */
const series = (days: number): Point[] =>
  Array.from({ length: days * 96 + 1 }, (_, i) => [i * QUARTER, 3 + i * 0.001] as const);

describe("indexAtOrBefore", () => {
  const pts: Point[] = [[10, 1], [20, 2], [30, 3]];
  it("finds the exact match", () => expect(indexAtOrBefore(pts, 20)).toBe(1));
  it("finds the previous point between samples", () => expect(indexAtOrBefore(pts, 29)).toBe(1));
  it("returns -1 before the first point", () => expect(indexAtOrBefore(pts, 5)).toBe(-1));
});

describe("changeOver", () => {
  it("compares the last value with the value one window earlier (same rule as site_data.py)", () => {
    const pts = series(3);
    const c = changeOver(pts, DAY)!;
    const last = 3 + 288 * 0.001;
    const base = 3 + 192 * 0.001;
    expect(c.abs).toBeCloseTo(last - base);
    expect(c.pct).toBeCloseTo((last / base - 1) * 100);
  });
  it("is null when history is shorter than the window", () => {
    expect(changeOver(series(0).slice(0, 5), DAY)).toBeNull();
  });
  it("uses the first point for all-time", () => {
    expect(changeOver(series(1), null)!.abs).toBeCloseTo(96 * 0.001);
  });
});

describe("rangePoints", () => {
  it("starts at the base point so the header change matches changeOver", () => {
    const pts = series(3);
    const r = rangePoints(pts, DAY);
    expect(r[0]![0]).toBe(pts[pts.length - 1]![0] - DAY);
    expect(r[r.length - 1]).toBe(pts[pts.length - 1]);
  });
  it("falls back to all history when shorter than the window", () => {
    const pts = series(0).slice(0, 5);
    expect(rangePoints(pts, DAY)).toEqual(pts);
  });
});

describe("downsample", () => {
  it("bounds the length and keeps the first and latest points", () => {
    const pts = series(30);
    const d = downsample(pts, 100);
    expect(d.length).toBeLessThanOrEqual(102);
    expect(d[0]).toBe(pts[0]);
    expect(d[d.length - 1]).toBe(pts[pts.length - 1]);
  });
  it("returns short series unchanged", () => {
    const pts = series(0);
    expect(downsample(pts, 100)).toBe(pts);
  });
});

describe("stats", () => {
  it("computes high, low and mean", () => {
    expect(stats([[0, 1], [1, 3], [2, 2]])).toEqual({ high: 3, low: 1, mean: 2 });
  });
});

describe("switchAt", () => {
  const pts: Point[] = [[0, 1], [900, 1], [1800, 1]];
  const versions = [{ time: 0, methodology_id: "v1" }, { time: 1000, methodology_id: "v2" }];
  it("names the switch that lands between two points", () => {
    expect(switchAt(versions, pts, 2)?.methodology_id).toBe("v2");
  });
  it("ignores the first version, which is not a switch", () => {
    expect(switchAt(versions, pts, 1)).toBeUndefined();
  });
});

describe("format", () => {
  it("uses a true minus sign for negatives", () => {
    expect(pct(-1.234)).toBe("−1.23%");
    expect(signedUsd(-0.5)).toBe("−$0.500");
    expect(pct(0)).toBe("+0.00%");
  });
  it("describes elapsed time", () => {
    expect(timeAgo(1000, 1030)).toBe("just now");
    expect(timeAgo(0, 360)).toBe("6 min ago");
    expect(timeAgo(0, 7300)).toBe("2 h ago");
  });
  it("shows times in Dubai time (UTC+4)", () => {
    const t = Date.UTC(2026, 10, 16, 7, 15) / 1000; // 07:15 UTC
    expect(shortTime(t)).toBe("Nov 16, 11:15 AM");
    expect(stampFor(Date.UTC(2026, 10, 16, 21, 0) / 1000, 365 * DAY)).toBe("Nov 17, 2026");
  });
  it("flags late and stale prints", () => {
    expect(freshness(0, 20 * 60)).toBe("fresh");
    expect(freshness(0, 45 * 60)).toBe("late");
    expect(freshness(0, 3 * 3600)).toBe("stale");
  });
});

describe("sparkPath", () => {
  it("spans the full width and stays inside the padding", () => {
    const d = sparkPath([[0, 1], [1, 2], [2, 1.5]], 100, 20, 2);
    expect(d.startsWith("M0.0 18.0")).toBe(true);
    expect(d).toContain("L50.0 2.0");
    expect(d.endsWith("L100.0 10.0")).toBe(true);
  });
  it("draws a flat series in the middle", () => {
    expect(sparkPath([[0, 1], [1, 1]], 10, 20, 0)).toBe("M0.0 10.0L10.0 10.0");
  });
});

describe("parse", () => {
  it("rejects a document with the wrong schema version", () => {
    expect(() => parseSummary({ schema: 99, updated_at: "", skus: [] })).toThrow(DataError);
  });
  it("rejects a detail with no points", () => {
    const doc = { schema: 1, updated_at: "", last: {}, points: [], versions: [], quality: {} };
    expect(() => parseDetail(doc, "H100")).toThrow(/no points/);
  });
});
