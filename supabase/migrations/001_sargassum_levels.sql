-- Coast-level sargassum estimates (manual admin or future automation).
-- Run in Supabase SQL editor or via CLI link.

create table if not exists public.sargassum_levels (
  coast text primary key,
  level text not null,
  updated_at timestamptz not null default now(),
  notes text,
  source text,
  confidence numeric,
  constraint sargassum_levels_coast_chk check (
    coast in ('North', 'West', 'South', 'Southeast', 'East')
  ),
  constraint sargassum_levels_level_chk check (level in ('low', 'medium', 'high')),
  constraint sargassum_levels_confidence_chk check (
    confidence is null or (confidence >= 0 and confidence <= 1)
  )
);

comment on table public.sargassum_levels is 'Coast-level sargassum index; source manual until automation (Copernicus / AI).';

alter table public.sargassum_levels enable row level security;

-- Public read for website (anon key). Writes use service role only.
create policy "Allow public read sargassum_levels"
  on public.sargassum_levels
  for select
  to anon, authenticated
  using (true);
