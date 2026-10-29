import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Use a throwaway index so tests never touch the demo data.
    env: {
      INDEX_NAME: "services_test",
    },
    // Integration tests talk to a real Elasticsearch, so give setup room.
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
