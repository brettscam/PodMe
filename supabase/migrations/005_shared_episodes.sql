create table shared_episodes (
  share_token text primary key,
  episode_id uuid references episodes(id) on delete cascade,
  sharer_name text,
  created_at timestamptz default now(),
  listen_count integer default 0
);
