-- Health-One: Patient Preferences Migration for Language & Regional Settings

create table if not exists public.patient_preferences (
  patient_id uuid primary key references auth.users(id) on delete cascade,
  language text default 'en',
  voice_assistance boolean default true,
  auto_translate_docs boolean default true,
  updated_at timestamptz default now()
);

alter table public.patient_preferences enable row level security;

drop policy if exists "patients read own preferences" on public.patient_preferences;
create policy "patients read own preferences" on public.patient_preferences
  for select using (auth.uid() = patient_id);

drop policy if exists "patients upsert own preferences" on public.patient_preferences;
create policy "patients upsert own preferences" on public.patient_preferences
  for insert with check (auth.uid() = patient_id);

drop policy if exists "patients update own preferences" on public.patient_preferences;
create policy "patients update own preferences" on public.patient_preferences
  for update using (auth.uid() = patient_id);
