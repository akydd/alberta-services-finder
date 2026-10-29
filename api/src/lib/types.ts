/** A single government service document, as stored in Elasticsearch. */
export interface Service {
  id: string;
  title: string;
  description: string;
  category: string;
  ministry: string;
  audience: string[];
  tags: string[];
  deliveryChannel: string;
  cost: string;
  url: string;
  updated: string;
}

/** The facets a caller can filter on. Keys map to keyword fields in the index. */
export interface Facets {
  category?: string[];
  ministry?: string[];
  audience?: string[];
  deliveryChannel?: string[];
  cost?: string[];
}

export interface SearchParams {
  q: string;
  filters: Facets;
  from: number;
  size: number;
}

/** One bucket in a facet, with the count of matching documents. */
export interface FacetBucket {
  value: string;
  count: number;
}

export interface SearchHit {
  service: Service;
  score: number | null;
  /** Highlighted snippets keyed by field name, e.g. { description: ["...<em>senior</em>..."] }. */
  highlights: Record<string, string[]>;
}

export interface SearchResponse {
  total: number;
  hits: SearchHit[];
  facets: Record<keyof Facets, FacetBucket[]>;
}
