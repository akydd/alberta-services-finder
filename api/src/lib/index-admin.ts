import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { es } from "./es";
import { config } from "../config";
import type { Service } from "./types";

/** Repo paths to the shared data files (one source of truth for both seed + tests). */
const DATA_DIR = resolve(__dirname, "../../../data");
const SETTINGS_PATH = resolve(DATA_DIR, "index-settings.json");
const SERVICES_PATH = resolve(DATA_DIR, "services.json");

export function loadIndexSettings(): Record<string, unknown> {
  return JSON.parse(readFileSync(SETTINGS_PATH, "utf8"));
}

export function loadServices(): Service[] {
  return JSON.parse(readFileSync(SERVICES_PATH, "utf8"));
}

/** Drop the index if it exists, then recreate it from index-settings.json. */
export async function recreateIndex(index = config.indexName): Promise<void> {
  const exists = await es.indices.exists({ index });
  if (exists) {
    await es.indices.delete({ index });
  }
  const body = loadIndexSettings();
  await es.indices.create({ index, ...body });
}

/** Bulk-index the given services and wait until they are searchable. */
export async function bulkLoad(
  services: Service[],
  index = config.indexName
): Promise<void> {
  if (services.length === 0) return;

  const operations = services.flatMap((svc) => [
    { index: { _index: index, _id: svc.id } },
    svc,
  ]);

  const res = await es.bulk({ refresh: true, operations });
  if (res.errors) {
    const firstError = res.items.find((i) => i.index?.error)?.index?.error;
    throw new Error(
      `Bulk indexing failed: ${JSON.stringify(firstError ?? "unknown error")}`
    );
  }
}
