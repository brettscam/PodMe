-- PodMe Rebuild Migration
-- Drops old tables, creates new schema, seeds topic data

-- ============================================================
-- 1. DROP old tables
-- ============================================================
drop table if exists episode_segments cascade;
drop table if exists shared_episodes cascade;
drop table if exists topic_content cascade;
drop table if exists generated_scripts cascade;

-- ============================================================
-- 2. CREATE topics + topic_feeds
-- ============================================================
create table if not exists topics (
  id text primary key,
  label text not null,
  icon text not null default 'newspaper',
  color text not null default '#6366f1'
);

create table if not exists topic_feeds (
  id uuid primary key default gen_random_uuid(),
  topic_id text not null references topics(id) on delete cascade,
  url text not null,
  name text not null,
  tier int not null default 2 check (tier in (1, 2, 3))
);

create index idx_topic_feeds_topic on topic_feeds(topic_id);

-- ============================================================
-- 3. ALTER profiles (remove podcast preference columns)
-- ============================================================
alter table profiles
  drop column if exists delivery_time,
  drop column if exists tone,
  drop column if exists length,
  drop column if exists cadence,
  drop column if exists default_voice,
  drop column if exists discovery_enabled,
  drop column if exists email_digest,
  drop column if exists digest_sent_at;

-- ============================================================
-- 4. CREATE user_preferences
-- ============================================================
create table if not exists user_preferences (
  user_id uuid primary key references profiles(id) on delete cascade,
  delivery_time text not null default '07:00',
  tone text not null default 'conversational' check (tone in ('factual', 'conversational', 'witty')),
  episode_length text not null default 'medium' check (episode_length in ('short', 'medium', 'long')),
  updated_at timestamptz not null default now()
);

-- Auto-create user_preferences when profile is created
create or replace function create_user_preferences()
returns trigger as $$
begin
  insert into user_preferences (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_profile_created_prefs on profiles;
create trigger on_profile_created_prefs
  after insert on profiles
  for each row execute function create_user_preferences();

-- Create preferences for existing profiles
insert into user_preferences (user_id)
select id from profiles
on conflict do nothing;

-- ============================================================
-- 5. ALTER user_topics
-- ============================================================
-- Add enabled column (default true for existing rows)
alter table user_topics add column if not exists enabled boolean default true;

-- Drop old columns
alter table user_topics
  drop column if exists weight,
  drop column if exists pinned,
  drop column if exists voice_override;

-- Now change default for future inserts
alter table user_topics alter column enabled set default false;

-- Add unique constraint (user_id, topic_id) if not exists
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_topics_user_topic_unique'
  ) then
    alter table user_topics add constraint user_topics_user_topic_unique unique (user_id, topic_id);
  end if;
end $$;

-- ============================================================
-- 6. ALTER episodes
-- ============================================================
-- Drop old CHECK constraint on status
alter table episodes drop constraint if exists episodes_status_check;

-- Add new columns
alter table episodes add column if not exists stage_progress text;
alter table episodes add column if not exists metadata jsonb;
alter table episodes add column if not exists error_message text;
alter table episodes add column if not exists duration_seconds int;

-- Drop old columns
alter table episodes
  drop column if exists cadence,
  drop column if exists tone,
  drop column if exists estimated_minutes,
  drop column if exists show_notes,
  drop column if exists share_token,
  drop column if exists share_enabled,
  drop column if exists digest_sent_at;

-- Add new CHECK constraint
alter table episodes add constraint episodes_status_check
  check (status in ('pending', 'gathering', 'building', 'scripting', 'voicing', 'ready', 'failed'));

-- Add unique constraint on (user_id, date)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'episodes_user_date_unique'
  ) then
    alter table episodes add constraint episodes_user_date_unique unique (user_id, date);
  end if;
end $$;

-- ============================================================
-- 7. CREATE episode_sources
-- ============================================================
create table if not exists episode_sources (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references episodes(id) on delete cascade,
  topic_id text references topics(id) on delete set null,
  story_title text not null,
  source_name text not null,
  source_url text not null,
  article_title text not null,
  published_at timestamptz
);

create index idx_episode_sources_episode on episode_sources(episode_id);

-- ============================================================
-- 8. ROW-LEVEL SECURITY
-- ============================================================

-- topics: read-only for authenticated users
alter table topics enable row level security;
drop policy if exists "topics_read" on topics;
create policy "topics_read" on topics for select to authenticated using (true);

-- topic_feeds: read-only for authenticated users
alter table topic_feeds enable row level security;
drop policy if exists "topic_feeds_read" on topic_feeds;
create policy "topic_feeds_read" on topic_feeds for select to authenticated using (true);

-- user_preferences: users own their row
alter table user_preferences enable row level security;
drop policy if exists "user_prefs_select" on user_preferences;
drop policy if exists "user_prefs_update" on user_preferences;
create policy "user_prefs_select" on user_preferences for select to authenticated using (auth.uid() = user_id);
create policy "user_prefs_update" on user_preferences for update to authenticated using (auth.uid() = user_id);

-- episode_sources: users can read sources for their own episodes
alter table episode_sources enable row level security;
drop policy if exists "episode_sources_read" on episode_sources;
create policy "episode_sources_read" on episode_sources for select to authenticated
  using (episode_id in (select id from episodes where user_id = auth.uid()));

