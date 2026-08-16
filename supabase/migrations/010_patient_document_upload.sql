-- Health-One: Migration for Patient Document Uploads and Storage RLS

-- 1. Ensure records table RLS policies allow patient self-uploads
drop policy if exists "records: patient insert self upload" on public.records;
create policy "records: patient insert self upload"
  on public.records for insert
  with check (
    auth.uid() = patient_id
    and (uploaded_by is null or auth.uid() = uploaded_by)
  );

drop policy if exists "records: patient delete self upload" on public.records;
create policy "records: patient delete self upload"
  on public.records for delete
  using (
    auth.uid() = patient_id
  );

-- 2. Create Storage Bucket for Medical Records if not existing
insert into storage.buckets (id, name, public)
values ('medical-records', 'medical-records', true)
on conflict (id) do nothing;

-- 3. Storage Policies
drop policy if exists "Public Read Access for Medical Records" on storage.objects;
create policy "Public Read Access for Medical Records"
  on storage.objects for select
  using (bucket_id = 'medical-records');

drop policy if exists "Patients Upload Own Medical Records" on storage.objects;
create policy "Patients Upload Own Medical Records"
  on storage.objects for insert
  with check (bucket_id = 'medical-records' and auth.role() = 'authenticated');

drop policy if exists "Patients Delete Own Medical Records" on storage.objects;
create policy "Patients Delete Own Medical Records"
  on storage.objects for delete
  using (bucket_id = 'medical-records' and auth.role() = 'authenticated');
