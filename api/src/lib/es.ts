import { Client } from "@elastic/elasticsearch";
import { config } from "../config";

/**
 * A single shared Elasticsearch client for the whole API process.
 * The client pools connections, so we never want to create more than one.
 */
export const es = new Client({ node: config.elasticsearchUrl });
