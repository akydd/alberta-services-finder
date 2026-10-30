# Alberta Services Finder

[![CI](https://github.com/akydd/alberta-services-finder/actions/workflows/ci.yml/badge.svg)](https://github.com/akydd/alberta-services-finder/actions/workflows/ci.yml)

A small full-stack search application that lets people find Government of Alberta
programs and services. It's a focused demo of **Elasticsearch** relevance
features behind an **Angular** single-page app and a **Node.js / TypeScript** API.

> **Portfolio / demo project.** The dataset is **synthetic sample data** written
> to exercise the search features — it is **not** official Government of Alberta
> data. Program names and links are real, but ministry assignments and dates are
> illustrative. See [Data](#data) below.

---

## What it demonstrates

| Capability | Where |
|---|---|
| Full-text relevance with field boosting (`multi_match`, `best_fields`) | `api/src/lib/search.ts` |
| Custom analyzers — folding, English stemming, **synonyms** | `data/index-settings.json` |
| **Typo tolerance** (`fuzziness: AUTO`) | `buildTextQuery()` |
| **Autocomplete / typeahead** (`search_as_you_type`) | `autocomplete()` + Angular dropdown |
| **Faceted filtering** with live counts that respect other filters | `buildAggregations()` |
| **Highlighting** of matched terms | `search()` + `app.component.ts` |
| Pagination, input validation (zod), typed API contract | `api/src/routes/search.ts` |
| **Integration tests** against a real Elasticsearch | `api/src/search.test.ts` |
| One-command Elasticsearch via Docker | `docker-compose.yml` |
| **CI** — Elasticsearch service, seed, tests, and Angular build on every push | `.github/workflows/ci.yml` |

## Architecture

```
┌──────────────┐     /api/*      ┌──────────────┐    _search    ┌───────────────┐
│  Angular SPA │ ───────────────▶│  Node + TS   │ ─────────────▶│ Elasticsearch │
│  (web, 4200) │   dev proxy     │  API (3000)  │   REST client │   (9200)      │
└──────────────┘                 └──────────────┘               └───────────────┘
```

## Prerequisites

- Docker + Docker Compose
- Node.js 20+ and npm

## Quick start

```bash
# 1. Start Elasticsearch
docker compose up -d

# 2. API: install, seed the index, run
cd api
npm install
npm run seed          # creates the index + loads data/services.json
npm run dev           # http://localhost:3000

# 3. Web: install and run (in a second terminal)
cd web
npm install
npm start             # http://localhost:4200
```

Open http://localhost:4200 and try `drivers licence`, `elderly benefits`
(synonym → seniors), `immunizaton` (typo), or `camping`.

## Tests

```bash
cd api
npm test              # integration tests; requires Elasticsearch running
```

The tests use a throwaway `services_test` index and skip automatically if
Elasticsearch is not reachable.

## API reference

### `GET /api/search`
| Param | Type | Notes |
|---|---|---|
| `q` | string | Free-text query (empty = all services) |
| `from`, `size` | int | Pagination (`size` ≤ 50) |
| `category`, `ministry`, `audience`, `deliveryChannel`, `cost` | string (repeatable) | Facet filters |

Returns `{ total, hits[], facets{} }` with per-hit highlights.

### `GET /api/autocomplete?q=`
Returns `{ suggestions: string[] }` of matching service titles.

### `GET /api/health`
Returns `{ status: "ok" }`.

## Project layout

```
.
├── docker-compose.yml        # single-node Elasticsearch
├── data/
│   ├── index-settings.json   # analyzers + mappings
│   └── services.json         # curated Alberta services dataset
├── api/                      # Node + TypeScript + Express API
│   └── src/
│       ├── lib/search.ts     # query, facets, highlighting, autocomplete
│       ├── lib/index-admin.ts# create index / bulk load
│       ├── routes/search.ts  # HTTP routes + validation
│       └── search.test.ts    # integration tests
└── web/                      # Angular SPA
    └── src/app/              # search UI (standalone components + signals)
```

## Roadmap

Ideas to deepen the search engineering, staying in this project's lane:

- **Relevance tuning** — `function_score` to boost more recently updated
  services; per-field analyzer refinements.
- **"Did you mean?"** — spelling suggestions (term/phrase suggester) on
  low-result queries.
- **Insights view** — an aggregations dashboard (services by ministry, category,
  cost) built from Elasticsearch aggregations.
- **Live ingest** — a loader that pulls records from the
  [Alberta open data portal](https://open.alberta.ca/) instead of the bundled
  sample (the index mapping and API are source-agnostic).

> This project is deliberately kept AI-feature-free so it can be a focused
> Elasticsearch + Angular showcase. It was, however, **built with AI-assisted
> development** — see [AI-DEVELOPMENT.md](AI-DEVELOPMENT.md).

## Data

`data/services.json` is a **synthetic, hand-authored sample** of ~39 Alberta
government services, created to demonstrate the search features. It is not
sourced from an official Government of Alberta dataset.

- **Program names** are real and broadly accurate.
- **URLs** are real and link-checked — all 39 resolve (verified). Most point to
  the specific `alberta.ca` service page; a few point to the closest official
  landing/topic page where no single dedicated page exists.
- **Ministry names, audiences, and `updated` dates** are illustrative and may be
  inaccurate or out of date (ministries are reorganized periodically).

To make the demo authoritative, replace this file with records exported from the
[Alberta open data portal](https://open.alberta.ca/) (the index mapping and API
are source-agnostic).

## Notes

- Elasticsearch security is disabled and the disk watermark is turned off in
  `docker-compose.yml` to keep the demo a single command. **Do not use this
  configuration in production.**
