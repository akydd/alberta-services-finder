import type {
  QueryDslQueryContainer,
  SearchRequest,
} from "@elastic/elasticsearch/lib/api/types";
import { es } from "./es";
import { config } from "../config";
import type {
  Facets,
  SearchHit,
  SearchParams,
  SearchResponse,
  Service,
} from "./types";

/** Keyword fields we expose as facets. Order controls display order in the UI. */
export const FACET_FIELDS = [
  "category",
  "ministry",
  "audience",
  "deliveryChannel",
  "cost",
] as const;

type FacetField = (typeof FACET_FIELDS)[number];

/**
 * Build the relevance query for the user's text.
 *
 * - An empty query matches everything (so the page can show all services).
 * - A non-empty query is a `multi_match` that searches several fields with
 *   different weights (title matters most), uses `best_fields` so the strongest
 *   single-field match wins, and tolerates typos via `fuzziness: AUTO`.
 */
function buildTextQuery(q: string): QueryDslQueryContainer {
  const trimmed = q.trim();
  if (!trimmed) return { match_all: {} };

  return {
    multi_match: {
      query: trimmed,
      type: "best_fields",
      fields: ["title^4", "tags^2", "description"],
      fuzziness: "AUTO",
      operator: "and",
    },
  };
}

/**
 * Turn the selected facet values into `terms` filters. Filters live in the
 * `filter` clause so they constrain results without affecting the relevance
 * score, which is the conventional way to do faceted search in Elasticsearch.
 */
function buildFilters(filters: Facets): QueryDslQueryContainer[] {
  const clauses: QueryDslQueryContainer[] = [];
  for (const field of FACET_FIELDS) {
    const values = filters[field];
    if (values && values.length > 0) {
      clauses.push({ terms: { [field]: values } });
    }
  }
  return clauses;
}

/**
 * Facet counts should reflect every filter EXCEPT the one being counted, so a
 * user can still see the other options available within a facet they have
 * already filtered on. We implement that with one global `terms` aggregation
 * per field, each wrapped in a `filter` aggregation that applies the text query
 * plus all filters other than that field's own.
 */
function buildAggregations(q: string, filters: Facets) {
  const textQuery = buildTextQuery(q);
  const aggs: Record<string, unknown> = {};

  for (const field of FACET_FIELDS) {
    const otherFilters = buildFilters({ ...filters, [field]: undefined });
    aggs[field] = {
      filter: {
        bool: { must: [textQuery], filter: otherFilters },
      },
      aggs: {
        values: { terms: { field, size: 50 } },
      },
    };
  }
  return aggs;
}

export async function search(params: SearchParams): Promise<SearchResponse> {
  const { q, filters, from, size } = params;

  const request: SearchRequest = {
    index: config.indexName,
    from,
    size,
    query: {
      bool: {
        must: [buildTextQuery(q)],
        filter: buildFilters(filters),
      },
    },
    highlight: {
      pre_tags: ["<mark>"],
      post_tags: ["</mark>"],
      fields: {
        title: { number_of_fragments: 0 },
        description: { fragment_size: 160, number_of_fragments: 1 },
      },
    },
    aggs: buildAggregations(q, filters),
  };

  const res = await es.search<Service>(request);

  const hits: SearchHit[] = res.hits.hits.map((h) => ({
    service: h._source as Service,
    score: h._score ?? null,
    highlights: (h.highlight as Record<string, string[]>) ?? {},
  }));

  const facets = {} as SearchResponse["facets"];
  for (const field of FACET_FIELDS) {
    const agg = res.aggregations?.[field] as
      | { values: { buckets: { key: string; doc_count: number }[] } }
      | undefined;
    facets[field] = (agg?.values.buckets ?? []).map((b) => ({
      value: b.key,
      count: b.doc_count,
    }));
  }

  const total =
    typeof res.hits.total === "number"
      ? res.hits.total
      : res.hits.total?.value ?? 0;

  return { total, hits, facets };
}

/**
 * Autocomplete over the `title.autocomplete` (search_as_you_type) field. This
 * powers the typeahead dropdown; it returns just the matching service titles.
 */
export async function autocomplete(prefix: string, size = 6): Promise<string[]> {
  const trimmed = prefix.trim();
  if (!trimmed) return [];

  const res = await es.search<Service>({
    index: config.indexName,
    size,
    _source: ["title"],
    query: {
      multi_match: {
        query: trimmed,
        type: "bool_prefix",
        fields: [
          "title.autocomplete",
          "title.autocomplete._2gram",
          "title.autocomplete._3gram",
        ],
      },
    },
  });

  return res.hits.hits.map((h) => (h._source as Service).title);
}
