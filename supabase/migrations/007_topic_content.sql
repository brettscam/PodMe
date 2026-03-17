-- Topic content: stores fetched/curated content per topic per day
-- This is the "write once, read many" layer that decouples fetching from generation
create table if not exists topic_content (
  id uuid primary key default gen_random_uuid(),
  topic_id text not null,
  fetch_date date not null default current_date,
  title text not null,
  claims jsonb not null default '[]'::jsonb,
  sources jsonb not null default '[]'::jsonb,
  content_hash text not null,
  created_at timestamptz default now(),

  -- One content row per topic per day
  unique (topic_id, fetch_date)
);

-- Index for daily lookups
create index idx_topic_content_date on topic_content (fetch_date, topic_id);

-- Generated scripts: cached LLM output keyed by content + user preferences
-- Same content + same tone + same length = same script for all users
create table if not exists generated_scripts (
  id uuid primary key default gen_random_uuid(),
  content_hash text not null,
  tone text not null check (tone in ('factual', 'mixed', 'commentary')),
  length text not null check (length in ('quick', 'standard', 'deep')),
  script text not null,
  voice_suggestion text,
  duration_seconds integer not null,
  model_used text,
  prompt_tokens integer,
  completion_tokens integer,
  created_at timestamptz default now(),

  -- One script per content+preferences combo
  unique (content_hash, tone, length)
);

-- Index for cache lookups
create index idx_generated_scripts_lookup on generated_scripts (content_hash, tone, length);

-- RLS: topic_content is readable by all authenticated users (shared resource)
alter table topic_content enable row level security;
create policy "Authenticated users can read topic content"
  on topic_content for select
  to authenticated
  using (true);

-- RLS: generated_scripts is readable by all authenticated users (shared cache)
alter table generated_scripts enable row level security;
create policy "Authenticated users can read generated scripts"
  on generated_scripts for select
  to authenticated
  using (true);
