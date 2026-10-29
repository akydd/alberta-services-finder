import { createApp } from "./app";
import { config } from "./config";

const app = createApp();

app.listen(config.port, () => {
  console.log(`Alberta Services Finder API listening on http://localhost:${config.port}`);
  console.log(`Elasticsearch: ${config.elasticsearchUrl}  ·  index: ${config.indexName}`);
});
