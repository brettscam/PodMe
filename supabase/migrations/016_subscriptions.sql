-- Subscriptions foundation
-- Creates per-user subscription row with tier + billing fields.
-- Tier limits enforced in api/lib/tier.ts, not here, so tweaking limits
-- doesn't require a migration.

-- ============================================================
-- 1. CREATE subscriptions
-- ============================================================
create table if not exists subscriptions (
  user_id uuid primary key references profiles(id) on delete cascade,
  tier text not null default 'free' check (tier in ('free', 'pro', 'unlimited')),
  status text not null default 'active'
    check (status in ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
  source text not null default 'none'
    check (source in ('none', 'stripe', 'apple', 'promo', 'grandfather')),
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  trial_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_stripe_customer
  on subscriptions(stripe_customer_id)
  where stripe_customer_id is not null;

create index if not exists idx_subscriptions_stripe_subscription
  on subscriptions(stripe_subscription_id)
  where stripe_subscription_id is not null;

-- ============================================================
-- 2. TRIGGER: auto-create free subscription on profile insert
-- ============================================================
create or replace function create_subscription_for_profile()
returns trigger as $$
begin
  insert into subscriptions (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_profile_created_subscription on profiles;
create trigger on_profile_created_subscription
  after insert on profiles
  for each row execute function create_subscription_for_profile();

-- Backfill existing profiles
insert into subscriptions (user_id)
select id from profiles
on conflict do nothing;

-- ============================================================
-- 3. TRIGGER: touch updated_at
-- ============================================================
create or replace function touch_subscription_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists subscriptions_updated_at on subscriptions;
create trigger subscriptions_updated_at
  before update on subscriptions
  for each row execute function touch_subscription_updated_at();

-- ============================================================
-- 4. ROW-LEVEL SECURITY
-- ============================================================
alter table subscriptions enable row level security;

drop policy if exists "subscriptions_read" on subscriptions;
create policy "subscriptions_read" on subscriptions
  for select to authenticated
  using (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policy: only service role (Stripe webhooks,
-- promo scripts) may mutate subscriptions.
