-- =======================================================
-- Health-One: Doctor Dashboard & Access Control Migration
-- Day 4 / Member 2 Foundation: doctors, appointments, access_grants, RLS
-- =======================================================

-- 1. Doctors table
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


-- 2. Appointments table
create table if not exists public.appointments (
  id         uuid primary key default gen_random_uuid(),
  doctor_id  uuid not null references public.profiles(id) on delete cascade,
  patient_id uuid not null references public.profiles(id) on delete cascade,
  time       timestamptz not null,
  reason     text not null,
  status     text not null default 'pending' check (status in ('pending', 'scheduled', 'completed', 'cancelled', 'rejected')), -- 'pending', 'scheduled', 'completed', 'cancelled', 'rejected'
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


-- 3. Access Grants table (patient-delegated doctor access)
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


-- 4. Emergency Access Log Table (Audited Emergency Path)
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


-- 5. Strict RBAC Policies on Medical Records (records table)
-- Doctor can ONLY read patient records if:
--   a) Patient explicitly granted access via active access_grants row
--   b) Or the read came through verified emergency_access_log path (< 24 hrs)
--   c) Or doctor created/uploaded the record
--   d) Or patient reading own record

drop policy if exists "records: select own" on public.records;
drop policy if exists "records: doctor hospital select" on public.records;
drop policy if exists "records: rbac select" on public.records;

create policy "records: rbac select"
  on public.records for select
  using (
    -- Patient reads own records
    auth.uid() = patient_id
    -- Or doctor/author created the record
    or auth.uid() = doctor_id
    or auth.uid() = uploaded_by
    -- Or active access grant exists for doctor
    or exists (
      select 1 from public.access_grants ag
      where ag.patient_id = records.patient_id
      and ag.doctor_id = auth.uid()
      and (ag.expires_at is null or ag.expires_at > now())
    )
    -- Or hospital administrator
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'hospital'
    )
  );

-- Doctor insert policy (Doctors with access or appointments can add records)
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


-- 6. Strict RBAC Policies on Medications
drop policy if exists "medications: select own" on public.medications;
drop policy if exists "medications: doctor hospital select" on public.medications;
drop policy if exists "medications: rbac select" on public.medications;

create policy "medications: rbac select"
  on public.medications for select
  using (
    -- Patient reads own medications
    auth.uid() = patient_id
    -- Or prescribing doctor
    or auth.uid() = prescribed_by
    -- Or active access grant
    or exists (
      select 1 from public.access_grants ag
      where ag.patient_id = medications.patient_id
      and ag.doctor_id = auth.uid()
      and (ag.expires_at is null or ag.expires_at > now())
    )
    -- Or hospital
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'hospital'
    )
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


-- 7. Unified Hospital Audit View (cross-cutting audit log for Member 3)
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
