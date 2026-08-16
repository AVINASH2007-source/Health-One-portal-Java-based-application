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
  id          uuid primary key references auth.users (id) on delete cascade,
  role        public.user_role not null default 'patient',
  name        text not null,
  email       text not null,
  hospital_id uuid references public.profiles(id) default null,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Profile RLS policies
drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own"
  on public.profiles for select
  using (
    auth.uid() = id
    or role = 'doctor'
    or exists (
      select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'hospital'
    )
  );

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles: insert self" on public.profiles;
create policy "profiles: insert self"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles: hospital links unassigned doctor" on public.profiles;
create policy "profiles: hospital links unassigned doctor"
  on public.profiles for update
  using (role = 'doctor' and (hospital_id is null or hospital_id = auth.uid()))
  with check (hospital_id = auth.uid());

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

-- 4. Doctors table
create table if not exists public.doctors (
  id                   uuid primary key references public.profiles(id) on delete cascade,
  medical_license_id   text unique not null,
  specialty            text not null,
  hospital_affiliation text default null,
  created_at           timestamptz not null default now()
);

alter table public.doctors enable row level security;

drop policy if exists "doctors: public read authenticated" on public.doctors;
create policy "doctors: public read authenticated"
  on public.doctors for select
  using (auth.role() = 'authenticated');

drop policy if exists "doctors: insert self" on public.doctors;
create policy "doctors: insert self"
  on public.doctors for insert
  with check (auth.uid() = id);

drop policy if exists "doctors: update self" on public.doctors;
create policy "doctors: update self"
  on public.doctors for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 5. Appointments table
create table if not exists public.appointments (
  id         uuid primary key default gen_random_uuid(),
  doctor_id  uuid not null references public.profiles(id) on delete cascade,
  patient_id uuid not null references public.profiles(id) on delete cascade,
  time       timestamptz not null,
  reason     text not null,
  status     text not null default 'pending' check (status in ('pending', 'scheduled', 'completed', 'cancelled', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.appointments enable row level security;

drop policy if exists "appointments: patient select" on public.appointments;
create policy "appointments: patient select"
  on public.appointments for select
  using (auth.uid() = patient_id);

drop policy if exists "appointments: doctor select" on public.appointments;
create policy "appointments: doctor select"
  on public.appointments for select
  using (auth.uid() = doctor_id);

drop policy if exists "appointments: patient insert" on public.appointments;
create policy "appointments: patient insert"
  on public.appointments for insert
  with check (auth.uid() = patient_id);

drop policy if exists "appointments: doctor insert" on public.appointments;
create policy "appointments: doctor insert"
  on public.appointments for insert
  with check (auth.uid() = doctor_id);

drop policy if exists "appointments: doctor update" on public.appointments;
create policy "appointments: doctor update"
  on public.appointments for update
  using (auth.uid() = doctor_id)
  with check (auth.uid() = doctor_id);

drop policy if exists "appointments: patient update" on public.appointments;
create policy "appointments: patient update"
  on public.appointments for update
  using (
    auth.uid() = patient_id
    and status = 'pending'
  )
  with check (
    auth.uid() = patient_id
  );

-- 6. Access Grants table (patient access delegation)
create table if not exists public.access_grants (
  id         uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  doctor_id  uuid not null references public.profiles(id) on delete cascade,
  scope      text not null default 'full', -- 'full', 'timeline', 'medications'
  granted_at timestamptz not null default now(),
  expires_at timestamptz default null,
  constraint unique_patient_doctor_grant unique (patient_id, doctor_id)
);

alter table public.access_grants enable row level security;

drop policy if exists "access_grants: patient select" on public.access_grants;
create policy "access_grants: patient select"
  on public.access_grants for select
  using (auth.uid() = patient_id);

drop policy if exists "access_grants: doctor select" on public.access_grants;
create policy "access_grants: doctor select"
  on public.access_grants for select
  using (auth.uid() = doctor_id);

drop policy if exists "access_grants: patient insert" on public.access_grants;
create policy "access_grants: patient insert"
  on public.access_grants for insert
  with check (auth.uid() = patient_id);

drop policy if exists "access_grants: patient delete" on public.access_grants;
create policy "access_grants: patient delete"
  on public.access_grants for delete
  using (auth.uid() = patient_id);

-- 7. Emergency Access Log Table
create table if not exists public.emergency_access_log (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.profiles(id) on delete cascade,
  accessed_by   uuid default null references public.profiles(id) on delete set null,
  access_reason text not null,
  created_at    timestamptz not null default now()
);

alter table public.emergency_access_log enable row level security;

drop policy if exists "emergency_access_log: select own or doctor" on public.emergency_access_log;
create policy "emergency_access_log: select own or doctor"
  on public.emergency_access_log for select
  using (
    auth.uid() = patient_id
    or auth.uid() = accessed_by
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('doctor', 'hospital')
    )
  );

drop policy if exists "emergency_access_log: insert authenticated" on public.emergency_access_log;
create policy "emergency_access_log: insert authenticated"
  on public.emergency_access_log for insert
  with check (auth.uid() is not null);

-- 8. Departments table
create table if not exists public.departments (
  id          uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now()
);

alter table public.departments enable row level security;

drop policy if exists "departments: hospital manages own" on public.departments;
create policy "departments: hospital manages own"
  on public.departments for all
  using (hospital_id = auth.uid())
  with check (hospital_id = auth.uid());

-- 9. Audit Logs table
create table if not exists public.audit_logs (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references public.profiles(id),
  patient_id uuid references public.profiles(id),
  action     text not null,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

drop policy if exists "audit_logs: hospital reads all" on public.audit_logs;
create policy "audit_logs: hospital reads all"
  on public.audit_logs for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'hospital'
    )
  );

drop policy if exists "audit_logs: authenticated users insert" on public.audit_logs;
create policy "audit_logs: authenticated users insert"
  on public.audit_logs for insert
  with check (auth.uid() = actor_id);

-- 10. Records table
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

drop policy if exists "records: rbac select" on public.records;
create policy "records: rbac select"
  on public.records for select
  using (
    auth.uid() = patient_id
    or auth.uid() = doctor_id
    or auth.uid() = uploaded_by
    or exists (
      select 1 from public.access_grants ag
      where ag.patient_id = records.patient_id
      and ag.doctor_id = auth.uid()
      and (ag.expires_at is null or ag.expires_at > now())
    )
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'hospital'
    )
  );

