-- Track last generated date per user to prevent duplicate daily episodes
alter table profiles add column if not exists last_episode_date date;

-- Index for the cron query (filters by delivery_time window)
create index if not exists idx_profiles_delivery_time on profiles(delivery_time);

-- Note: The cron uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS.
-- No additional RLS policies needed for server-side episode insertion.
