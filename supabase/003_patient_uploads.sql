-- Health-One: Patient upload & medical documents migration (Day 2)

-- 1. Add attachment_path and uploaded_by columns to records table if missing
alter table public.records 
  add column if not exists attachment_path text default null,
  add column if not exists uploaded_by uuid references public.profiles(id) default null;

-- 2. Enable RLS on records table (if not already enabled)
alter table public.records enable row level security;

-- 3. RLS policies for records table
-- Patient select policy (patients read their own records)
drop policy if exists "records: select own" on public.records;
create policy "records: select own"
  on public.records for select
  using (auth.uid() = patient_id);

-- Patient insert policy (patients can insert their own uploads)
drop policy if exists "records: patient insert self upload" on public.records;
create policy "records: patient insert self upload"
  on public.records for insert
  with check (
    auth.uid() = patient_id
    and auth.uid() = uploaded_by
    and record_type = 'patient_upload'
    and doctor_id is null
  );

-- Patient delete policy (patients can delete their own uploads)
drop policy if exists "records: patient delete self upload" on public.records;
create policy "records: patient delete self upload"
  on public.records for delete
  using (
    auth.uid() = patient_id
    and auth.uid() = uploaded_by
  );

-- Doctor/Hospital read access for records
drop policy if exists "records: doctor hospital select" on public.records;
create policy "records: doctor hospital select"
  on public.records for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('doctor', 'hospital')
    )
  );

-- 4. Create medical-documents bucket in storage
insert into storage.buckets (id, name, public)
values ('medical-documents', 'medical-documents', false)
on conflict (id) do nothing;

-- 5. Storage RLS policies for medical-documents bucket
-- Patient read own folder policy
drop policy if exists "Storage: patient read own folder" on storage.objects;
create policy "Storage: patient read own folder"
  on storage.objects for select
  using (
    bucket_id = 'medical-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Patient insert own folder policy
drop policy if exists "Storage: patient insert own folder" on storage.objects;
create policy "Storage: patient insert own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'medical-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Patient delete own folder policy
drop policy if exists "Storage: patient delete own folder" on storage.objects;
create policy "Storage: patient delete own folder"
  on storage.objects for delete
  using (
    bucket_id = 'medical-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Doctor / Hospital read all objects policy
drop policy if exists "Storage: doctor hospital read objects" on storage.objects;
create policy "Storage: doctor hospital read objects"
  on storage.objects for select
  using (
    bucket_id = 'medical-documents'
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('doctor', 'hospital')
    )
  );
