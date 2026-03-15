create table profiles (
  id uuid references auth.users primary key,
  display_name text,
  timezone text default 'America/Los_Angeles',
  delivery_time time default '06:00',
  tone text default 'mixed' check (tone in ('factual', 'mixed', 'commentary')),
  length text default 'standard' check (length in ('quick', 'standard', 'deep')),
  cadence text default 'daily' check (cadence in ('daily', 'weekly')),
  default_voice text default 'anchor',
  discovery_enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
