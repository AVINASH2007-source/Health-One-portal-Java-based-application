-- Health-One: Medication sources, verification status, and duration migration (Day 3)

-- 1. Add source, status, and duration columns to medications table
alter table public.medications
  add column if not exists source text default 'patient_added',
  add column if not exists status text default 'confirmed',
  add column if not exists duration text default null;

-- 2. RLS policies for medications table
alter table public.medications enable row level security;

-- Patient select policy (read own medications)
drop policy if exists "medications: select own" on public.medications;
create policy "medications: select own"
  on public.medications for select
  using (auth.uid() = patient_id);

-- Patient insert policy (insert self-added or AI-extracted medications)
drop policy if exists "medications: patient insert" on public.medications;
create policy "medications: patient insert"
  on public.medications for insert
  with check (
    auth.uid() = patient_id
    and source in ('patient_added', 'ai_extracted')
  );

-- Patient update policy (update self-added or AI-extracted medications or verify status)
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

-- Patient delete policy (delete self-added or AI-extracted medications)
drop policy if exists "medications: patient delete" on public.medications;
create policy "medications: patient delete"
  on public.medications for delete
  using (
    auth.uid() = patient_id
    and (source in ('patient_added', 'ai_extracted') or prescribed_by is null)
  );

-- Doctor/Hospital select policy
drop policy if exists "medications: doctor hospital select" on public.medications;
create policy "medications: doctor hospital select"
  on public.medications for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('doctor', 'hospital')
    )
  );
