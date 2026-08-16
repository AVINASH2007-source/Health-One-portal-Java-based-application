-- Health-One: Patient Timeline tables, RLS policies, and unified view migration

-- 1. Create lab_reports table
create table if not exists public.lab_reports (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references auth.users(id) not null,
  report_type text not null,
  lab_name text,
  report_date date not null,
  result_summary text,
  file_url text,
  created_at timestamptz default now()
);

-- 2. Create vaccinations table
create table if not exists public.vaccinations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references auth.users(id) not null,
  vaccine_name text not null,
  dose_number int,
  administered_date date not null,
  administered_at text,
  created_at timestamptz default now()
);

-- 3. Create surgeries table
create table if not exists public.surgeries (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references auth.users(id) not null,
  surgery_type text not null,
  hospital_name text,
  surgeon text,
  surgery_date date not null,
  notes text,
  created_at timestamptz default now()
);

-- Enable RLS on all 3 tables
alter table public.lab_reports enable row level security;
alter table public.vaccinations enable row level security;
alter table public.surgeries enable row level security;

-- Policies for lab_reports
drop policy if exists "patients read own lab_reports" on public.lab_reports;
create policy "patients read own lab_reports" on public.lab_reports
  for select using (auth.uid() = patient_id);

drop policy if exists "patients insert own lab_reports" on public.lab_reports;
create policy "patients insert own lab_reports" on public.lab_reports
  for insert with check (auth.uid() = patient_id);

drop policy if exists "patients update own lab_reports" on public.lab_reports;
create policy "patients update own lab_reports" on public.lab_reports
  for update using (auth.uid() = patient_id);

-- Policies for vaccinations
drop policy if exists "patients read own vaccinations" on public.vaccinations;
create policy "patients read own vaccinations" on public.vaccinations
  for select using (auth.uid() = patient_id);

drop policy if exists "patients insert own vaccinations" on public.vaccinations;
create policy "patients insert own vaccinations" on public.vaccinations
  for insert with check (auth.uid() = patient_id);

drop policy if exists "patients update own vaccinations" on public.vaccinations;
create policy "patients update own vaccinations" on public.vaccinations
  for update using (auth.uid() = patient_id);

-- Policies for surgeries
drop policy if exists "patients read own surgeries" on public.surgeries;
create policy "patients read own surgeries" on public.surgeries
  for select using (auth.uid() = patient_id);

drop policy if exists "patients insert own surgeries" on public.surgeries;
create policy "patients insert own surgeries" on public.surgeries
  for insert with check (auth.uid() = patient_id);

drop policy if exists "patients update own surgeries" on public.surgeries;
create policy "patients update own surgeries" on public.surgeries
  for update using (auth.uid() = patient_id);

-- 4. Create unified timeline Postgres view with security_invoker enabled
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
  from public.surgeries;
