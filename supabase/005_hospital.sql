-- Health-One: Hospital Dashboard Schema Migration (005_hospital.sql)

-- 1. Add hospital_id to profiles to link doctors to a hospital
alter table public.profiles 
  add column if not exists hospital_id uuid references public.profiles(id);

-- RLS Policy: Hospital can link an unassigned doctor
drop policy if exists "profiles: hospital links unassigned doctor" on public.profiles;
create policy "profiles: hospital links unassigned doctor" 
  on public.profiles for update 
  using (role = 'doctor' and (hospital_id is null or hospital_id = auth.uid())) 
  with check (hospital_id = auth.uid());

-- RLS Policy: Hospital/authenticated users can read doctor profiles for lookup & staff list
drop policy if exists "profiles: read doctors for hospital" on public.profiles;
create policy "profiles: read doctors for hospital" 
  on public.profiles for select 
  using (
    role = 'doctor' 
    or auth.uid() = id 
    or exists (
      select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'hospital'
    )
  );

-- 2. Create the departments table
create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.departments enable row level security;

drop policy if exists "departments: hospital manages own" on public.departments;
create policy "departments: hospital manages own" 
  on public.departments for all 
  using (hospital_id = auth.uid()) 
  with check (hospital_id = auth.uid());

-- 3. Create the audit_logs table
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  patient_id uuid references public.profiles(id),
  action text not null,
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
