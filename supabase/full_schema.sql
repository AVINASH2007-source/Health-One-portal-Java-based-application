-- ==========================================
-- Health-One: Complete Master Database Setup
-- Run this script in your Supabase SQL Editor
-- ==========================================

-- 1. Create role enum
do $$ begin
  create type public.user_role as enum ('patient', 'doctor', 'hospital');
exception
  when duplicate_object then null;
end $$;

-- 2. Profiles table
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  role       public.user_role not null default 'patient',
  name       text not null,
  email      text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Profile RLS policies
drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles: insert self" on public.profiles;
create policy "profiles: insert self"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Trigger: Prevent changing role column once created (Role Immutability)
create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.role is distinct from old.role then
    raise exception 'User role is immutable and cannot be changed.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_profile_role_immutable on public.profiles;
create trigger enforce_profile_role_immutable
  before update on public.profiles
  for each row execute function public.prevent_profile_role_change();

-- 3. Auto-create profile trigger on auth.users signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, name, email)
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'patient'),
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Records table
create table if not exists public.records (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.profiles(id) on delete cascade,
  doctor_id       uuid default null references public.profiles(id) on delete set null,
  uploaded_by     uuid default null references public.profiles(id) on delete set null,
  record_type     text not null,
  title           text not null,
  description     text default null,
  attachment_path text default null,
  occurred_at     timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

alter table public.records enable row level security;

drop policy if exists "records: select own" on public.records;
create policy "records: select own"
  on public.records for select
  using (auth.uid() = patient_id);

drop policy if exists "records: patient insert self upload" on public.records;
create policy "records: patient insert self upload"
  on public.records for insert
  with check (
    auth.uid() = patient_id
    and auth.uid() = uploaded_by
    and record_type = 'patient_upload'
    and doctor_id is null
  );

drop policy if exists "records: patient delete self upload" on public.records;
create policy "records: patient delete self upload"
  on public.records for delete
  using (
    auth.uid() = patient_id
    and auth.uid() = uploaded_by
  );

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

-- 5. Medications table
create table if not exists public.medications (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.profiles(id) on delete cascade,
  prescribed_by uuid default null references public.profiles(id) on delete set null,
  name          text not null,
  dosage        text not null,
  frequency     text not null,
  duration      text default null,
  source        text default 'patient_added',
  status        text default 'confirmed',
  start_date    date not null default current_date,
  end_date      date default null,
  notes         text default null,
  created_at    timestamptz not null default now()
);

alter table public.medications enable row level security;

drop policy if exists "medications: select own" on public.medications;
create policy "medications: select own"
  on public.medications for select
  using (auth.uid() = patient_id);

drop policy if exists "medications: patient insert" on public.medications;
create policy "medications: patient insert"
  on public.medications for insert
  with check (
    auth.uid() = patient_id
    and source in ('patient_added', 'ai_extracted')
  );

drop policy if exists "medications: patient update" on public.medications;
create policy "medications: patient update"
  on public.medications for update
  using (
    auth.uid() = patient_id
    and (source in ('patient_added', 'ai_extracted') or prescribed_by is null)
  )
  with check (
    auth.uid() = patient_id
  );

drop policy if exists "medications: patient delete" on public.medications;
create policy "medications: patient delete"
  on public.medications for delete
  using (
    auth.uid() = patient_id
    and (source in ('patient_added', 'ai_extracted') or prescribed_by is null)
  );

-- 6. Emergency Cards table
create table if not exists public.emergency_cards (
  patient_id             uuid primary key references public.profiles(id) on delete cascade,
  blood_type             text default 'O+',
  allergies              text[] default '{}',
  conditions             text[] default '{}',
  emergency_contact_name text default '',
  emergency_contact_phone text default '',
  updated_at             timestamptz not null default now()
);

alter table public.emergency_cards enable row level security;

drop policy if exists "emergency_cards: select patient or provider" on public.emergency_cards;
create policy "emergency_cards: select patient or provider"
  on public.emergency_cards for select
  using (
    auth.uid() = patient_id
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('doctor', 'hospital')
    )
  );

drop policy if exists "emergency_cards: patient upsert" on public.emergency_cards;
create policy "emergency_cards: patient upsert"
  on public.emergency_cards for insert
  with check (auth.uid() = patient_id);

drop policy if exists "emergency_cards: patient update" on public.emergency_cards;
create policy "emergency_cards: patient update"
  on public.emergency_cards for update
  using (auth.uid() = patient_id)
  with check (auth.uid() = patient_id);

-- 7. Emergency Access Log table
create table if not exists public.emergency_access_log (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.profiles(id) on delete cascade,
  accessed_by   uuid default null references public.profiles(id) on delete set null,
  access_reason text not null,
  created_at    timestamptz not null default now()
);

alter table public.emergency_access_log enable row level security;

drop policy if exists "emergency_access_log: select own" on public.emergency_access_log;
create policy "emergency_access_log: select own"
  on public.emergency_access_log for select
  using (auth.uid() = patient_id or auth.uid() = accessed_by);

drop policy if exists "emergency_access_log: insert authenticated" on public.emergency_access_log;
create policy "emergency_access_log: insert authenticated"
  on public.emergency_access_log for insert
  with check (auth.uid() is not null);

-- 8. AI Summaries table
create table if not exists public.ai_summaries (
  id         uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  doctor_id  uuid default null references public.profiles(id) on delete set null,
  summary    text not null,
  created_at timestamptz not null default now()
);

alter table public.ai_summaries enable row level security;

drop policy if exists "ai_summaries: select own" on public.ai_summaries;
create policy "ai_summaries: select own"
  on public.ai_summaries for select
  using (auth.uid() = patient_id);

-- 9. Storage Bucket setup for medical-documents
insert into storage.buckets (id, name, public)
values ('medical-documents', 'medical-documents', false)
on conflict (id) do nothing;

drop policy if exists "Storage: patient read own folder" on storage.objects;
create policy "Storage: patient read own folder"
  on storage.objects for select
  using (
    bucket_id = 'medical-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Storage: patient insert own folder" on storage.objects;
create policy "Storage: patient insert own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'medical-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Storage: patient delete own folder" on storage.objects;
create policy "Storage: patient delete own folder"
  on storage.objects for delete
  using (
    bucket_id = 'medical-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

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