drop policy if exists "records: patient insert self upload" on public.records;
create policy "records: patient insert self upload"
  on public.records for insert
  with check (
    auth.uid() = patient_id
    and auth.uid() = uploaded_by
    and doctor_id is null
  );

drop policy if exists "records: doctor insert" on public.records;
create policy "records: doctor insert"
  on public.records for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'doctor'
    )
    and (doctor_id = auth.uid() or uploaded_by = auth.uid())
  );

drop policy if exists "records: patient delete self upload" on public.records;
create policy "records: patient delete self upload"
  on public.records for delete
  using (
    auth.uid() = patient_id
    and auth.uid() = uploaded_by
  );

-- 11. Medications table
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

drop policy if exists "medications: rbac select" on public.medications;
create policy "medications: rbac select"
  on public.medications for select
  using (
    auth.uid() = patient_id
    or auth.uid() = prescribed_by
    or exists (
      select 1 from public.access_grants ag
      where ag.patient_id = medications.patient_id
      and ag.doctor_id = auth.uid()
      and (ag.expires_at is null or ag.expires_at > now())
    )
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'hospital'
    )
  );

drop policy if exists "medications: patient insert" on public.medications;
create policy "medications: patient insert"
  on public.medications for insert
  with check (
    auth.uid() = patient_id
    and source in ('patient_added', 'ai_extracted')
  );

drop policy if exists "medications: doctor insert" on public.medications;
create policy "medications: doctor insert"
  on public.medications for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'doctor'
    )
    and prescribed_by = auth.uid()
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

-- 12. Emergency Cards table
create table if not exists public.emergency_cards (
  patient_id              uuid primary key references public.profiles(id) on delete cascade,
  blood_type              text default 'O+',
  allergies               text[] default '{}',
  conditions              text[] default '{}',
  emergency_contact_name  text default '',
  emergency_contact_phone text default '',
  updated_at              timestamptz not null default now()
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

-- 13. AI Summaries table
create table if not exists public.ai_summaries (
  id         uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  doctor_id  uuid default null references public.profiles(id) on delete set null,
  summary    text not null,
  created_at timestamptz not null default now()
);

alter table public.ai_summaries enable row level security;

drop policy if exists "ai_summaries: select own or doctor" on public.ai_summaries;
create policy "ai_summaries: select own or doctor"
  on public.ai_summaries for select
  using (
    auth.uid() = patient_id
    or auth.uid() = doctor_id
    or exists (
      select 1 from public.access_grants ag
      where ag.patient_id = ai_summaries.patient_id
      and ag.doctor_id = auth.uid()
    )
  );

-- 14. Storage Bucket setup for medical-documents
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

-- 15. Unified Hospital Audit View (cross-cutting audit log for Member 3)
create or replace view public.hospital_audit_view as
  -- Emergency Access Overrides
  select
    eal.id as log_id,
    'emergency_access' as event_type,
    eal.accessed_by as actor_id,
    doc_prof.name as actor_name,
    eal.patient_id,
    pat_prof.name as patient_name,
    eal.access_reason as details,
    eal.created_at
  from public.emergency_access_log eal
  left join public.profiles doc_prof on doc_prof.id = eal.accessed_by
  left join public.profiles pat_prof on pat_prof.id = eal.patient_id

  union all

  -- Clinical Visit Entries & Uploads
  select
    r.id as log_id,
    'clinical_record_created' as event_type,
    coalesce(r.doctor_id, r.uploaded_by) as actor_id,
    doc_prof.name as actor_name,
    r.patient_id,
    pat_prof.name as patient_name,
    r.title || ' (' || r.record_type || ')' as details,
    r.created_at
  from public.records r
  left join public.profiles doc_prof on doc_prof.id = coalesce(r.doctor_id, r.uploaded_by)
  left join public.profiles pat_prof on pat_prof.id = r.patient_id
  where r.doctor_id is not null or r.uploaded_by is not null

  union all

  -- Prescriptions Prescribed
  select
    m.id as log_id,
    'prescription_issued' as event_type,
    m.prescribed_by as actor_id,
    doc_prof.name as actor_name,
    m.patient_id,
    pat_prof.name as patient_name,
    'Prescribed ' || m.name || ' ' || m.dosage as details,
    m.created_at
  from public.medications m
  left join public.profiles doc_prof on doc_prof.id = m.prescribed_by
  left join public.profiles pat_prof on pat_prof.id = m.patient_id
  where m.prescribed_by is not null

  union all

  -- AI Summary Generation
  select
    s.id as log_id,
    'ai_summary_generated' as event_type,
    s.doctor_id as actor_id,
    doc_prof.name as actor_name,
    s.patient_id,
    pat_prof.name as patient_name,
    'Generated AI summary' as details,
    s.created_at
  from public.ai_summaries s
  left join public.profiles doc_prof on doc_prof.id = s.doctor_id
  left join public.profiles pat_prof on pat_prof.id = s.patient_id
  where s.doctor_id is not null;
