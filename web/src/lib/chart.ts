// Robinhood-style price line on a canvas: no axes or grid, colour by direction over the range,
// scrub to inspect, the line after the cursor dims, a pulse on the latest print.

import { changeBetween, downsample, rangePoints, switchAt } from "./metrics";
import type { Range } from "./metrics";
import type { Change, Point, Version } from "./types";

const MAX_POINTS = 480;
const PAD_TOP = 28;
const PAD_BOTTOM = 16;
const DRAW_MS = 450;

export interface ScrubState {
  readonly time: number;
  readonly value: number;
  readonly change: Change;
  readonly hovering: boolean;
  readonly switchedTo: Version | undefined;
}

export interface ChartElements {
  readonly box: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly pulse: HTMLElement;
  readonly stamp: HTMLElement;
}

interface Geometry {
  readonly w: number;
  readonly h: number;
  readonly x: (i: number) => number;
  readonly y: (v: number) => number;
  readonly baseline: number | null;
}

const css = (name: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export class PriceChart {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  private all: readonly Point[] = [];
  private versions: readonly Version[] = [];
  private range: Range;
  private pts: readonly Point[] = [];
  private hover: number | null = null;
  private progress = 1;
  private geom: Geometry | null = null;

  constructor(
    private readonly el: ChartElements,
    initialRange: Range,
    private readonly stampText: (t: number, range: Range) => string,
    private readonly onState: (s: ScrubState) => void,
  ) {
    const ctx = el.canvas.getContext("2d");
    if (!ctx) throw new Error("canvas 2D context unavailable");
    this.ctx = ctx;
    this.range = initialRange;
    this.bindPointer();
    new ResizeObserver(() => this.relayout()).observe(el.box);
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => this.draw());
  }

  /** Replace the data. Animates only on first load; live updates redraw in place. */
  setData(points: readonly Point[], versions: readonly Version[]): void {
    const first = this.all.length === 0;
    this.all = points;
    this.versions = versions;
    this.pts = downsample(rangePoints(points, this.range.seconds), MAX_POINTS);
    this.relayout(first);
  }

  setRange(range: Range): void {
    this.range = range;
    this.hover = null;
    this.pts = downsample(rangePoints(this.all, range.seconds), MAX_POINTS);
    this.relayout(true);
  }

  get color(): string {
    const pts = this.pts;
    return pts.length && pts[pts.length - 1]![1] >= pts[0]![1] ? css("--up") : css("--down");
  }

  private relayout(animate = false): void {
    if (this.pts.length === 0) return;
    this.layout();
    if (animate) this.animateIn();
    else this.render();
  }

  private layout(): void {
    const { box, canvas } = this.el;
    const w = box.clientWidth;
    const h = box.clientHeight;
    const dpr = devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const pts = this.pts;
    const baseline = this.range.key === "1D" ? pts[0]![1] : null;
    const vals = pts.map((p) => p[1]);
    let lo = Math.min(...vals, baseline ?? Infinity);
    let hi = Math.max(...vals, baseline ?? -Infinity);
    if (hi === lo) {
      hi += 0.01;
      lo -= 0.01;
    }
    const n = pts.length;
    const x = (i: number) => (n === 1 ? w / 2 : (i / (n - 1)) * (w - 6) + 1);
    const y = (v: number) => PAD_TOP + (1 - (v - lo) / (hi - lo)) * (h - PAD_TOP - PAD_BOTTOM);
    this.geom = { w, h, x, y, baseline };
  }

  private stroke(from: number, to: number, style: string): void {
    const g = this.geom!;
    if (to <= from) return;
    const ctx = this.ctx;
    ctx.beginPath();
    for (let i = from; i <= to; i++) {
      const X = g.x(i);
      const Y = g.y(this.pts[i]![1]);
      if (i === from) ctx.moveTo(X, Y);
      else ctx.lineTo(X, Y);
    }
    ctx.strokeStyle = style;
    ctx.stroke();
  }

  private draw(): void {
    const g = this.geom;
    if (!g) return;
    const { ctx, pts, hover } = this;
    const c = this.color;
    ctx.clearRect(0, 0, g.w, g.h);
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    if (g.baseline != null) {
      ctx.save();
      ctx.setLineDash([1, 5]);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = css("--faint");
      ctx.beginPath();
      ctx.moveTo(0, g.y(g.baseline));
      ctx.lineTo(g.w, g.y(g.baseline));
      ctx.stroke();
      ctx.restore();
    }

    const end = Math.round(this.progress * (pts.length - 1));
    if (hover == null) this.stroke(0, end, c);
    else {
      this.stroke(0, hover, c);
      this.stroke(hover, end, css("--faint"));
    }

    for (const v of this.versions.slice(1)) {
      const i = pts.findIndex((p) => p[0] >= v.time);
      if (i <= 0 || i > end) continue;
      ctx.beginPath();
      ctx.arc(g.x(i), g.y(pts[i]![1]), 3.5, 0, 2 * Math.PI);
      ctx.fillStyle = css("--bg");
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = css("--muted");
      ctx.stroke();
    }

    if (hover != null) {
      const X = g.x(hover);
      ctx.lineWidth = 1;
      ctx.strokeStyle = css("--faint");
      ctx.beginPath();
      ctx.moveTo(X, 18);
      ctx.lineTo(X, g.h);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(X, g.y(pts[hover]![1]), 5, 0, 2 * Math.PI);
      ctx.fillStyle = c;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = css("--bg");
      ctx.stroke();
    }

    document.documentElement.style.setProperty("--c", c);
    const showPulse = hover == null && this.progress === 1;
    this.el.pulse.hidden = !showPulse;
    if (showPulse) {
      const lastI = pts.length - 1;
      this.el.pulse.style.transform = `translate(${g.x(lastI)}px, ${g.y(pts[lastI]![1])}px)`;
    }
  }

  private emit(): void {
    const g = this.geom!;
    const i = this.hover ?? this.pts.length - 1;
    const [t, v] = this.pts[i]!;
    const hovering = this.hover != null;
    this.onState({
      time: t,
      value: v,
      change: changeBetween(this.pts[0]![1], v),
      hovering,
      switchedTo: hovering ? switchAt(this.versions, this.pts, i) : undefined,
    });
    const { stamp } = this.el;
    stamp.hidden = !hovering;
    if (hovering) {
      stamp.textContent = this.stampText(t, this.range);
      const half = stamp.offsetWidth / 2;
      stamp.style.transform = `translateX(${Math.min(Math.max(g.x(i), half), g.w - half) - half}px)`;
    }
  }

  private render(): void {
    this.draw();
    this.emit();
  }

  private animateIn(): void {
    if (this.reduceMotion) {
      this.progress = 1;
      this.render();
      return;
    }
    this.emit();
    const t0 = performance.now();
    const tick = (now: number): void => {
      const k = Math.min(1, (now - t0) / DRAW_MS);
      this.progress = k === 1 ? 1 : 1 - Math.pow(1 - k, 3);
      this.draw();
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  private bindPointer(): void {
    const { box } = this.el;
    const scrub = (clientX: number): void => {
      if (this.pts.length === 0) return;
      const rect = box.getBoundingClientRect();
      const k = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const i = Math.round(k * (this.pts.length - 1));
      if (i !== this.hover) {
        this.hover = i;
        this.progress = 1;
        this.render();
      }
    };
    const release = (): void => {
      if (this.hover != null) {
        this.hover = null;
        this.render();
      }
    };
    box.addEventListener("pointermove", (e) => scrub(e.clientX));
    box.addEventListener("pointerdown", (e) => scrub(e.clientX));
    box.addEventListener("pointerleave", release);
    box.addEventListener("pointerup", (e) => {
      if (e.pointerType !== "mouse") release();
    });
    box.addEventListener("pointercancel", release);
  }
}
