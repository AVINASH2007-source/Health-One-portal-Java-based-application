-- ==============================================================================
-- Health-One: Consolidated Master Database Schema (CONSOLIDATED_schema.sql)
-- Single Source of Truth for Supabase Database Configuration
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Custom Types & Enums
-- ------------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('patient', 'doctor', 'hospital');
exception
  when duplicate_object then null;
end $$;

-- ------------------------------------------------------------------------------
-- 2. Core Profiles Table (Root User Entity)
-- ------------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        public.user_role not null default 'patient',
  name        text not null,
  email       text not null,
  hospital_id uuid references public.profiles(id) default null,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Helper function: returns the current user's role without querying profiles
-- through RLS (SECURITY DEFINER bypasses policies, preventing infinite recursion
-- when this function is called from within a profiles policy).
create or replace function public.get_my_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.profiles
  where id = (select auth.uid());
$$;

grant execute on function public.get_my_role() to authenticated;

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own"
  on public.profiles for select
  using (
    auth.uid() = id
    or public.get_my_role() = 'doctor'
    or public.get_my_role() = 'hospital'
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

-- Trigger: Auto-create profile on auth.users signup
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

-- ------------------------------------------------------------------------------
-- 3. Hospital Infrastructure: Departments
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 4. Doctor Profiles & Registry
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 5. Appointments Table (Source of truth: 012_appointments_schema.sql)
-- ------------------------------------------------------------------------------
create table if not exists public.appointments (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid not null references public.profiles(id) on delete cascade,
  doctor_id        uuid references public.profiles(id) on delete cascade,
  doctor_name      text,
  specialization   text,
  hospital_name    text,
  appointment_type text default 'in_person',
  time             timestamptz not null default now(),
  reason           text not null default 'General Checkup',
  doctor_notes     text,
  status           text not null default 'pending' check (status in ('pending', 'scheduled', 'upcoming', 'completed', 'cancelled', 'rejected')),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create index if not exists idx_appointments_patient_id on public.appointments(patient_id);
create index if not exists idx_appointments_doctor_id on public.appointments(doctor_id);
create index if not exists idx_appointments_status on public.appointments(status);

alter table public.appointments enable row level security;

drop policy if exists "appointments: patient select" on public.appointments;
create policy "appointments: patient select"
  on public.appointments for select
  using (auth.uid() = patient_id);

drop policy if exists "appointments: doctor select" on public.appointments;
create policy "appointments: doctor select"
  on public.appointments for select
  using (auth.uid() = doctor_id or doctor_id is null);

drop policy if exists "appointments: patient insert" on public.appointments;
create policy "appointments: patient insert"
  on public.appointments for insert
  with check (auth.uid() = patient_id);

drop policy if exists "appointments: doctor insert" on public.appointments;
create policy "appointments: doctor insert"
  on public.appointments for insert
  with check (auth.uid() = doctor_id);

drop policy if exists "appointments: patient update" on public.appointments;
create policy "appointments: patient update"
  on public.appointments for update
  using (auth.uid() = patient_id)
  with check (auth.uid() = patient_id);

drop policy if exists "appointments: doctor update" on public.appointments;
create policy "appointments: doctor update"
  on public.appointments for update
  using (auth.uid() = doctor_id or doctor_id is null)
  with check (auth.uid() = doctor_id or doctor_id is null);

-- ------------------------------------------------------------------------------
-- 6. Access Grants Table (Patient Access Delegation)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 7. Emergency Access Log Table (Audited Emergency Path)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 8. Emergency Profile & Emergency Cards Tables
-- ------------------------------------------------------------------------------
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

-- Legacy emergency_profile table with unique emergency_code
create table if not exists public.emergency_profile (
  id                      uuid primary key default gen_random_uuid(),
  patient_id              uuid not null unique references public.profiles(id) on delete cascade,
  blood_group             text,
  emergency_contact_name  text,
  emergency_contact_phone text,
  emergency_code          text not null unique default substr(md5(random()::text), 1, 8),
  updated_at              timestamptz default now()
);

alter table public.emergency_profile enable row level security;

drop policy if exists "patients read own emergency profile" on public.emergency_profile;
create policy "patients read own emergency profile"
  on public.emergency_profile for select
  using (auth.uid() = patient_id);

drop policy if exists "patients update own emergency profile" on public.emergency_profile;
create policy "patients update own emergency profile"
  on public.emergency_profile for update
  using (auth.uid() = patient_id);

drop policy if exists "patients insert own emergency profile" on public.emergency_profile;
create policy "patients insert own emergency profile"
  on public.emergency_profile for insert
  with check (auth.uid() = patient_id);

-- ------------------------------------------------------------------------------
-- 9. Medical Records Table
-- ------------------------------------------------------------------------------
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
    and (uploaded_by is null or auth.uid() = uploaded_by)
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
    and (uploaded_by is null or auth.uid() = uploaded_by)
  );

-- ------------------------------------------------------------------------------
-- 10. Medications Table
-- ------------------------------------------------------------------------------
create table if not exists public.medications (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.profiles(id) on delete cascade,
  prescribed_by uuid default null references public.profiles(id) on delete set null,
  name          text not null,
  dosage        text not null default '',
  dose          text,
  frequency     text not null default '',
  duration      text default null,
  source        text default 'patient_added',
  status        text default 'confirmed',
  start_date    date not null default current_date,
  end_date      date default null,
  next_dose_at  timestamptz,
  active        boolean default true,
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
  )
  with check (
    auth.uid() = patient_id
  );

drop policy if exists "medications: patient delete" on public.medications;
create policy "medications: patient delete"
  on public.medications for delete
  using (
    auth.uid() = patient_id
  );

-- ------------------------------------------------------------------------------
-- 11. Patient Clinical History: Visits, Prescriptions, Vitals
-- ------------------------------------------------------------------------------
create table if not exists public.visits (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.profiles(id) on delete cascade,
  hospital_name text not null,
  doctor_name   text,
  department    text,
  visit_date    date not null,
  symptoms      text,
  diagnosis     text,
  treatment     text,
  notes         text,
  created_at    timestamptz default now()
);

alter table public.visits enable row level security;

drop policy if exists "visits: patient read own" on public.visits;
create policy "visits: patient read own"
  on public.visits for select
  using (auth.uid() = patient_id);

drop policy if exists "visits: patient insert own" on public.visits;
create policy "visits: patient insert own"
  on public.visits for insert
  with check (auth.uid() = patient_id);

drop policy if exists "visits: patient update own" on public.visits;
create policy "visits: patient update own"
  on public.visits for update
  using (auth.uid() = patient_id);

-- Prescriptions
create table if not exists public.prescriptions (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.profiles(id) on delete cascade,
  medicine_name text not null,
  dosage        text,
  frequency     text,
  duration      text,
  doctor_name   text,
  start_date    date,
  end_date      date,
  status        text default 'active',
  created_at    timestamptz default now()
);

alter table public.prescriptions enable row level security;

drop policy if exists "prescriptions: patient read own" on public.prescriptions;
create policy "prescriptions: patient read own"
  on public.prescriptions for select
  using (auth.uid() = patient_id);

drop policy if exists "prescriptions: patient insert own" on public.prescriptions;
create policy "prescriptions: patient insert own"
  on public.prescriptions for insert
  with check (auth.uid() = patient_id);

drop policy if exists "prescriptions: patient update own" on public.prescriptions;
create policy "prescriptions: patient update own"
  on public.prescriptions for update
  using (auth.uid() = patient_id);

-- Vitals
create table if not exists public.vitals (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.profiles(id) on delete cascade,
  recorded_at   timestamptz not null default now(),
  heart_rate    int,
  spo2          int,
  bp_systolic   int,
  bp_diastolic  int,
  sleep_minutes int,
  steps         int
);

alter table public.vitals enable row level security;

drop policy if exists "vitals: patient read own" on public.vitals;
create policy "vitals: patient read own"
  on public.vitals for select
  using (auth.uid() = patient_id);

drop policy if exists "vitals: patient insert own" on public.vitals;
create policy "vitals: patient insert own"
  on public.vitals for insert
  with check (auth.uid() = patient_id);

drop policy if exists "vitals: patient update own" on public.vitals;
create policy "vitals: patient update own"
  on public.vitals for update
  using (auth.uid() = patient_id);

-- ------------------------------------------------------------------------------
-- 12. Patient Timeline Specialized Tables: Lab Reports, Vaccinations, Surgeries
-- ------------------------------------------------------------------------------
create table if not exists public.lab_reports (
  id             uuid primary key default gen_random_uuid(),
  patient_id     uuid not null references public.profiles(id) on delete cascade,
  report_type    text not null,
  lab_name       text,
  report_date    date not null,
  result_summary text,
  file_url       text,
  created_at     timestamptz default now()
);

alter table public.lab_reports enable row level security;

drop policy if exists "lab_reports: patient read own" on public.lab_reports;
create policy "lab_reports: patient read own"
  on public.lab_reports for select
  using (auth.uid() = patient_id);

drop policy if exists "lab_reports: patient insert own" on public.lab_reports;
create policy "lab_reports: patient insert own"
  on public.lab_reports for insert
  with check (auth.uid() = patient_id);

drop policy if exists "lab_reports: patient update own" on public.lab_reports;
create policy "lab_reports: patient update own"
  on public.lab_reports for update
  using (auth.uid() = patient_id);

-- Vaccinations
create table if not exists public.vaccinations (
  id                uuid primary key default gen_random_uuid(),
  patient_id        uuid not null references public.profiles(id) on delete cascade,
  vaccine_name      text not null,
  dose_number       int,
  administered_date date not null,
  administered_at   text,
  created_at        timestamptz default now()
);

alter table public.vaccinations enable row level security;

drop policy if exists "vaccinations: patient read own" on public.vaccinations;
create policy "vaccinations: patient read own"
  on public.vaccinations for select
  using (auth.uid() = patient_id);

drop policy if exists "vaccinations: patient insert own" on public.vaccinations;
create policy "vaccinations: patient insert own"
  on public.vaccinations for insert
  with check (auth.uid() = patient_id);

drop policy if exists "vaccinations: patient update own" on public.vaccinations;
create policy "vaccinations: patient update own"
  on public.vaccinations for update
  using (auth.uid() = patient_id);

-- Surgeries
create table if not exists public.surgeries (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.profiles(id) on delete cascade,
  surgery_type  text not null,
  hospital_name text,
  surgeon       text,
  surgery_date  date not null,
  notes         text,
  created_at    timestamptz default now()
);

alter table public.surgeries enable row level security;

drop policy if exists "surgeries: patient read own" on public.surgeries;
create policy "surgeries: patient read own"
  on public.surgeries for select
  using (auth.uid() = patient_id);

drop policy if exists "surgeries: patient insert own" on public.surgeries;
create policy "surgeries: patient insert own"
  on public.surgeries for insert
  with check (auth.uid() = patient_id);

drop policy if exists "surgeries: patient update own" on public.surgeries;
create policy "surgeries: patient update own"
  on public.surgeries for update
  using (auth.uid() = patient_id);

-- ------------------------------------------------------------------------------
-- 13. Health Conditions & Allergies: Allergies, Diseases
-- ------------------------------------------------------------------------------
create table if not exists public.allergies (
  id             uuid primary key default gen_random_uuid(),
  patient_id     uuid not null references public.profiles(id) on delete cascade,
  allergen       text not null,
  category       text,              -- 'drug' | 'food' | 'environmental'
  severity       text not null,     -- 'mild' | 'moderate' | 'severe'
  reaction_notes text,
  created_at     timestamptz default now()
);

alter table public.allergies enable row level security;

drop policy if exists "allergies: patient read own" on public.allergies;
create policy "allergies: patient read own"
  on public.allergies for select
  using (auth.uid() = patient_id);

drop policy if exists "allergies: patient insert own" on public.allergies;
create policy "allergies: patient insert own"
  on public.allergies for insert
  with check (auth.uid() = patient_id);

drop policy if exists "allergies: patient update own" on public.allergies;
create policy "allergies: patient update own"
  on public.allergies for update
  using (auth.uid() = patient_id);

-- Diseases
create table if not exists public.diseases (
  id             uuid primary key default gen_random_uuid(),
  patient_id     uuid not null references public.profiles(id) on delete cascade,
  condition_name text not null,
  diagnosed_date date,
  status         text default 'active',   -- 'active' | 'managed' | 'resolved'
  notes          text,
  created_at     timestamptz default now()
);

alter table public.diseases enable row level security;

drop policy if exists "diseases: patient read own" on public.diseases;
create policy "diseases: patient read own"
  on public.diseases for select
  using (auth.uid() = patient_id);

drop policy if exists "diseases: patient insert own" on public.diseases;
create policy "diseases: patient insert own"
  on public.diseases for insert
  with check (auth.uid() = patient_id);

drop policy if exists "diseases: patient update own" on public.diseases;
create policy "diseases: patient update own"
  on public.diseases for update
  using (auth.uid() = patient_id);

-- ------------------------------------------------------------------------------
-- 14. Patient Preferences (Language & Accessibility)
-- ------------------------------------------------------------------------------
create table if not exists public.patient_preferences (
  patient_id          uuid primary key references public.profiles(id) on delete cascade,
  language            text default 'en',
  voice_assistance    boolean default true,
  auto_translate_docs boolean default true,
  updated_at          timestamptz default now()
);

alter table public.patient_preferences enable row level security;

drop policy if exists "patient_preferences: read own" on public.patient_preferences;
create policy "patient_preferences: read own"
  on public.patient_preferences for select
  using (auth.uid() = patient_id);

drop policy if exists "patient_preferences: insert own" on public.patient_preferences;
create policy "patient_preferences: insert own"
  on public.patient_preferences for insert
  with check (auth.uid() = patient_id);

drop policy if exists "patient_preferences: update own" on public.patient_preferences;
create policy "patient_preferences: update own"
  on public.patient_preferences for update
  using (auth.uid() = patient_id);

-- ------------------------------------------------------------------------------
-- 15. AI Summaries Table
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 16. Audit Logs Table (Hospital Administration)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 17. Security Definer RPC Functions
-- ------------------------------------------------------------------------------

-- Emergency card lookup by emergency code (unauthenticated / QR responder access)
create or replace function public.get_emergency_card(code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
  target_patient_id uuid;
begin
  select patient_id into target_patient_id
  from emergency_profile where emergency_code = code;

  if target_patient_id is null then
    return null;
  end if;

  -- Log this emergency access in the unified emergency_access_log table
  insert into emergency_access_log (patient_id, access_reason)
  values (target_patient_id, 'Public Emergency QR / Code Scan Access');

  select json_build_object(
    'blood_group', ep.blood_group,
    'emergency_contact_name', ep.emergency_contact_name,
    'emergency_contact_phone', ep.emergency_contact_phone,
    'allergies', (select coalesce(json_agg(json_build_object(
        'allergen', a.allergen, 'severity', a.severity
      )), '[]'::json) from allergies a where a.patient_id = target_patient_id),
    'conditions', (select coalesce(json_agg(json_build_object(
        'condition_name', d.condition_name, 'status', d.status
      )), '[]'::json) from diseases d where d.patient_id = target_patient_id and d.status != 'resolved'),
    'medications', (select coalesce(json_agg(json_build_object(
        'name', m.name, 'dose', m.dose
      )), '[]'::json) from medications m where m.patient_id = target_patient_id and m.active = true)
  ) into result
  from emergency_profile ep where ep.patient_id = target_patient_id;

  return result;
end;
$$;

grant execute on function public.get_emergency_card(text) to anon, authenticated;

-- Scoped Emergency Card Function (for Doctor & Verified Responder lookup)
create or replace function public.get_emergency_card_scoped(target_patient_id uuid)
returns table (
  patient_id              uuid,
  blood_type              text,
  allergies               text[],
  conditions              text[],
  emergency_contact_name  text,
  emergency_contact_phone text
)
language plpgsql
security definer
as $$
begin
  return query
  select
    ec.patient_id,
    ec.blood_type,
    ec.allergies,
    ec.conditions,
    ec.emergency_contact_name,
    ec.emergency_contact_phone
  from public.emergency_cards ec
  where ec.patient_id = target_patient_id;
end;
$$;

grant execute on function public.get_emergency_card_scoped(uuid) to anon, authenticated;

-- ------------------------------------------------------------------------------
-- 18. Database Views
-- ------------------------------------------------------------------------------

-- Unified Patient Timeline View
create or replace view public.patient_timeline_view
with (security_invoker = true) as
  select id, patient_id, 'visit' as category, visit_date as event_date,
         hospital_name as place, coalesce(diagnosis, 'Visit') as title
  from public.visits
  union all
  select id, patient_id, 'prescription' as category, start_date as event_date,
         doctor_name as place, medicine_name || ' prescribed' as title
  from public.prescriptions
  union all
  select id, patient_id, 'lab' as category, report_date as event_date,
         lab_name as place, report_type || ' — results uploaded' as title
  from public.lab_reports
  union all
  select id, patient_id, 'vaccination' as category, administered_date as event_date,
         administered_at as place, vaccine_name as title
  from public.vaccinations
  union all
  select id, patient_id, 'surgery' as category, surgery_date as event_date,
         hospital_name as place, surgery_type as title
  from public.surgeries
  union all
  select id, patient_id, 'document' as category, occurred_at::date as event_date,
         'Uploaded File' as place, title
  from public.records;

-- Unified Hospital Cross-Cutting Audit View
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

-- ------------------------------------------------------------------------------
-- 19. Storage Bucket & Policies: 'medical-documents' (Private Storage)
-- ------------------------------------------------------------------------------
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
