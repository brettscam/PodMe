-- Custom Topics with Shared Feed Pool
--
-- Three new tables:
--   feed_pool          — shared global pool of RSS feeds (publications,
--                        subreddits, local news). Deduped by URL.
--                        Grows via Claude-driven discovery; seeded with
--                        top sources at install time.
--   custom_topics      — per-user topics (e.g. "Portland pickleball")
--   custom_topic_feeds — many-to-many link between custom_topics and
--                        feed_pool entries (named to avoid colliding
--                        with the existing topic_feeds table for
--                        built-in topics).
--
-- Also adds custom_topic_id to user_topics so a user_topics row can
-- represent either a built-in topic (topic_id) or a custom one.

-- ============================================================
-- 1. CREATE feed_pool
-- ============================================================
create table if not exists feed_pool (
  id uuid primary key default gen_random_uuid(),
  url text unique not null,
  name text not null,
  kind text not null default 'rss'
    check (kind in ('rss', 'reddit', 'atom')),
  tier int not null default 3 check (tier in (1, 2, 3)),
  categories text[] not null default '{}',
  tags text[] not null default '{}',
  region text,
  description text,
  last_validated_at timestamptz default now(),
  is_valid boolean not null default true,
  times_matched int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_feed_pool_categories on feed_pool using gin (categories);
create index if not exists idx_feed_pool_tags on feed_pool using gin (tags);
create index if not exists idx_feed_pool_valid on feed_pool(is_valid) where is_valid = true;

-- ============================================================
-- 2. CREATE custom_topics
-- ============================================================
create table if not exists custom_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  label text not null,
  parent_category text not null references topics(id) on delete restrict,
  search_terms text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique(user_id, label)
);

create index if not exists idx_custom_topics_user on custom_topics(user_id);

-- ============================================================
-- 3. CREATE custom_topic_feeds (link table)
-- ============================================================
create table if not exists custom_topic_feeds (
  id uuid primary key default gen_random_uuid(),
  custom_topic_id uuid not null references custom_topics(id) on delete cascade,
  feed_id uuid not null references feed_pool(id) on delete cascade,
  relevance_score float not null default 0.5,
  created_at timestamptz not null default now(),
  unique(custom_topic_id, feed_id)
);

create index if not exists idx_custom_topic_feeds_topic on custom_topic_feeds(custom_topic_id);
create index if not exists idx_custom_topic_feeds_feed on custom_topic_feeds(feed_id);

-- ============================================================
-- 4. ALTER user_topics: add custom_topic_id (nullable FK)
-- ============================================================
alter table user_topics
  add column if not exists custom_topic_id uuid references custom_topics(id) on delete cascade;

create index if not exists idx_user_topics_custom on user_topics(custom_topic_id)
  where custom_topic_id is not null;

-- Drop the old unique constraint that doesn't account for custom topics,
-- then re-create it to allow one row per (user, topic, custom_topic) triple.
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'user_topics_user_topic_unique') then
    alter table user_topics drop constraint user_topics_user_topic_unique;
  end if;
end $$;

-- Partial unique indexes: one row per (user, topic_id) when custom_topic_id is null,
-- and one row per (user, custom_topic_id) when custom_topic_id is set.
create unique index if not exists user_topics_builtin_unique
  on user_topics(user_id, topic_id)
  where custom_topic_id is null;

create unique index if not exists user_topics_custom_unique
  on user_topics(user_id, custom_topic_id)
  where custom_topic_id is not null;

-- ============================================================
-- 5. ROW-LEVEL SECURITY
-- ============================================================

-- feed_pool: readable by authenticated users (shared pool).
-- Only service role can mutate (via discovery pipeline).
alter table feed_pool enable row level security;
drop policy if exists "feed_pool_read" on feed_pool;
create policy "feed_pool_read" on feed_pool for select to authenticated using (true);

-- custom_topics: users own their rows.
alter table custom_topics enable row level security;
drop policy if exists "custom_topics_select" on custom_topics;
drop policy if exists "custom_topics_insert" on custom_topics;
drop policy if exists "custom_topics_update" on custom_topics;
drop policy if exists "custom_topics_delete" on custom_topics;
create policy "custom_topics_select" on custom_topics for select to authenticated
  using (auth.uid() = user_id);
create policy "custom_topics_insert" on custom_topics for insert to authenticated
  with check (auth.uid() = user_id);
create policy "custom_topics_update" on custom_topics for update to authenticated
  using (auth.uid() = user_id);
create policy "custom_topics_delete" on custom_topics for delete to authenticated
  using (auth.uid() = user_id);

-- ============================================================
-- Helper RPC: bump match-count on feeds that got picked.
-- Popularity signal for ranking in future discovery runs.
-- ============================================================
create or replace function bump_feed_match_count(feed_ids uuid[])
returns void as $$
begin
  update feed_pool
  set times_matched = times_matched + 1
  where id = any(feed_ids);
end;
$$ language plpgsql security definer;

grant execute on function bump_feed_match_count(uuid[]) to authenticated;

-- custom_topic_feeds: readable + writable only via owned custom_topic
alter table custom_topic_feeds enable row level security;
drop policy if exists "custom_topic_feeds_select" on custom_topic_feeds;
drop policy if exists "custom_topic_feeds_insert" on custom_topic_feeds;
drop policy if exists "custom_topic_feeds_delete" on custom_topic_feeds;
create policy "custom_topic_feeds_select" on custom_topic_feeds for select to authenticated
  using (custom_topic_id in (select id from custom_topics where user_id = auth.uid()));
create policy "custom_topic_feeds_insert" on custom_topic_feeds for insert to authenticated
  with check (custom_topic_id in (select id from custom_topics where user_id = auth.uid()));
create policy "custom_topic_feeds_delete" on custom_topic_feeds for delete to authenticated
  using (custom_topic_id in (select id from custom_topics where user_id = auth.uid()));
