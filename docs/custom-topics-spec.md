# Custom Topics with Dynamic RSS Feed Discovery

## Overview

Allow users to create custom topics (e.g., "Deschutes River Fly Fishing Report") that go beyond the predefined `TOPIC_CATALOG`. Claude discovers relevant RSS feeds at creation time, and those feeds are fetched alongside web search results during content ingestion.

**Approach:** Claude-assisted feed discovery at topic creation time, with feeds stored in a shared pool.

---

## 1. Database Schema

### New Tables

#### `feed_pool` — shared global pool of discovered RSS feeds

```sql
create table feed_pool (
  id uuid primary key default gen_random_uuid(),
  url text unique not null,
  name text not null,
  tier int not null default 3 check (tier in (1, 2, 3)),
  categories text[] default '{}',
  last_validated_at timestamptz default now(),
  is_valid boolean default true,
  created_at timestamptz default now()
);
```

#### `custom_topics` — user-created topics

```sql
create table custom_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  label text not null,
  parent_category text not null,
  search_terms text[] default '{}',
  created_at timestamptz default now(),
  unique(user_id, label)
);
```

#### `topic_feeds` — links custom topics to feeds from the pool

```sql
create table topic_feeds (
  id uuid primary key default gen_random_uuid(),
  custom_topic_id uuid references custom_topics(id) on delete cascade,
  feed_id uuid references feed_pool(id) on delete cascade,
  relevance_score float default 0.5,
  created_at timestamptz default now(),
  unique(custom_topic_id, feed_id)
);
```

### Modified Tables

#### `user_topics` — add nullable FK to custom_topics

```sql
alter table user_topics
  add column custom_topic_id uuid references custom_topics(id) on delete set null;
```

When `custom_topic_id` is set, this user_topic represents a custom topic. The existing `topic_id` column is set to the `parent_category` value for grouping/display purposes.

---

## 2. Topic Catalog Changes

Add a `CATEGORY_OPTIONS` constant to `src/lib/constants.ts` alongside the existing `TOPIC_CATALOG`:

```ts
export const CATEGORY_OPTIONS = [
  { id: 'sports', label: 'Sports', examples: 'e.g., Deschutes River fishing report, local pickleball league' },
  { id: 'news', label: 'News & Politics', examples: 'e.g., Portland city council, Oregon ballot measures' },
  { id: 'tech', label: 'Technology', examples: 'e.g., self-hosted Kubernetes, Rust async runtime updates' },
  { id: 'entertainment', label: 'Entertainment', examples: 'e.g., Portland indie music scene, local theater reviews' },
  { id: 'business', label: 'Business & Finance', examples: 'e.g., Portland real estate market, Oregon craft beer industry' },
  { id: 'science', label: 'Science & Health', examples: 'e.g., Mt. Hood glacier research, Oregon wildfire air quality' },
  { id: 'creative', label: 'Lifestyle & Creative', examples: 'e.g., Portland food trucks, Oregon hiking trail conditions' },
  { id: 'travel', label: 'Travel', examples: 'e.g., Oregon coast road trips, Pacific Crest Trail updates' },
] as const
```

Category IDs intentionally match existing `TOPIC_CATALOG` IDs so custom topics integrate with existing topic grouping.

The onboarding flow is unchanged. Custom topic creation is a separate flow accessible from the dashboard.

---

## 3. Custom Topic Creation Flow

### UI Flow

1. User clicks **"Add Custom Topic"** button on the dashboard (in `src/components/views/Dashboard.tsx`)
2. A modal appears (`src/components/views/CustomTopicCreator.tsx`) with:
   - **Text input**: "Describe what you want to follow" (free-form)
   - **Category picker**: Dropdown/chips from `CATEGORY_OPTIONS`
   - **"Find Sources" button**
3. On submit, call a Vercel API route that:
   - Sends the description + category to Claude
   - Claude returns: `label`, `searchTerms[]`, and `feeds[]` with relevance scores
   - Validates each suggested feed URL (fetches and checks for valid RSS/Atom)
4. Show a **confirmation screen**:
   - Generated label (editable)
   - List of validated feeds with relevance scores and checkboxes
   - **"Create Topic" button**
5. On confirm, call a second API route that:
   - Inserts into `custom_topics`
   - Upserts feeds into `feed_pool`
   - Inserts into `topic_feeds`
   - Inserts into `user_topics` with `custom_topic_id` set

### Claude Prompt (for feed discovery)

```
Given the user wants to follow: "${description}"
Category: ${categoryLabel}

Return a JSON object with:
{
  "label": "concise topic label (2-6 words)",
  "searchTerms": ["term1", "term2", "term3"],
  "feeds": [
    { "url": "https://...", "name": "Feed Name", "relevanceScore": 0.9 },
    ...
  ]
}

- Generate 3-5 search terms for web search supplementation
- Suggest 5-15 RSS feed URLs likely to have relevant content
- Only suggest real, well-known RSS feeds — do not fabricate URLs
- relevanceScore: 0.0 (tangential) to 1.0 (directly on-topic)
```

### Feed Validation

After Claude suggests feeds, each URL is fetched server-side and checked:
- Must return HTTP 200
- Must contain valid RSS 2.0 (`<item>`) or Atom (`<entry>`) elements
- Invalid feeds are filtered out before showing the confirmation screen
- Uses the existing `parseRssFeed()` from `api/lib/rss-parser.ts`

---

