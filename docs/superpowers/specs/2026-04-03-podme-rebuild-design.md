# PodMe Rebuild Design Spec

## Overview

PodMe is a personalized AI podcast generator. Users toggle topics on/off, add custom tags, and set preferences. The system fetches RSS feeds, uses multiple Claude agents to build stories, fills gaps with web search, rewrites everything as a dual-host podcast script, generates audio with open-source TTS, and delivers a playable episode. Users can replay past episodes from a historical library.

## Architecture

**Monolith on Vercel.** Single repo, React/Vite frontend, Vercel serverless API routes, Supabase for auth + database + file storage.

- **Frontend:** React 19, Vite, Tailwind CSS
- **Backend:** Vercel serverless functions (Node.js)
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth (email/password, OAuth)
- **Storage:** Supabase Storage (audio files)
- **AI:** Anthropic Claude API (multi-agent pipeline)
- **TTS:** Piper TTS via Replicate (open source model, hosted on Replicate for reliability)
- **Audio player:** Custom HTML5 Audio element with React UI
- **Podcast format:** Two equal co-hosts with distinct personalities

### TTS Strategy

Piper TTS is the open-source voice engine. Rather than bundling the binary into Vercel (unreliable due to native dependencies, cold starts, and model file sizes), we host Piper on Replicate where the model runs on GPU infrastructure. This gives us:
- No binary size constraints
- No cold start issues for TTS
- Pay-per-use pricing
- Easy model swapping

If Replicate is unavailable, fall back to a transcript-only episode (no audio).

### Async Pipeline Architecture

The generation pipeline takes minutes (RSS fetching, 3+ Claude calls, TTS for every speaker turn). This exceeds Vercel's 60-second function timeout. The pipeline is split into stages with status polling:

1. **`POST /api/generate`** — Creates an episode record with `status: "generating"`, kicks off Stage 1 (Gather) and Stage 2 (Story Build). Stores intermediate results in the `episodes.metadata` JSONB column. Returns the episode ID immediately.
2. **`POST /api/generate/script`** — Called by the client once Stage 2 completes. Takes the curated stories from `episodes.metadata` and runs Stage 3 (Script Write). Saves transcript.
3. **`POST /api/generate/audio`** — Called by the client once Stage 3 completes. Takes the script and runs Stage 4 (Voice). Saves audio URL.
4. **`GET /api/generate/status/[id]`** — Client polls this to check which stage is complete and whether the next stage can begin.

The frontend polls `/api/generate/status/[id]` every 3 seconds and triggers the next stage when the current one completes. Each individual stage stays within Vercel's timeout. Client-side total timeout of 5 minutes — if the pipeline hasn't reached "ready" or "failed" by then, the UI shows an error with a retry option.

## Data Model

### Migration Plan

The existing database has tables: `profiles`, `user_topics`, `episodes`, `episode_segments`, `topic_content`, `generated_scripts`, and others. This rebuild replaces all of them:

- **Drop:** `episode_segments`, `topic_content`, `generated_scripts` (from migration 007), `shared_episodes` (sharing feature removed for now)
- **Alter:** `profiles` (remove podcast preference columns, keep identity columns)
- **Create:** `topics`, `topic_feeds`, `user_preferences`, `episode_sources`
- **Alter:** `user_topics` (drop `weight`, `pinned`, `voice_override`; add `enabled` column — default `true` for existing rows since their presence means user selected them, then alter default to `false` for future inserts; keep `custom_tags`)
- **Alter:** `episodes` (drop CHECK constraint on `status`, add new CHECK with expanded values `('pending', 'gathering', 'building', 'scripting', 'voicing', 'ready', 'failed')`; drop `cadence`, `tone`, `estimated_minutes`, `show_notes`, `share_token`, `share_enabled`; add `stage_progress`, `metadata`, `error_message`)

A single migration file handles this. Existing episode data is preserved but old columns are dropped.

### Vercel Plan & Timeouts

The project is on **Vercel Pro** (existing config uses `maxDuration: 300`). The generate routes will be configured with `maxDuration: 120` each. Since the pipeline is split across multiple API calls, each stage has ample time:
- Stage 1+2 (gather + story build): ~60-90s typical
- Stage 3 (script write): ~20-30s typical
- Stage 4 (TTS): ~30-90s depending on episode length

### Seed Data

The `topics` and `topic_feeds` tables are populated by a seed migration that inserts the topic catalog and all RSS feed URLs. This runs as part of the migration, not at runtime.

### `topics`
Master topic catalog. Seeded by migration.

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | e.g. "tech", "sports", "world" |
| label | text | Display name |
| icon | text | Lucide icon name |
| color | text | Hex color for UI |

