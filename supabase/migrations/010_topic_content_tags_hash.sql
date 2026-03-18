-- Add custom_tags_hash to topic_content so cache invalidates when user changes tags
alter table topic_content add column if not exists custom_tags_hash text not null default '';