-- ============================================================
-- 9. SEED TOPICS
-- ============================================================
insert into topics (id, label, icon, color) values
  ('tech',          'Technology',    'cpu',           '#3b82f6'),
  ('world',         'World News',    'globe',         '#ef4444'),
  ('business',      'Business',      'briefcase',     '#f59e0b'),
  ('earnings',      'Markets',       'trending-up',   '#10b981'),
  ('science',       'Science',       'flask-conical', '#8b5cf6'),
  ('sports',        'Sports',        'trophy',        '#f97316'),
  ('entertainment', 'Entertainment', 'clapperboard',  '#ec4899'),
  ('local',         'Local News',    'map-pin',       '#06b6d4'),
  ('creative',      'Creative',      'palette',       '#a855f7'),
  ('travel',        'Travel',        'plane',         '#14b8a6')
on conflict (id) do nothing;

-- ============================================================
-- 10. SEED RSS FEEDS
-- ============================================================
insert into topic_feeds (topic_id, url, name, tier) values
  -- Tech
  ('tech', 'https://feeds.arstechnica.com/arstechnica/technology-lab', 'Ars Technica', 2),
  ('tech', 'https://www.theverge.com/rss/index.xml', 'The Verge', 2),
  ('tech', 'https://techcrunch.com/feed/', 'TechCrunch', 2),
  ('tech', 'https://www.wired.com/feed/rss', 'Wired', 2),
  ('tech', 'https://9to5mac.com/feed/', '9to5Mac', 3),
  -- World
  ('world', 'https://feeds.bbci.co.uk/news/world/rss.xml', 'BBC World', 1),
  ('world', 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', 'NYT World', 1),
  ('world', 'https://www.aljazeera.com/xml/rss/all.xml', 'Al Jazeera', 2),
  ('world', 'https://www.reuters.com/rssFeed/worldNews', 'Reuters World', 1),
  -- Business
  ('business', 'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml', 'NYT Business', 1),
  ('business', 'https://feeds.bbci.co.uk/news/business/rss.xml', 'BBC Business', 1),
  ('business', 'https://www.cnbc.com/id/10001147/device/rss/rss.html', 'CNBC Business', 2),
  ('business', 'https://feeds.marketwatch.com/marketwatch/topstories/', 'MarketWatch', 2),
  -- Markets/Earnings
  ('earnings', 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664', 'CNBC Finance', 2),
  ('earnings', 'https://finance.yahoo.com/news/rssindex', 'Yahoo Finance', 2),
  ('earnings', 'https://www.ft.com/?format=rss', 'Financial Times', 1),
  ('earnings', 'https://feeds.marketwatch.com/marketwatch/topstories/', 'MarketWatch', 2),
  ('earnings', 'https://www.bloomberg.com/feed/podcast/top-news', 'Bloomberg', 1),
  -- Science
  ('science', 'https://rss.nytimes.com/services/xml/rss/nyt/Science.xml', 'NYT Science', 1),
  ('science', 'https://www.newscientist.com/section/news/feed/', 'New Scientist', 2),
  ('science', 'https://www.sciencedaily.com/rss/all.xml', 'ScienceDaily', 2),
  ('science', 'https://www.nature.com/nature.rss', 'Nature', 1),
  -- Sports
  ('sports', 'https://rss.nytimes.com/services/xml/rss/nyt/Sports.xml', 'NYT Sports', 1),
  ('sports', 'https://feeds.bbci.co.uk/sport/rss.xml', 'BBC Sport', 1),
  ('sports', 'https://www.espn.com/espn/rss/news', 'ESPN', 2),
  ('sports', 'https://www.cbssports.com/rss/headlines/', 'CBS Sports', 2),
  ('sports', 'https://www.theguardian.com/football/rss', 'Guardian Football', 1),
  ('sports', 'https://www.theguardian.com/football/premierleague/rss', 'Guardian Premier League', 1),
  -- Entertainment
  ('entertainment', 'https://variety.com/feed/', 'Variety', 2),
  ('entertainment', 'https://www.hollywoodreporter.com/feed/', 'Hollywood Reporter', 2),
  ('entertainment', 'https://kotaku.com/rss', 'Kotaku', 3),
  ('entertainment', 'https://www.rollingstone.com/feed/', 'Rolling Stone', 2),
  -- Local
  ('local', 'https://www.sfchronicle.com/bayarea/feed/Bay-Area-Local-News-702702.php', 'SF Chronicle', 2),
  ('local', 'https://www.marinij.com/feed/', 'Marin IJ', 3),
  -- Creative
  ('creative', 'https://www.creativebloq.com/feed', 'Creative Bloq', 3),
  ('creative', 'https://www.designboom.com/feed/', 'Designboom', 3),
  ('creative', 'https://www.itsnicethat.com/rss', 'Its Nice That', 2),
  -- Travel
  ('travel', 'https://www.lonelyplanet.com/news/feed/atom', 'Lonely Planet', 2),
  ('travel', 'https://thepointsguy.com/feed/', 'The Points Guy', 3),
  ('travel', 'https://www.cntraveler.com/feed/rss', 'Conde Nast Traveler', 2)
on conflict do nothing;
