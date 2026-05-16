-- =============================================================================
-- Run in Supabase SQL Editor AFTER the initial beach_photo_overrides migration.
-- Adds: Storage bucket beach-photos (public read), table columns for uploads.
-- Does NOT copy Google photos into Storage (Google-referenced rows unchanged).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Storage bucket: public read, server-side writes via service role only
-- -----------------------------------------------------------------------------
-- Service role bypasses storage RLS, so no INSERT/UPDATE policy is required
-- for your Next.js server actions. Do not expose service key to the browser.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'beach-photos',
  'beach-photos',
  true,
  5242880, -- 5 MiB (align with app validation)
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = coalesce(excluded.file_size_limit, storage.buckets.file_size_limit),
  allowed_mime_types = coalesce(excluded.allowed_mime_types, storage.buckets.allowed_mime_types);

-- Public read: anyone can GET objects (needed for <img src={image_url}> on the site).
-- Drop first if you re-run this migration in dev.
drop policy if exists "beach_photos_public_read" on storage.objects;

create policy "beach_photos_public_read"
on storage.objects
for select
using (bucket_id = 'beach-photos');

-- No INSERT/UPDATE/DELETE policies for anon/authenticated: only service role writes.

-- -----------------------------------------------------------------------------
-- 2. beach_photo_overrides: Google ref OR uploaded image (mutually exclusive)
-- -----------------------------------------------------------------------------
-- Resolver: source = 'upload' -> image_url; source = 'google_ref' -> photo_reference + Google API

alter table public.beach_photo_overrides
  alter column photo_reference drop not null;

alter table public.beach_photo_overrides
  add column if not exists image_url text,
  add column if not exists source text not null default 'google_ref';

-- Normalize existing rows (all Google-based today)
update public.beach_photo_overrides
set source = 'google_ref'
where source is null or source = '';

update public.beach_photo_overrides
set image_url = null
where source = 'google_ref';

comment on column public.beach_photo_overrides.photo_reference is 'Places API photo resource name; set when source = google_ref.';
comment on column public.beach_photo_overrides.image_url is 'Public Storage URL for overrides/{beach_slug}.jpg when source = upload.';
comment on column public.beach_photo_overrides.source is 'google_ref | upload';

alter table public.beach_photo_overrides
  drop constraint if exists beach_photo_overrides_source_check;

alter table public.beach_photo_overrides
  add constraint beach_photo_overrides_source_check
  check (source in ('google_ref', 'upload'));

alter table public.beach_photo_overrides
  drop constraint if exists beach_photo_overrides_payload_check;

alter table public.beach_photo_overrides
  add constraint beach_photo_overrides_payload_check
  check (
    (source = 'google_ref' and photo_reference is not null and image_url is null)
    or
    (source = 'upload' and image_url is not null and photo_reference is null)
  );

comment on table public.beach_photo_overrides is 'Hero overrides: google_ref (Places photo name) or upload (Supabase Storage public URL).';
