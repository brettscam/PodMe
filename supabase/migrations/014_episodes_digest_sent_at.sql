-- Add digest tracking timestamp to episodes
alter table episodes add column if not exists digest_sent_at timestamptz;
