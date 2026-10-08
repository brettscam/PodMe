-- Feed pool hygiene + Substack support
--
-- Three things:
--   1. Allow kind='substack' and kind='youtube' in feed_pool.
--   2. Retire URLs seeded in 018 that are known-dead or wrong-shaped.
--   3. Seed a small set of Substack publications.
--
-- Note on confidence: the 018 seed was written from memory and never
-- validated against the live web. This migration removes the entries that
-- are known-bad, but the rest are still unverified — api/cron/validate-feeds
-- is what actually proves them, flipping is_valid and stamping
-- last_validated_at. Treat is_valid=true + a recent last_validated_at as the
-- only real signal that a feed works.

-- ============================================================
-- 1. WIDEN the kind constraint
-- ============================================================
alter table feed_pool drop constraint if exists feed_pool_kind_check;
alter table feed_pool add constraint feed_pool_kind_check
  check (kind in ('rss', 'reddit', 'atom', 'substack', 'youtube'));

-- ============================================================
-- 2. RETIRE known-bad seeds
-- ============================================================
-- Soft-retire rather than delete: custom_topic_feeds rows may already point
-- at these, and is_valid=false removes them from fetching while keeping the
-- link history intact.

update feed_pool
set is_valid = false,
    last_validated_at = now(),
    description = coalesce(description, '') || ' [retired: endpoint discontinued]'
where url in (
  -- Reuters withdrew public RSS; this path 404s.
  'https://www.reuters.com/rssFeed/worldNews',
  -- sciencemag.org moved to science.org and this path no longer resolves.
  'https://www.sciencemag.org/rss/current.xml',
  -- Malformed: a wrapper URL was pasted around the real feed path.
  'https://www.nytimes.com/svc/collections/v1/publish/https://www.nytimes.com/section/nyregion/rss.xml',
  -- Podcast enclosure feed, not article headlines — wrong shape for ingestion.
  'https://www.bloomberg.com/feed/podcast/top-news'
);

-- Replace the two that have good modern equivalents.
insert into feed_pool (url, name, kind, tier, categories, tags, region, description) values
  ('https://www.science.org/rss/news_current.xml', 'Science News', 'rss', 1, '{science}', '{research,peer-reviewed}', null, 'Science Magazine news feed'),
  ('https://rss.nytimes.com/services/xml/rss/nyt/NYRegion.xml', 'NYT Metro', 'rss', 1, '{local}', '{new-york,nyc,manhattan,brooklyn}', 'nyc', 'NYT New York region')
on conflict (url) do update set
  name = excluded.name, tier = excluded.tier, categories = excluded.categories,
  tags = excluded.tags, region = excluded.region, description = excluded.description;

-- ============================================================
-- 3. SEED Substack publications
-- ============================================================
-- Substack serves RSS at <publication>/feed, on both *.substack.com and
-- custom domains. Deliberately a small, high-confidence set: the pool grows
-- properly through Claude discovery, and seeding a long list of guessed URLs
-- would just give the validator more to retire.

insert into feed_pool (url, name, kind, tier, categories, tags, region, description) values
  ('https://astralcodexten.substack.com/feed',        'Astral Codex Ten',   'substack', 3, '{science,culture}',        '{substack,essays,rationality,longform}',        null, 'Scott Alexander on science and society'),
  ('https://www.slowboring.com/feed',                 'Slow Boring',        'substack', 3, '{world,business}',         '{substack,politics,policy,economics}',         null, 'Matt Yglesias on politics and policy'),
  ('https://popular.info/feed',                       'Popular Information','substack', 3, '{world}',                  '{substack,politics,accountability}',           null, 'Judd Legum, accountability journalism'),
  ('https://newsletter.pragmaticengineer.com/feed',   'Pragmatic Engineer', 'substack', 3, '{tech}',                   '{substack,engineering,software,careers}',      null, 'Gergely Orosz on software engineering'),
  ('https://annehelen.substack.com/feed',             'Culture Study',      'substack', 3, '{culture,creative}',       '{substack,culture,sociology,longform}',        null, 'Anne Helen Petersen on culture'),
  ('https://www.garbageday.email/feed',               'Garbage Day',        'substack', 3, '{culture,tech}',           '{substack,internet,memes,platforms}',          null, 'Ryan Broderick on internet culture'),
  ('https://thegeneralist.substack.com/feed',         'The Generalist',     'substack', 3, '{business,tech}',          '{substack,venture,startups,strategy}',         null, 'Mario Gabriele on tech and venture'),
  ('https://newsletter.pessimistsarchive.org/feed',   'Pessimists Archive', 'substack', 3, '{tech,culture}',           '{substack,history,technology}',                null, 'Historical technology panics'),
  ('https://oneusefulthing.substack.com/feed',        'One Useful Thing',   'substack', 3, '{tech,science}',           '{substack,ai,artificial-intelligence,research}', null, 'Ethan Mollick on practical AI'),
  ('https://importai.substack.com/feed',              'Import AI',          'substack', 3, '{tech,science}',           '{substack,ai,machine-learning,research}',      null, 'Jack Clark on AI research'),
  ('https://www.citationneeded.news/feed',            'Citation Needed',    'substack', 3, '{tech}',                   '{substack,crypto,skepticism}',                 null, 'Molly White on crypto and tech'),
  ('https://defector.com/feed',                       'Defector',           'rss',      2, '{sports,culture}',         '{sports,culture,independent}',                 null, 'Worker-owned sports and culture')
on conflict (url) do update set
  name = excluded.name, kind = excluded.kind, tier = excluded.tier,
  categories = excluded.categories, tags = excluded.tags,
  region = excluded.region, description = excluded.description;

-- ============================================================
-- 4. VALIDATION BOOKKEEPING
-- ============================================================
-- Everything seeded so far is unproven. Null out last_validated_at on rows
-- that still carry the 018 default so the validator treats them as never
-- checked and prioritises them, rather than trusting a timestamp that only
-- ever meant "row inserted".
update feed_pool
set last_validated_at = null
where is_valid = true;

create index if not exists idx_feed_pool_needs_validation
  on feed_pool(last_validated_at nulls first)
  where is_valid = true;
