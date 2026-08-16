-- Health-One: Patient Overview tables and RLS policies Migration

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references auth.users(id) not null,
  hospital_name text not null,
  doctor_name text,
  department text,
  visit_date date not null,
  symptoms text,
  diagnosis text,
  treatment text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references auth.users(id) not null,
  medicine_name text not null,
  dosage text,
  frequency text,
  duration text,
  doctor_name text,
  start_date date,
  end_date date,
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references auth.users(id) not null,
  name text not null,
  dose text,
  frequency text,
  next_dose_at timestamptz,
  active boolean default true,
  created_at timestamptz default now()
);

-- Ensure columns exist if medications table was previously initialized with different names
alter table public.medications add column if not exists dose text;
alter table public.medications add column if not exists next_dose_at timestamptz;
alter table public.medications add column if not exists active boolean default true;

create table if not exists public.vitals (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references auth.users(id) not null,
  recorded_at timestamptz not null default now(),
  heart_rate int,
  spo2 int,
  bp_systolic int,
  bp_diastolic int,
  sleep_minutes int,
  steps int
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references auth.users(id) not null,
  doctor_name text not null,
  department text,
  scheduled_at timestamptz not null,
  reason text,
  status text default 'upcoming',
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.visits enable row level security;
alter table public.prescriptions enable row level security;
alter table public.medications enable row level security;
alter table public.vitals enable row level security;
alter table public.appointments enable row level security;

-- RLS Policies for visits
drop policy if exists "patients read own visits" on public.visits;
create policy "patients read own visits" on public.visits
  for select using (auth.uid() = patient_id);

drop policy if exists "patients insert own visits" on public.visits;
create policy "patients insert own visits" on public.visits
  for insert with check (auth.uid() = patient_id);

drop policy if exists "patients update own visits" on public.visits;
create policy "patients update own visits" on public.visits
  for update using (auth.uid() = patient_id);

-- RLS Policies for prescriptions
drop policy if exists "patients read own prescriptions" on public.prescriptions;
create policy "patients read own prescriptions" on public.prescriptions
  for select using (auth.uid() = patient_id);

drop policy if exists "patients insert own prescriptions" on public.prescriptions;
create policy "patients insert own prescriptions" on public.prescriptions
  for insert with check (auth.uid() = patient_id);

drop policy if exists "patients update own prescriptions" on public.prescriptions;
create policy "patients update own prescriptions" on public.prescriptions
  for update using (auth.uid() = patient_id);

-- RLS Policies for medications
drop policy if exists "patients read own medications" on public.medications;
create policy "patients read own medications" on public.medications
  for select using (auth.uid() = patient_id);

drop policy if exists "patients insert own medications" on public.medications;
create policy "patients insert own medications" on public.medications
  for insert with check (auth.uid() = patient_id);

drop policy if exists "patients update own medications" on public.medications;
create policy "patients update own medications" on public.medications
  for update using (auth.uid() = patient_id);

-- RLS Policies for vitals
drop policy if exists "patients read own vitals" on public.vitals;
create policy "patients read own vitals" on public.vitals
  for select using (auth.uid() = patient_id);

drop policy if exists "patients insert own vitals" on public.vitals;
create policy "patients insert own vitals" on public.vitals
  for insert with check (auth.uid() = patient_id);

drop policy if exists "patients update own vitals" on public.vitals;
create policy "patients update own vitals" on public.vitals
  for update using (auth.uid() = patient_id);

-- RLS Policies for appointments
drop policy if exists "patients read own appointments" on public.appointments;
create policy "patients read own appointments" on public.appointments
  for select using (auth.uid() = patient_id);

drop policy if exists "patients insert own appointments" on public.appointments;
create policy "patients insert own appointments" on public.appointments
  for insert with check (auth.uid() = patient_id);

drop policy if exists "patients update own appointments" on public.appointments;
create policy "patients update own appointments" on public.appointments
  for update using (auth.uid() = patient_id);