### `topic_feeds`
RSS feeds linked to topics. Seeded by migration.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| topic_id | text FK -> topics | |
| url | text | RSS feed URL |
| name | text | Feed display name |
| tier | int | 1 (premium), 2 (standard), 3 (niche) |

### `profiles`
Auth-linked user record. Created on signup via Supabase trigger.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK FK -> auth.users | |
| display_name | text | |
| timezone | text | IANA timezone, default 'America/Los_Angeles' |
| created_at | timestamptz | |

### `user_preferences`
General podcast preferences. Created with defaults on signup.

| Column | Type | Notes |
|--------|------|-------|
| user_id | uuid PK FK -> profiles | |
| delivery_time | text | HH:MM format, default '07:00' |
| tone | text | factual / conversational / witty, default 'conversational' |
| episode_length | text | short (~5min) / medium (~12min) / long (~20min), default 'medium' |
| updated_at | timestamptz | |

### `user_topics`
Junction table: user <-> topic with customization.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK -> profiles | |
| topic_id | text FK -> topics | |
| enabled | boolean | Toggle on/off, default false |
| custom_tags | text[] | e.g. ["Golden State Warriors", "Tesla"] |
| sort_order | int | Display ordering |

Unique constraint on (user_id, topic_id).

### `episodes`
Generated podcast episodes.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK -> profiles | |
| title | text | Generated episode title |
| date | date | Episode date |
| status | text | pending / gathering / building / scripting / voicing / ready / failed |
| stage_progress | text | Human-readable status message for the UI |
| audio_url | text | Supabase Storage URL, null until voicing complete |
| transcript | text | Full dual-host script, null until scripting complete |
| duration_seconds | int | |
| metadata | jsonb | Intermediate pipeline data (curated stories, etc.) |
| error_message | text | Error details if status = failed |
| created_at | timestamptz | |

Unique constraint on (user_id, date). Generate Now uses `ON CONFLICT (user_id, date) DO UPDATE` to overwrite.

### `episode_sources`
Articles that went into each episode, grouped by story.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| episode_id | uuid FK -> episodes | |
| topic_id | text FK -> topics | |
| story_title | text | The story this source belongs to |
| source_name | text | Outlet name |
| source_url | text | Article URL |
| article_title | text | Article headline |
| published_at | timestamptz | |

### Row-Level Security

All user-data tables have RLS enabled:
- `profiles`: Users can read/update their own row only
- `user_preferences`: Users can read/update their own row only
- `user_topics`: Users can read/insert/update/delete their own rows only
- `episodes`: Users can read their own rows only (insert/update via service role from API)
- `episode_sources`: Users can read rows for their own episodes only
- `topics` and `topic_feeds`: Read-only for all authenticated users (insert/update via migration only)

## Generation Pipeline

Four stages, orchestrated across multiple API calls with status polling.

### Stage 1: Gather

For each of the user's enabled topics:

1. Query `topic_feeds` for all RSS feeds linked to that topic
2. Fetch and parse each feed (parallel, with 10s timeout per feed)
3. Deduplicate articles by URL and title similarity
4. Rank by recency and source tier
5. If the topic has `custom_tags`, boost articles matching those tags
6. For topics with thin RSS coverage or local/niche topics, fire a Claude API call with web search tool to find additional stories
7. Output: structured bundle of top stories per topic (title, summary, URL, source, published date)

Updates `episodes.status` to "gathering" and `stage_progress` to "Fetching news feeds..."

### Stage 2: Story Build (Multi-Agent)

Two sequential Claude API calls (Editor + Fact Checker combined for efficiency, Researcher separate):

**Agent 1 - Editor:** Receives all gathered content across all topics. Selects the best 3-5 stories per topic. Decides story order and identifies narrative threads that connect across topics. Drops stories that are stale or low-quality. Flags claims that need verification.

**Agent 2 - Researcher + Fact Checker:** For each selected story, makes a Claude API call with web search tool to get additional context and verify flagged claims. Enriches stories with deeper detail. Removes or softens claims that cannot be verified. Ensures proper attribution.

Output: a curated, enriched, fact-checked story list with full context and source attribution. Stored in `episodes.metadata`.

Updates `episodes.status` to "building" and `stage_progress` to "Building stories..."

### Stage 3: Script Write

Single Claude API call. Takes:
- The curated story list from Stage 2
- User's `tone` preference (factual / conversational / witty)
- User's `episode_length` preference (short ~5min / medium ~12min / long ~20min)

Produces a natural dual-host podcast script:
- **Alex** (Host A): The informed analyst. Clear, direct, brings context and depth. Dry humor.
- **Jamie** (Host B): The curious enthusiast. Asks great questions, makes connections, brings energy and accessibility.
- Equal airtime, genuine banter, back-and-forth reactions
- Natural transitions between topics
- Humor and personality calibrated to the tone setting
- Cold open, topic segments, and a wrap-up
- Speaker labels on every line: `ALEX:` or `JAMIE:`

