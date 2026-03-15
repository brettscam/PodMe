create table user_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  topic_id text not null,
  weight text default 'standard' check (weight in ('featured', 'standard', 'brief')),
  pinned boolean default false,
  voice_override text,
  sort_order integer default 0,
  created_at timestamptz default now(),
  unique(user_id, topic_id)
);
