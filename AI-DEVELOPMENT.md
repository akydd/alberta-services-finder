# AI-Assisted Development

I built this project using **AI-assisted development**, with Claude Code acting
as a co-developer. This note records how I used AI and the practices I used to
keep the result correct and reviewable — the kind of "AI as a co-developer"
discipline I'd bring to a modern delivery team.

## How I used AI

- **Direction and design decisions stayed with me.** I set the goal, chose the
  stack (Angular + Node/TypeScript + Elasticsearch), and made the scope call to
  ship keyword search first and add the AI/semantic layer as a second phase. AI
  accelerated the work; it didn't decide the architecture.
- **Scaffolding and boilerplate.** Project structure, the Docker Compose setup,
  the Angular shell, and repetitive TypeScript types were AI-generated, then
  read and adjusted.
- **Elasticsearch query design.** I used AI to draft the `multi_match` relevance
  query, facet aggregations, the analyzer/synonym configuration, and the
  autocomplete mapping, then checked each against the Elasticsearch docs and
  confirmed the behaviour with tests.
- **Tests alongside features.** Integration tests were written as the features
  came together and run against a real Elasticsearch instance.

## Practices that kept it responsible

- **I reviewed every change.** AI output was read and understood before it stayed
  in the codebase — especially the query logic and index mapping, since those
  drive result quality.
- **Tests as the source of truth.** The behaviour claims in the README (ranking,
  fuzziness, synonyms, facets, highlighting, autocomplete) are each backed by a
  passing integration test, not assumed from a prompt.
- **No secrets in the repo or sent to the model.** Configuration uses env vars
  with safe local defaults; there are no credentials in the codebase.
- **Demo shortcuts are isolated and labelled.** Security-relevant conveniences
  (disabled Elasticsearch auth, disabled disk watermark) live only in
  `docker-compose.yml` and are explicitly marked demo-only, not production.

## Phase 2: AI *features* (planned)

The next phase adds AI-powered functionality, which brings its own
responsible-AI concerns to design for up front:

- **Grounded answers only.** The planned natural-language "ask" feature will
  retrieve from the indexed services and answer *from* that content, with
  **cited sources**, rather than free-form generation — to reduce hallucination
  risk.
- **Graceful "I don't know".** When retrieval finds nothing relevant, the feature
  should say so rather than invent an answer.
- **Testing the AI path.** The retrieval/answer endpoint will have automated
  tests covering retrieval quality and the no-answer case, consistent with
  testing AI-enabled functionality for reliability.
