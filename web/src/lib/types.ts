// The JSON contract written by scripts/export_site_data.py (gpu_terminal/site_data.py).
// Bump SCHEMA_VERSION on both sides together when the shape changes.

export const SCHEMA_VERSION = 1;

/** [unix seconds, USD per GPU-hour] */
export type Point = readonly [number, number];

export interface Change {
  readonly abs: number;
  readonly pct: number;
}

export interface SummaryRow {
  readonly sku: string;
  readonly name: string;
  readonly unit: string;
  readonly last: { readonly time: number; readonly value: number };
  readonly change_24h: Change | null;
  readonly spark: readonly Point[];
}

export interface Summary {
  readonly schema: number;
  readonly updated_at: string;
  readonly skus: readonly SummaryRow[];
}

export interface Version {
  readonly methodology_id: string;
  readonly time: number;
}

export interface SkuDetail {
  readonly schema: number;
  readonly sku: string;
  readonly name: string;
  readonly unit: string;
  readonly updated_at: string;
  readonly last: { readonly time: number; readonly value: number; readonly band: number | null };
  readonly points: readonly Point[];
  readonly versions: readonly Version[];
  readonly quality: { readonly prints: number; readonly priced: number; readonly gaps: number };
}

export class DataError extends Error {}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/** Shallow shape check at the boundary: fail loudly on a schema mismatch instead of rendering NaN. */
function checkSchema(doc: unknown, label: string, keys: readonly string[]): void {
  if (!isRecord(doc)) throw new DataError(`${label}: not a JSON object`);
  if (doc["schema"] !== SCHEMA_VERSION) {
    throw new DataError(`${label}: schema ${String(doc["schema"])}, expected ${SCHEMA_VERSION}`);
  }
  for (const k of keys) if (!(k in doc)) throw new DataError(`${label}: missing "${k}"`);
}

export function parseSummary(doc: unknown): Summary {
  checkSchema(doc, "summary.json", ["updated_at", "skus"]);
  return doc as Summary;
}

export function parseDetail(doc: unknown, sku: string): SkuDetail {
  checkSchema(doc, `${sku}.json`, ["updated_at", "last", "points", "versions", "quality"]);
  const d = doc as SkuDetail;
  if (d.points.length === 0) throw new DataError(`${sku}.json: no points`);
  return d;
}
