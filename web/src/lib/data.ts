// Build-time access to the JSON in public/data (written by scripts/export_site_data.py).
// Runs in Node during `astro build` only.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DataError, parseDetail, parseSummary } from "./types";
import type { SkuDetail, Summary } from "./types";

const DATA_DIR = join(process.cwd(), "public", "data");
const IMAGE_DIR = join(process.cwd(), "public", "images");

function readJson(name: string): unknown {
  const path = join(DATA_DIR, name);
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err: unknown) {
    const why = err instanceof Error ? err.message : String(err);
    throw new DataError(
      `cannot read ${path} (${why}). Run: python scripts/export_site_data.py`,
    );
  }
}

export const loadSummary = (): Summary => parseSummary(readJson("summary.json"));

export const loadDetail = (sku: string): SkuDetail =>
  parseDetail(readJson(`${sku.toLowerCase()}.json`), sku);

/** Site-relative path of a GPU's thumbnail (public/images/<sku>.jpg), or null if there isn't one. */
export function skuImage(sku: string): string | null {
  const file = `${sku.toLowerCase()}.jpg`;
  return existsSync(join(IMAGE_DIR, file)) ? `images/${file}` : null;
}
