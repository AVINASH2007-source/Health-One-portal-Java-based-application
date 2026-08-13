-- Health-One: shared Supabase schema (Day 1 setup)
-- Run this in the Supabase SQL editor for your project.

-- 1. Role enum, matches src/lib/navConfig.ts `Role`
create type public.user_role as enum ('patient', 'doctor', 'hospital');

-- 2. profiles table, 1:1 with auth.users
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  role       public.user_role not null,
  name       text not null,
  email      text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Everyone can read their own profile (needed right after login to route by role).
create policy "profiles: read own"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own profile. This also covers the Google OAuth
-- first-login case: the trigger below can't know which portal (role) the
-- person picked before redirecting to Google, so the client patches `role`
-- once, right after the very first sign-in — see AuthContext.tsx.
create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 3. Auto-create a profile row whenever someone signs up (email/password OR Google).
-- `role` and `name` are pulled from the auth user's metadata:
--   - email/password signup: passed explicitly via supabase.auth.signUp({ options: { data: { role, name } } })
--   - Google OAuth signup:   role is stashed client-side before redirect (see AuthContext.tsx)
--     and written to auth.users.user_metadata via supabase.auth.updateUser() right after the
--     first callback, then this trigger picks it up. `name` falls back to Google's `full_name`.
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Shared foreign key convention going forward: every table owned by a
-- patient's record uses `patient_id uuid references public.profiles(id)`.
-- e.g. later: create table public.records (id uuid default gen_random_uuid() primary key,
--   patient_id uuid not null references public.profiles(id), ...);
