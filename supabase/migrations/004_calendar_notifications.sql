create extension if not exists pgcrypto;
create table if not exists public.calendar_items (
  id uuid primary key default gen_random_uuid(), household_id uuid not null, created_by uuid,
  name text not null, item_type text not null check (item_type in ('bill','task','event')),
  priority text not null default 'normal', due_date date not null, due_time time,
  amount numeric(14,2) default 0, category text, repeat_rule text not null default 'none',
  remind_days integer not null default 0, assignee_ids uuid[] not null default '{}', project_id uuid,
  payment_method text, note text, status text not null default 'pending', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(), household_id uuid not null, recipient_id uuid not null,
  calendar_item_id uuid, title text not null, body text, scheduled_for timestamptz, read_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null, endpoint text not null unique,
  p256dh text not null, auth text not null, user_agent text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.calendar_items enable row level security;
alter table public.app_notifications enable row level security;
alter table public.push_subscriptions enable row level security;
