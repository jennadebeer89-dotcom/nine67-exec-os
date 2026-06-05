-- Meridian Executive OS — Supabase schema.
--
-- Deliberately mess-tolerant: every value column is TEXT so the raw, inconsistent
-- exports survive into the database exactly as they arrived (e.g. "$120,000",
-- "120k", "Q4", "80%", "0.45", ""). All cleaning happens in the app's normalize
-- layer, never in the database. This mirrors how a real agency's source systems
-- actually store things.
--
-- Run this in the Supabase SQL editor (or via `psql`), then `pnpm seed`.

drop table if exists allocations cascade;
drop table if exists budget_records cascade;
drop table if exists forecasts cascade;
drop table if exists notes cascade;
drop table if exists projects cascade;
drop table if exists employees cascade;
drop table if exists clients cascade;

create table clients (
  id              text primary key,
  name            text not null,
  industry        text,
  account_manager text,
  segment         text,
  contract_value  text,
  renewal_date    text,
  health          text,
  last_contact    text,
  sentiment_note  text,
  start_date      text
);

create table projects (
  id               text primary key,
  name             text not null,
  client_id        text,
  client_name      text,
  status           text,
  lead             text,
  team             text,
  start            text,
  due              text,
  budget           text,
  spent            text,
  percent_complete text,
  last_update      text,
  billing_type     text,
  notes_inline     text
);

create table employees (
  id                    text primary key,
  name                  text not null,
  role                  text,
  team                  text,
  weekly_capacity_hours text,
  employment            text
);

create table allocations (
  id              bigserial primary key,
  employee_id     text,
  project_id      text,
  allocated_hours text,
  role_on_project text
);

create table notes (
  id      text primary key,
  about   text,
  author  text,
  date    text,
  text    text not null,
  channel text
);

create table budget_records (
  id         bigserial primary key,
  project_id text,
  source     text,
  budget     text,
  spent      text,
  as_of      text
);

create table forecasts (
  id                 bigserial primary key,
  project_id         text,
  client_id          text,
  quarter            text,
  committed_revenue  text,
  recognized_to_date text,
  confidence         text,
  note               text
);

-- Read-only public access for the demo (anon key can SELECT; the seed uses the
-- service-role key which bypasses RLS). Tighten this for any real deployment.
alter table clients        enable row level security;
alter table projects       enable row level security;
alter table employees      enable row level security;
alter table allocations    enable row level security;
alter table notes          enable row level security;
alter table budget_records enable row level security;
alter table forecasts      enable row level security;

do $$
declare t text;
begin
  foreach t in array array['clients','projects','employees','allocations','notes','budget_records','forecasts']
  loop
    execute format('drop policy if exists "public read" on %I;', t);
    execute format('create policy "public read" on %I for select using (true);', t);
  end loop;
end $$;
