-- Health-One: Patient Emergency Card, Access Logs & Public Lookup RPC

-- 1. Emergency Profile table
create table if not exists public.emergency_profile (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references auth.users(id) not null unique,
  blood_group text,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_code text not null unique default substr(md5(random()::text), 1, 8),
  updated_at timestamptz default now()
);

-- 2. Emergency Access Logs table
create table if not exists public.emergency_access_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references auth.users(id) not null,
  accessed_at timestamptz not null default now(),
  access_method text not null default 'qr',  -- 'qr' | 'manual_code'
  note text
);

-- Enable RLS
alter table public.emergency_profile enable row level security;
alter table public.emergency_access_logs enable row level security;

-- RLS Policies for emergency_profile
drop policy if exists "patients read own emergency profile" on public.emergency_profile;
create policy "patients read own emergency profile" on public.emergency_profile
  for select using (auth.uid() = patient_id);

drop policy if exists "patients update own emergency profile" on public.emergency_profile;
create policy "patients update own emergency profile" on public.emergency_profile
  for update using (auth.uid() = patient_id);

drop policy if exists "patients insert own emergency profile" on public.emergency_profile;
create policy "patients insert own emergency profile" on public.emergency_profile
  for insert with check (auth.uid() = patient_id);

-- RLS Policies for emergency_access_logs
drop policy if exists "patients read own access logs" on public.emergency_access_logs;
create policy "patients read own access logs" on public.emergency_access_logs
  for select using (auth.uid() = patient_id);

-- 3. Security Definer RPC function for unauthenticated responder access via code
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

  -- log this access
  insert into emergency_access_logs (patient_id, access_method)
  values (target_patient_id, 'qr');

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
