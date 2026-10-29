/**
 * Seed script: (re)creates the Elasticsearch index and loads the curated
 * Alberta services dataset. Run with `npm run seed` after Elasticsearch is up.
 */
import { config } from "./config";
import { es } from "./lib/es";
import { recreateIndex, bulkLoad, loadServices } from "./lib/index-admin";

async function main() {
  console.log(`Connecting to Elasticsearch at ${config.elasticsearchUrl} ...`);
  await es.cluster.health({ wait_for_status: "yellow", timeout: "30s" });

  console.log(`Recreating index "${config.indexName}" ...`);
  await recreateIndex();

  const services = loadServices();
  console.log(`Indexing ${services.length} services ...`);
  await bulkLoad(services);

  const count = await es.count({ index: config.indexName });
  console.log(`Done. Index "${config.indexName}" now holds ${count.count} documents.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seeding failed:", err?.message ?? err);
    process.exit(1);
  });
