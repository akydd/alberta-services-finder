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

export interface SearchHit {
  service: Service;
  score: number | null;
  highlights: Record<string, string[]>;
}

export interface FacetBucket {
  value: string;
  count: number;
}

export type FacetField =
  | 'category'
  | 'ministry'
  | 'audience'
  | 'deliveryChannel'
  | 'cost';

export interface SearchResponse {
  total: number;
  hits: SearchHit[];
  facets: Record<FacetField, FacetBucket[]>;
}

export type SelectedFacets = Partial<Record<FacetField, Set<string>>>;
