// Keeps the <Freshness> badge current in the browser.

import { freshness, timeAgo } from "./format";

const TICK_MS = 30_000;

export interface FreshnessBadge {
  /** New latest-print time from a successful poll. */
  readonly setTime: (t: number) => void;
  /** A poll failed; show it until the next success. */
  readonly setError: (message: string) => void;
}

export function bindFreshness(el: HTMLElement): FreshnessBadge {
  let time = Number(el.dataset["time"]);
  let error: string | null = null;

  const paint = (): void => {
    const now = Math.floor(Date.now() / 1000);
    el.dataset["state"] = error ? "error" : freshness(time, now);
    el.textContent = error
      ? `Can't refresh (${error}) · last print ${timeAgo(time, now)}`
      : `Updated ${timeAgo(time, now)}`;
  };

  setInterval(paint, TICK_MS);
  paint();
  return {
    setTime: (t) => {
      time = t;
      error = null;
      paint();
    },
    setError: (message) => {
      error = message;
      paint();
    },
  };
}
