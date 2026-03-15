create table episodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  title text not null,
  date date not null,
  cadence text not null,
  tone text not null,
  estimated_minutes integer,
  audio_url text,
  transcript text,
  show_notes jsonb,
  share_token text unique,
  share_enabled boolean default false,
  status text default 'pending' check (status in ('pending', 'generating', 'ready', 'failed')),
  created_at timestamptz default now()
);
