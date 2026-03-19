-- Add custom_tags column to user_topics (was missing from original schema)
alter table user_topics add column if not exists custom_tags text[] not null default '{}';
