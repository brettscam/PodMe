-- Add email_digest to profiles
alter table profiles add column if not exists email_digest boolean default false;

-- Add custom_tags to user_topics
alter table user_topics add column if not exists custom_tags text[] default '{}';

-- Enable Row Level Security on all tables
alter table profiles enable row level security;
alter table user_topics enable row level security;
alter table episodes enable row level security;
alter table episode_segments enable row level security;
alter table shared_episodes enable row level security;

-- Profiles: users can only read/write their own
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = id);

-- User topics: users can only CRUD their own
create policy "Users can view own topics" on user_topics
  for select using (auth.uid() = user_id);

create policy "Users can insert own topics" on user_topics
  for insert with check (auth.uid() = user_id);

create policy "Users can update own topics" on user_topics
  for update using (auth.uid() = user_id);

create policy "Users can delete own topics" on user_topics
  for delete using (auth.uid() = user_id);

-- Episodes: users can only read their own
create policy "Users can view own episodes" on episodes
  for select using (auth.uid() = user_id);

create policy "Users can insert own episodes" on episodes
  for insert with check (auth.uid() = user_id);

-- Episode segments: viewable if user owns the episode
create policy "Users can view own episode segments" on episode_segments
  for select using (
    exists (select 1 from episodes where episodes.id = episode_segments.episode_id and episodes.user_id = auth.uid())
  );

-- Shared episodes: publicly readable (for share links)
create policy "Anyone can view shared episodes" on shared_episodes
  for select using (true);

create policy "Users can insert shared episodes" on shared_episodes
  for insert with check (
    exists (select 1 from episodes where episodes.id = shared_episodes.episode_id and episodes.user_id = auth.uid())
  );

-- Function to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'User'));
  return new;
end;
$$ language plpgsql security definer;

-- Trigger: create profile when user signs up
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
