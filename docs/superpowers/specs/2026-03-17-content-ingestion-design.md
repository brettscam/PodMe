# Content Ingestion Layer — Design Spec

**Date:** 2026-03-17
**Status:** Approved

## Problem

The `topic_content` table is empty. The `build-episode` endpoint always falls through to hardcoded `FALLBACK_SCRIPTS`. Episodes contain stale, fabricated content instead of real news.

## Solution

Embed content ingestion directly into `build-episode`. When no `topic_content` row exists for a topic on today's date, fetch live content via the Anthropic API with `web_search` tool, then upsert the result. All subsequent requests that day get cache hits.

## Architecture

### Flow per topic segment

```
build-episode receives topic_id
  → SELECT from topic_content WHERE (topic_id, today)
  → MISS:
      → fetchTopicContent(topic_id, label, subs)
        → Anthropic API call (claude-haiku-4-5-20251001 + web_search tool)
        → Claude searches web, returns structured JSON
        → Parse: { title, claims[], sources[] }
        → content_hash = SHA-256(topic_id + fetch_date + sorted claims)
        → UPSERT into topic_content
      → Continue to script generation
  → HIT:
      → Continue to script generation (existing logic)
```

### `fetchTopicContent(topicId, label, subs)`

Single Anthropic API call:

- **Model:** `claude-haiku-4-5-20251001`
- **Tool:** `web_search` (Anthropic built-in server tool)
- **Max tokens:** 2048
- **Prompt:** Instructs Claude to search for latest news on {label}, focusing on subtopics {subs}, and return structured JSON with:
  - `title`: headline summary for the segment
  - `claims`: array of 3-6 factual claims with attribution
  - `sources`: array of `{ outlet, domain, tier, title, url, published_at, cited_claims[] }`
- **Output parsing:** Parse JSON from Claude's response. Validate required fields exist. If parsing fails or fields are missing, return `null` (triggers fallback).
- **Local topics:** Use the specific label from `FALLBACK_SCRIPTS` title (e.g. "Bay Area & Marin") rather than the generic `TOPIC_CATALOG` label ("Local News") for better search relevance.

### `hashContent(topicId, fetchDate, claims)`

`SHA-256(topicId + fetchDate + JSON.stringify(claims.sort()))` — deterministic hash so identical content produces the same hash. The existing `generated_scripts` cache (keyed by `content_hash + tone + length`) works automatically.

### Topic metadata

The search prompt needs topic labels and subtopics. These come from `TOPIC_CATALOG` in `constants.ts`. Since the API endpoint runs server-side and cannot import Lucide icons, we need a plain data mapping:

```ts
const TOPIC_META: Record<string, { label: string; subs: string[] }>
```

This is derived from the existing `TOPIC_CATALOG` but without icon/color fields.

### Concurrency and UPSERT

Use Supabase `.upsert()` with `onConflict: 'topic_id,fetch_date'`. If two users trigger ingestion for the same topic simultaneously, the second write overwrites with identical content — no error, just a wasted API call. Acceptable at this scale.

### Parallel fetch

Fetch content for all missing topics in parallel via `Promise.allSettled`. Each topic that fails falls back independently. This keeps total latency under the Vercel 120s timeout even with 10 topics.

### Error handling

If `fetchTopicContent` fails (network error, API error, malformed response):
- Return `null`
- `build-episode` falls through to `FALLBACK_SCRIPTS` (existing behavior)
- Log the error server-side
- No user-facing error — the episode still generates

### Database access

All INSERT/UPSERT operations use `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS. The migration only defines SELECT policies for authenticated users. This is intentional — content writes are server-only.

### Source tier assignment

Claude assigns tiers based on outlet reputation:
- **Tier 1:** Wire services, papers of record (AP, Reuters, NYT, WSJ, FT)
- **Tier 2:** Major outlets (Bloomberg, BBC, CNN, TechCrunch, Verge)
- **Tier 3:** Niche/trade press, blogs, local outlets
- **Tier 4:** Unverified or unknown sources

The prompt includes this rubric so Claude assigns tiers consistently.

## Files changed

### `api/build-episode.ts` (modify)

1. Add `TOPIC_META` constant (label + subs per topic, no icons)
2. Add `hashContent()` function
3. Add `fetchTopicContent()` function
4. Modify per-topic loop: before checking `generated_scripts`, check/populate `topic_content`

### No other files change

No new endpoints, hooks, components, or migrations.

## Cost model

- ~10 topics per episode
- 1 Haiku + web_search call per topic miss per day
- Content shared across all users (same `topic_content` row)
- After first user triggers ingestion, all others get cache hits
- Estimated daily cost: < $0.10 for 10 topics

### Observability

Add `content_fetches` to the response `cache_stats`:

```ts
cache_stats: {
  hits: number       // script cache hits
  misses: number     // script cache misses (LLM generated)
  fallbacks: number  // used hardcoded templates
  content_fetches: number  // web searches triggered this request
}
```

## Constraints

- Anthropic `web_search` tool requires `anthropic-version: 2023-06-01` header (already set)
- Web search results vary by time — content hash ensures same-day consistency
- No cron needed — ingestion is lazy/on-demand
- `today` is UTC (`new Date().toISOString().split('T')[0]`) — content rolls over at midnight UTC
- Only topics present in `FALLBACK_SCRIPTS` are supported; unknown topic IDs are skipped (existing behavior at line 178)
