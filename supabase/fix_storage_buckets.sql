-- ============================================================
-- Create storage buckets and policies
-- Run this if gallery/profile-photos buckets are missing
-- ============================================================

-- Create buckets (safe to run if already exists)
insert into storage.buckets (id, name, public)
values
  ('gallery', 'gallery', true),
  ('profile-photos', 'profile-photos', true),
  ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- ============================================================
-- gallery bucket policies
-- ============================================================

-- Anyone can view gallery images (public bucket)
create policy "gallery public read"
  on storage.objects for select
  using (bucket_id = 'gallery');

-- Authenticated photographers can upload to their own folder
create policy "gallery photographer upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'gallery'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Photographers can update their own files
create policy "gallery photographer update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'gallery'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Photographers can delete their own files
create policy "gallery photographer delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'gallery'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- profile-photos bucket policies
-- ============================================================

create policy "profile-photos public read"
  on storage.objects for select
  using (bucket_id = 'profile-photos');

create policy "profile-photos photographer upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "profile-photos photographer update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "profile-photos photographer delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- receipts bucket policies
-- ============================================================

-- Anyone can upload a receipt (unauthenticated booking flow)
create policy "receipts public upload"
  on storage.objects for insert
  with check (bucket_id = 'receipts');

-- Authenticated users (photographers/admin) can read receipts
create policy "receipts authenticated read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'receipts');
