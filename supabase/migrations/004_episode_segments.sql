create table episode_segments (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid references episodes(id) on delete cascade,
  topic_id text,
  segment_type text not null check (segment_type in ('cold_open', 'topic', 'wild_card', 'wrap_up')),
  title text not null,
  voice text not null,
  start_time_seconds integer,
  duration_seconds integer,
  script text,
  sources jsonb,
  sort_order integer not null
);
