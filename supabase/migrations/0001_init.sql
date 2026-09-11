-- Semitic Conlang Helper — initial schema
--
-- Run this in the Supabase SQL editor (or via the Supabase CLI) to provision
-- the tables used by the app. The app also works without a backend (data is
-- kept in the browser's localStorage), but Supabase gives you shared, durable
-- storage across devices.

-- Vocalic patterns / binyanim. `template` uses digits 1..9 for the 1st..9th
-- root consonant and any other character as a literal segment. e.g. "ma12a3".
create table if not exists public.patterns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  template text not null,
  category text,
  notes text,
  created_at timestamptz not null default now()
);

-- Dictionary entries: a surface form (root + pattern) with a meaning/gloss.
create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  root_key text not null,                 -- canonical lookup key, e.g. "k-t-b"
  root_tokens text[] not null default '{}',
  surface text not null,                  -- e.g. "maktab"
  pattern_id uuid references public.patterns (id) on delete set null,
  pattern_name text,
  gloss text not null,                    -- meaning in Korean, English, ...
  language text,                          -- gloss language tag, e.g. "ko"/"en"
  part_of_speech text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists entries_root_key_idx on public.entries (root_key);

-- Key/value settings (phonology inventory lives under key = 'phonology').
create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Row Level Security. The policies below make the data readable/writable by
-- anyone with the anon key, which is convenient for a single-user tool. Tighten
-- these (e.g. scope by auth.uid()) before exposing the project publicly.
alter table public.patterns enable row level security;
alter table public.entries  enable row level security;
alter table public.settings enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'patterns' and policyname = 'patterns_all') then
    create policy patterns_all on public.patterns for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'entries' and policyname = 'entries_all') then
    create policy entries_all on public.entries for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'settings' and policyname = 'settings_all') then
    create policy settings_all on public.settings for all using (true) with check (true);
  end if;
end $$;