## 4. Feed Fetching & Content Pipeline

### Integration with existing ingestion

The existing `api/cron/ingest-content.ts` iterates over `TOPIC_META` keys and ingests content for each. We extend this to also handle custom topics.

**Changes to `api/cron/ingest-content.ts`:**

After ingesting catalog topics, query for all `custom_topics` that have at least one `user_topics` row pointing to them. For each:

1. Fetch linked feeds from `topic_feeds` → `feed_pool`
2. Parse each valid feed using the existing `parseRssFeed()` and `fetchRssForTopic()` pattern
3. Run web search using the topic's `search_terms` (same `fetchTopicContentViaWebSearch()` pattern)
4. Merge via `mergeRssAndWebSearch()`
5. Store in `topic_content` with `topic_id = 'custom:' + custom_topic.id`

**New function in `api/lib/rss-fetcher.ts`:**

```ts
export async function fetchRssForCustomTopic(feedUrls: { url: string; name: string; tier: number }[]): Promise<FetchedRssContent | null>
```

Same logic as `fetchRssForTopic()` but accepts an explicit feed list instead of looking up from `FEED_REGISTRY`.

### Feed Health

- On each fetch, update `feed_pool.last_validated_at` for successful feeds
- If a feed fails 3 consecutive fetches, set `is_valid = false`
- Invalid feeds are skipped but not deleted (may recover)

---

## 5. API Routes

New Vercel API routes in `api/`:

### `api/custom-topics/analyze.ts`

**POST** — Analyze a user's topic description and discover feeds

- **Input**: `{ description: string, categoryId: string }`
- **Auth**: Requires valid Supabase auth token
- **Process**:
  1. Call Claude with the discovery prompt
  2. Validate each suggested feed URL
  3. Return `{ label, searchTerms, feeds: { url, name, relevanceScore, isValid }[] }`

### `api/custom-topics/create.ts`

**POST** — Create a custom topic with selected feeds

- **Input**: `{ label: string, categoryId: string, searchTerms: string[], feeds: { url: string, name: string, relevanceScore: number }[] }`
- **Auth**: Requires valid Supabase auth token
- **Process**:
  1. Insert into `custom_topics`
  2. Upsert each feed into `feed_pool`
  3. Insert into `topic_feeds`
  4. Insert into `user_topics` with `custom_topic_id`
  5. Return the created custom topic

### `api/custom-topics/delete.ts`

**DELETE** — Remove a custom topic

- **Input**: `{ customTopicId: string }`
- **Auth**: Requires valid Supabase auth token
- **Process**:
  1. Delete from `user_topics` where `custom_topic_id` matches
  2. Delete from `topic_feeds` (cascades from `custom_topics`)
  3. Delete from `custom_topics`
  4. Does NOT remove from `feed_pool` (shared/reusable)

---

## 6. Frontend Components

### New Files

#### `src/components/views/CustomTopicCreator.tsx`

Modal component with two states:

**State 1 — Input:**
- Text input for topic description
- Category picker (chips or dropdown from `CATEGORY_OPTIONS`)
- "Find Sources" button → calls `api/custom-topics/analyze.ts`
- Loading state while Claude analyzes

**State 2 — Confirmation:**
- Editable label field
- Feed list with checkboxes and relevance scores (sorted by relevance)
- Feed count badge
- "Create Topic" / "Cancel" buttons
- Calls `api/custom-topics/create.ts` on confirm

### Modified Files

#### `src/components/views/Dashboard.tsx`

- Add "Add Custom Topic" button
- Render custom topics in the topic list (distinguished with a visual indicator)

#### `src/components/views/Topics.tsx`

- Display custom topics alongside catalog topics
- Show delete option for custom topics

### New Hook

#### `src/hooks/useCustomTopics.ts`

- `analyzeCustomTopic(description, categoryId)` — calls analyze endpoint
- `createCustomTopic(...)` — calls create endpoint
- `deleteCustomTopic(customTopicId)` — calls delete endpoint
- `customTopics` — list of user's custom topics (fetched from Supabase)

---

## 7. File Changes Summary

### New Files
| File | Purpose |
|------|---------|
| `supabase/migrations/013_custom_topics.sql` | Migration for `feed_pool`, `custom_topics`, `topic_feeds` tables + `user_topics` column |
| `api/custom-topics/analyze.ts` | Feed discovery API route |
| `api/custom-topics/create.ts` | Topic creation API route |
| `api/custom-topics/delete.ts` | Topic deletion API route |
| `src/components/views/CustomTopicCreator.tsx` | Creation flow UI |
| `src/hooks/useCustomTopics.ts` | Custom topics hook |

### Modified Files
| File | Change |
|------|--------|
| `src/lib/constants.ts` | Add `CATEGORY_OPTIONS` |
| `api/lib/rss-fetcher.ts` | Add `fetchRssForCustomTopic()` function |
| `api/cron/ingest-content.ts` | Extend to ingest custom topic content |
| `src/components/views/Dashboard.tsx` | Add "Add Custom Topic" button, render custom topics |
| `src/components/views/Topics.tsx` | Display and manage custom topics |

### New Dependencies
| Package | Purpose |
|---------|---------|
| None | Existing `rss-parser.ts` handles RSS/Atom parsing without external deps |

### Unchanged
- Onboarding flow
- Auth system
- Existing catalog topics behavior
- Episode generation (consumes `topic_content` as before)
- Cron scheduling
