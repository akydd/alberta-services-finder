import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { SearchService } from './search.service';
import {
  FacetBucket,
  FacetField,
  SearchResponse,
  SelectedFacets,
} from './models';

interface FacetGroup {
  field: FacetField;
  label: string;
}

const PAGE_SIZE = 8;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  private searchService = inject(SearchService);

  readonly facetGroups: FacetGroup[] = [
    { field: 'category', label: 'Category' },
    { field: 'ministry', label: 'Ministry' },
    { field: 'audience', label: 'Who it is for' },
    { field: 'deliveryChannel', label: 'How to access' },
    { field: 'cost', label: 'Cost' },
  ];

  query = signal('');
  results = signal<SearchResponse | null>(null);
  loading = signal(false);
  page = signal(0);
  selected = signal<SelectedFacets>({});

  suggestions = signal<string[]>([]);
  showSuggestions = signal(false);

  readonly totalPages = computed(() => {
    const total = this.results()?.total ?? 0;
    return Math.max(1, Math.ceil(total / PAGE_SIZE));
  });

  readonly activeFilterCount = computed(() => {
    const sel = this.selected();
    return Object.values(sel).reduce((n, set) => n + (set?.size ?? 0), 0);
  });

  private query$ = new Subject<string>();
  private suggest$ = new Subject<string>();

  ngOnInit(): void {
    // Debounce typing before firing a full search.
    this.query$
      .pipe(debounceTime(250), distinctUntilChanged())
      .subscribe(() => {
        this.page.set(0);
        this.runSearch();
      });

    // Separate, lighter debounce for the typeahead dropdown.
    this.suggest$
      .pipe(
        debounceTime(120),
        distinctUntilChanged(),
        switchMap((q) => this.searchService.autocomplete(q))
      )
      .subscribe((res) => this.suggestions.set(res.suggestions));

    this.runSearch();
  }

  onInput(value: string): void {
    this.query.set(value);
    this.query$.next(value);
    if (value.trim()) {
      this.suggest$.next(value);
      this.showSuggestions.set(true);
    } else {
      this.suggestions.set([]);
      this.showSuggestions.set(false);
    }
  }

  pickSuggestion(s: string): void {
    this.query.set(s);
    this.showSuggestions.set(false);
    this.page.set(0);
    this.runSearch();
  }

  isChecked(field: FacetField, value: string): boolean {
    return this.selected()[field]?.has(value) ?? false;
  }

  toggleFacet(field: FacetField, value: string): void {
    const next: SelectedFacets = {};
    const current = this.selected();
    // Clone existing sets.
    for (const key of Object.keys(current) as FacetField[]) {
      next[key] = new Set(current[key]);
    }
    const set = next[field] ?? new Set<string>();
    if (set.has(value)) {
      set.delete(value);
    } else {
      set.add(value);
    }
    if (set.size === 0) {
      delete next[field];
    } else {
      next[field] = set;
    }
    this.selected.set(next);
    this.page.set(0);
    this.runSearch();
  }

  clearFilters(): void {
    this.selected.set({});
    this.page.set(0);
    this.runSearch();
  }

  goToPage(p: number): void {
    if (p < 0 || p >= this.totalPages()) return;
    this.page.set(p);
    this.runSearch();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private runSearch(): void {
    this.loading.set(true);
    this.searchService
      .search(this.query(), this.selected(), this.page() * PAGE_SIZE, PAGE_SIZE)
      .subscribe({
        next: (res) => {
          this.results.set(res);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  /** Prefer a highlighted title snippet; fall back to the plain title. */
  titleHtml(hit: SearchResponse['hits'][number]): string {
    return hit.highlights['title']?.[0] ?? this.escape(hit.service.title);
  }

  /** Prefer a highlighted description snippet; fall back to a truncated one. */
  descriptionHtml(hit: SearchResponse['hits'][number]): string {
    const snippet = hit.highlights['description']?.[0];
    if (snippet) return snippet;
    const text = hit.service.description;
    return this.escape(text.length > 180 ? text.slice(0, 180) + '…' : text);
  }

  facetBuckets(field: FacetField): FacetBucket[] {
    return this.results()?.facets[field] ?? [];
  }

  private escape(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
