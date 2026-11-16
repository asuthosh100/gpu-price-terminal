// Browser-side polling for the JSON the Python exporter publishes.

export const POLL_MS = 60_000;

/** Join a site-relative path onto the configured base (GitHub Pages serves under /<repo>/). */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${base}/${path.replace(/^\//, "")}`;
}

export interface PollOptions<T> {
  readonly url: string;
  readonly parse: (doc: unknown) => T;
  readonly onData: (data: T) => void;
  readonly onError: (message: string) => void;
  readonly intervalMs?: number;
}

/**
 * Fetch `url` now and every `intervalMs` while the tab is visible; refetch as soon as it
 * becomes visible again. The query string bypasses the CDN's 10-minute cache. Returns a stop fn.
 */
export function poll<T>({ url, parse, onData, onError, intervalMs = POLL_MS }: PollOptions<T>): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  const tick = async (): Promise<void> => {
    clearTimeout(timer);
    if (stopped || document.hidden) return;
    try {
      const res = await fetch(`${url}?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onData(parse(await res.json()));
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : "network error");
    }
    if (!stopped) timer = setTimeout(tick, intervalMs);
  };

  const onVisible = (): void => {
    if (!document.hidden) void tick();
  };
  document.addEventListener("visibilitychange", onVisible);
  void tick();

  return () => {
    stopped = true;
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
