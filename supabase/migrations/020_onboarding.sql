-- Track whether a user has been through the welcome flow.
--
-- Lives on user_preferences rather than localStorage so the flow follows the
-- account across devices — someone who onboards on the web shouldn't be asked
-- again on their phone.
--
-- Nullable: null means "never completed". Existing users are backfilled as
-- already onboarded, since showing a first-run wizard to someone who has been
-- using the app for months would be worse than not showing it at all.

alter table user_preferences
  add column if not exists onboarded_at timestamptz;

-- Backfill: anyone who already exists has, in effect, onboarded.
update user_preferences
set onboarded_at = coalesce(onboarded_at, updated_at, now())
where onboarded_at is null;

-- New rows start null so the trigger-created preferences for a fresh signup
-- correctly flag them as needing the flow.
