-- Run in Supabase SQL editor (or via CLI) before deploying app code that reads this table.
-- Stores the Google Places photo resource name (e.g. places/ChIJ…/photos/Ab43m-…), not a full media URL.

create table if not exists public.beach_photo_overrides (
  beach_slug text primary key,
  photo_reference text not null,
  updated_at timestamptz not null default now()
);

comment on table public.beach_photo_overrides is 'Manual hero photo picks; slug matches Beach.slug, photo_reference is Places API v1 photo resource name.';

create index if not exists beach_photo_overrides_updated_at_idx
  on public.beach_photo_overrides (updated_at desc);

alter table public.beach_photo_overrides enable row level security;

-- No public policies: only the service role (server) reads/writes, consistent with sargassum_levels pattern.
