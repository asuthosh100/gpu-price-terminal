import type { Change } from "./types";

const MINUS = "−";

export const usd = (v: number | null | undefined): string => (v == null ? "–" : `$${v.toFixed(3)}`);

export const signedUsd = (v: number): string => `${v >= 0 ? "+" : MINUS}$${Math.abs(v).toFixed(3)}`;

export const pct = (v: number | null | undefined): string =>
  v == null ? "–" : `${v >= 0 ? "+" : MINUS}${Math.abs(v).toFixed(2)}%`;

/** "up" | "down" | "" — the CSS class for a change. */
export const direction = (c: Change | number | null | undefined): string => {
  const v = typeof c === "number" ? c : c?.abs;
  return v == null ? "" : v >= 0 ? "up" : "down";
};

export const changeText = (c: Change | null): string =>
  c == null ? "–" : `${signedUsd(c.abs)} (${pct(c.pct)})`;

/** Every time on the site is shown in Dubai time (UTC+4, no daylight saving). */
export const TIME_ZONE = "Asia/Dubai";
export const TZ_LABEL = "GST";

const local = (t: number, opts: Intl.DateTimeFormatOptions): string =>
  new Date(t * 1000).toLocaleString("en-US", { timeZone: TIME_ZONE, ...opts });

/** Scrub label: always date + time; long ranges add the year ("Nov 3, 2026, 4:15 PM"). */
export const stampFor = (t: number, spanSeconds: number): string =>
  spanSeconds <= 7 * 86_400
    ? local(t, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : local(t, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

export const shortTime = (t: number): string =>
  local(t, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