Saved to `episodes.transcript`. Updates `episodes.status` to "scripting", `stage_progress` to "Writing script..."

### Stage 4: Voice (Piper TTS via Replicate)

1. Parse the script into individual speaker turns
2. ALEX -> Piper male voice model, JAMIE -> Piper female voice model (or vice versa — two distinct voices)
3. Generate each turn as a separate audio segment via Replicate API call
4. Concatenate all segments into one continuous MP3 using an npm audio library (e.g. `audiobuffer-to-wav` or `mp3-concat`) — no ffmpeg binary needed
5. Upload MP3 to Supabase Storage
6. Save `audio_url` and `duration_seconds` to the `episodes` table
7. Save all source articles to `episode_sources`

Updates `episodes.status` to "voicing", `stage_progress` to "Generating audio..."
On completion, `episodes.status` to "ready".

## Frontend

Three-tab layout. Clean, minimal.

### Tab 1: Today

- Shows today's episode if it exists
- If no episode: "No episode yet" message with a **Generate Now** button
- **Audio player:** Custom HTML5 `<audio>` element with React controls
  - Play/pause button
  - Progress bar with scrub
  - Current time / total time display
  - Playback speed control (0.5x, 1x, 1.25x, 1.5x, 2x)
  - Loading/error/unavailable states handled gracefully
- **Transcript:** Below the player, expandable. Speaker labels color-coded by host (Alex in one color, Jamie in another).
- **Sources:** Below transcript, collapsible list of articles used, grouped by story title
- **Generation progress:** When generating, show stage indicator (Gathering -> Building Stories -> Writing Script -> Generating Audio) with the `stage_progress` message

### Tab 2: Library

- Chronological list of past episodes, newest first
- Each entry: date, title, duration
- Tap to play — loads episode into the player on the Today tab
- Paginated (20 per page)

### Tab 3: Settings

- **Topics:** Grid of available topics. Each is a toggle switch (on/off). When enabled, shows a tag input field for custom tags.
- **Preferences:** Tone picker (3 options), length picker (3 options), delivery time picker (time input)
- **Generate Now** button
- **Account:** Display name, timezone, sign out

## Error Handling

- **RSS feed failures:** Skip failed feeds. If all feeds for a topic fail, use web search as primary source. Never block the entire episode.
- **Claude API failures:** Retry once with exponential backoff. If still failing, set episode status to "failed" with `error_message` and show in UI.
- **TTS failures:** If Replicate is down, save the script without audio (transcript-only episode with status "ready" and null `audio_url`). User can replay the transcript.
- **Stage timeouts:** Each stage is a separate API call, each within Vercel's 60s limit. If a stage times out, episode goes to "failed" status.
- **Empty topics:** If no newsworthy content found, the script naturally acknowledges it ("Quiet day on the science front").
- **Duplicate episodes:** One episode per user per day. Generate Now overwrites any existing episode for today's date.
- **Audio player errors:** If audio URL is expired or unreachable, show "Audio unavailable" with option to regenerate.

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/generate` | POST | Start pipeline (Stages 1+2), return episode ID |
| `/api/generate/script` | POST | Run Stage 3 (script writing) |
| `/api/generate/audio` | POST | Run Stage 4 (TTS + audio) |
| `/api/generate/status/[id]` | GET | Poll episode generation status |
| `/api/episodes` | GET | List user's episodes (paginated) |
| `/api/episodes/[id]` | GET | Get single episode with sources |
| `/api/topics` | GET | List all available topics with feed counts |
| `/api/preferences` | GET | Get user preferences |
| `/api/preferences` | PUT | Update user preferences |
| `/api/user-topics` | GET | Get user's topic settings |
| `/api/user-topics` | PUT | Update user's topic toggles and tags |
| `/api/health` | GET | Health check |

All authenticated routes validate the Supabase JWT from the `Authorization` header. The generate routes use the service role key for database writes.

## What Gets Deleted

All existing `src/components/`, `src/hooks/`, `src/lib/`, and `api/` code will be rewritten from scratch. We keep:

- `package.json` (update dependencies as needed)
- Vite/Tailwind/TypeScript config
- Supabase project connection (new migration for schema changes)
- Vercel deployment config (update `vercel.json` routes as needed)
- `.env.local` credentials
- Existing Supabase migrations (new migration adds on top)

## Delivery Time / Scheduling

The `delivery_time` preference is stored but **not implemented in v1**. The only generation trigger is the "Generate Now" button. Scheduled/cron generation will be added in a future iteration once the core pipeline is stable. The field is kept in the schema so users can set their preference in advance.
