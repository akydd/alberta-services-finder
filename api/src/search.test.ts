import { beforeAll, afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "./app";
import { es } from "./lib/es";
import { config } from "./config";
import { recreateIndex, bulkLoad, loadServices } from "./lib/index-admin";

const app = createApp();

/** Only run these integration tests when a real Elasticsearch is reachable. */
async function esReachable(): Promise<boolean> {
  try {
    await es.ping();
    return true;
  } catch {
    return false;
  }
}

const describeIntegration = (await esReachable()) ? describe : describe.skip;

describeIntegration("search API (integration)", () => {
  beforeAll(async () => {
    await recreateIndex();
    await bulkLoad(loadServices());
  });

  afterAll(async () => {
    await es.indices.delete({ index: config.indexName }, { ignore: [404] });
  });

  it("health check responds", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("empty query returns all services with facets", async () => {
    const res = await request(app).get("/api/search");
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThan(30);
    expect(res.body.facets.category.length).toBeGreaterThan(1);
  });

  it("full-text search finds relevant services and ranks title matches first", async () => {
    const res = await request(app).get("/api/search").query({ q: "driver licence" });
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThan(0);
    expect(res.body.hits[0].service.id).toBe("drivers-licence");
  });

  it("tolerates typos via fuzzy matching", async () => {
    const res = await request(app).get("/api/search").query({ q: "immunizaton" });
    expect(res.body.hits.some((h: any) => h.service.id === "immunization")).toBe(true);
  });

  it("expands synonyms (senior -> elderly/older adult)", async () => {
    const res = await request(app).get("/api/search").query({ q: "elderly benefit" });
    expect(res.body.hits.some((h: any) => h.service.id === "seniors-benefit")).toBe(true);
  });

  it("applies facet filters", async () => {
    const res = await request(app)
      .get("/api/search")
      .query({ category: "Health" });
    expect(res.body.total).toBeGreaterThan(0);
    for (const hit of res.body.hits) {
      expect(hit.service.category).toBe("Health");
    }
  });

  it("returns highlighted snippets", async () => {
    const res = await request(app).get("/api/search").query({ q: "camping" });
    const hit = res.body.hits[0];
    const snippets = Object.values(hit.highlights).flat() as string[];
    expect(snippets.some((s) => s.includes("<mark>"))).toBe(true);
  });

  it("autocomplete returns prefix matches", async () => {
    const res = await request(app).get("/api/autocomplete").query({ q: "veh" });
    expect(res.status).toBe(200);
    expect(res.body.suggestions).toContain("Vehicle Registration");
  });

  it("rejects an out-of-range page size", async () => {
    const res = await request(app).get("/api/search").query({ size: 999 });
    expect(res.status).toBe(400);
  });
});
