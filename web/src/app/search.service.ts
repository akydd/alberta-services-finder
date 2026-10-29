import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  FacetField,
  SearchResponse,
  SelectedFacets,
} from './models';

const FACET_FIELDS: FacetField[] = [
  'category',
  'ministry',
  'audience',
  'deliveryChannel',
  'cost',
];

@Injectable({ providedIn: 'root' })
export class SearchService {
  private http = inject(HttpClient);

  search(
    q: string,
    facets: SelectedFacets,
    from = 0,
    size = 10
  ): Observable<SearchResponse> {
    let params = new HttpParams()
      .set('q', q)
      .set('from', from)
      .set('size', size);

    for (const field of FACET_FIELDS) {
      const values = facets[field];
      if (values) {
        for (const value of values) {
          params = params.append(field, value);
        }
      }
    }

    return this.http.get<SearchResponse>('/api/search', { params });
  }

  autocomplete(q: string): Observable<{ suggestions: string[] }> {
    const params = new HttpParams().set('q', q);
    return this.http.get<{ suggestions: string[] }>('/api/autocomplete', {
      params,
    });
  }
}
