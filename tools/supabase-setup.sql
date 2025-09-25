-- Taskora Supabase setup: storage bucket + pricing columns
-- Safe to re-run; uses IF NOT EXISTS where supported

-- 1) Storage bucket `portfolio` for avatars and other media
insert into storage.buckets (id, name, public)
select 'portfolio', 'portfolio', true
where not exists (select 1 from storage.buckets where id = 'portfolio');

-- Public read access to objects in `portfolio`
create policy if not exists "Public read access to portfolio"
on storage.objects for select
using (bucket_id = 'portfolio');

-- Authenticated users can upload to `portfolio`
create policy if not exists "Authenticated uploads to portfolio"
on storage.objects for insert to authenticated
with check (bucket_id = 'portfolio');

-- Optionally allow authenticated updates to their own files (relaxed: any auth can update within bucket)
create policy if not exists "Authenticated update portfolio"
on storage.objects for update to authenticated
using (bucket_id = 'portfolio')
with check (bucket_id = 'portfolio');

-- Optionally allow authenticated deletes within bucket
create policy if not exists "Authenticated delete portfolio"
on storage.objects for delete to authenticated
using (bucket_id = 'portfolio');

-- 2) Pricing type columns with defaults
-- briefs.priceType: 'total' | 'por_hora'
alter table if exists public.briefs
  add column if not exists "priceType" text not null default 'total';

update public.briefs set "priceType" = 'total' where "priceType" is null;

-- contracts.priceType (used in UI), default 'total'
alter table if exists public.contracts
  add column if not exists "priceType" text not null default 'total';

update public.contracts set "priceType" = 'total' where "priceType" is null;

-- Notes:
-- - No need to create an `avatars/` folder; pathing is virtual under the `portfolio` bucket.
-- - If you want stricter object-level ownership, replace the relaxed update/delete policies
--   with policies that check against metadata or maintain a mapping table.


