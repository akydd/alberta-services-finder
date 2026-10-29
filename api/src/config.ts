import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 3000),
  elasticsearchUrl: process.env.ELASTICSEARCH_URL ?? "http://localhost:9200",
  indexName: process.env.INDEX_NAME ?? "services",
};
