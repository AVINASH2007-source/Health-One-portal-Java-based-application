-- Health-One: Patient Records (Allergies & Diseases) Migration

-- 1. Create allergies table
create table if not exists public.allergies (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references auth.users(id) not null,
  allergen text not null,
  category text,              -- 'drug' | 'food' | 'environmental'
  severity text not null,     -- 'mild' | 'moderate' | 'severe'
  reaction_notes text,
  created_at timestamptz default now()
);

-- 2. Create diseases table
create table if not exists public.diseases (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references auth.users(id) not null,
  condition_name text not null,
  diagnosed_date date,
  status text default 'active',   -- 'active' | 'managed' | 'resolved'
  notes text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.allergies enable row level security;
alter table public.diseases enable row level security;

-- Policies for allergies
drop policy if exists "patients read own allergies" on public.allergies;
create policy "patients read own allergies" on public.allergies
  for select using (auth.uid() = patient_id);

drop policy if exists "patients insert own allergies" on public.allergies;
create policy "patients insert own allergies" on public.allergies
  for insert with check (auth.uid() = patient_id);

drop policy if exists "patients update own allergies" on public.allergies;
create policy "patients update own allergies" on public.allergies
  for update using (auth.uid() = patient_id);

-- Policies for diseases
drop policy if exists "patients read own diseases" on public.diseases;
create policy "patients read own diseases" on public.diseases
  for select using (auth.uid() = patient_id);

drop policy if exists "patients insert own diseases" on public.diseases;
create policy "patients insert own diseases" on public.diseases
  for insert with check (auth.uid() = patient_id);

drop policy if exists "patients update own diseases" on public.diseases;
create policy "patients update own diseases" on public.diseases
  for update using (auth.uid() = patient_id);
