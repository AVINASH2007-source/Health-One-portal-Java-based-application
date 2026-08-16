-- ==============================================================================
-- Migration 013: Role Confirmation Flow for Google OAuth
-- ==============================================================================
-- Problem: Google OAuth redirects away from the app, so raw_user_meta_data
-- never carries the user's chosen role, and handle_new_user() defaults every
-- OAuth signup to role = 'patient'. Since enforce_profile_role_immutable blocks
-- any role changes, this stuck role can never be corrected by the app.
--
-- Solution:
--   1. Add role_confirmed boolean to profiles (false = placeholder, may change once).
--   2. Update handle_new_user() to set role_confirmed = true on email/password
--      path (role is trustworthy) and role_confirmed = false on OAuth path.
--   3. Update enforce_profile_role_immutable() to allow exactly one role change
--      while role_confirmed = false, then lock it permanently.
--   4. Add confirm_pending_role(p_role) RPC callable by authenticated clients
--      to atomically confirm their real role after OAuth redirect.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Add role_confirmed column (safe to run on existing schema)
-- ------------------------------------------------------------------------------
alter table public.profiles
  add column if not exists role_confirmed boolean not null default false;

-- Back-fill: treat all existing confirmed rows as confirmed = true so the
-- immutability trigger continues to protect them as before.
-- (Only rows created by the new trigger going forward will start as false.)
update public.profiles
  set role_confirmed = true
  where role_confirmed = false;

-- ------------------------------------------------------------------------------
-- 2. Update handle_new_user() trigger function
-- ------------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_role      public.user_role;
  v_name      text;
  v_confirmed boolean;
begin
  -- Determine whether the signup included an explicit role choice.
  -- Email+password signups pass role in raw_user_meta_data; OAuth does not.
  if new.raw_user_meta_data ->> 'role' is not null then
    -- Trustworthy: user explicitly chose their role through the signup form.
    v_role      := (new.raw_user_meta_data ->> 'role')::public.user_role;
    v_confirmed := true;
  else
    -- OAuth path: role is unknown — use patient as a temporary placeholder.
    -- The client will call confirm_pending_role() after redirect to fix this.
    v_role      := 'patient';
    v_confirmed := false;
  end if;

  v_name := coalesce(
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'full_name',
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, role, name, email, role_confirmed)
  values (new.id, v_role, v_name, new.email, v_confirmed)
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Re-attach trigger (create or replace function does not touch triggers)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 3. Update enforce_profile_role_immutable() trigger function
-- ------------------------------------------------------------------------------
-- Allow exactly one role change while role_confirmed = false (the OAuth
-- confirmation window). Once role_confirmed flips to true the role is locked.
create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
security definer
as $$
begin
  -- If role is not changing, always allow.
  if new.role is not distinct from old.role then
    return new;
  end if;

  -- Role IS changing. Only allow it if the row is still unconfirmed.
  if old.role_confirmed = true then
    raise exception 'User role is immutable and cannot be changed.';
  end if;

  -- Unconfirmed row: allow the role change, but ensure role_confirmed
  -- is set to true by the end of this update so no further changes are
  -- possible through this path.
  new.role_confirmed := true;
  return new;
end;
$$;

-- Trigger already exists on public.profiles — recreate to pick up new function body.
drop trigger if exists enforce_profile_role_immutable on public.profiles;
create trigger enforce_profile_role_immutable
  before update on public.profiles
  for each row execute function public.prevent_profile_role_change();

-- ------------------------------------------------------------------------------
-- 4. Add confirm_pending_role() SECURITY DEFINER RPC
-- ------------------------------------------------------------------------------
create or replace function public.confirm_pending_role(p_role public.user_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_confirmed boolean;
begin
  -- Verify the calling user has a profile row.
  select role_confirmed
    into v_confirmed
    from public.profiles
   where id = (select auth.uid());

  if not found then
    raise exception 'No profile found for the current user.';
  end if;

  -- Guard: if already confirmed, refuse the call rather than silently no-op,
  -- so the client can distinguish "already done" from a real error.
  if v_confirmed = true then
    raise exception 'Role already confirmed, cannot change.';
  end if;

  -- Atomically set the real role and lock it.
  -- The enforce_profile_role_immutable trigger will also flip role_confirmed
  -- to true as a double-guard, but we set it explicitly here for clarity.
  update public.profiles
     set role           = p_role,
         role_confirmed = true
   where id = (select auth.uid());
end;
$$;

-- Grant only to authenticated users — anon callers must not be able to
-- call this function (they have no auth.uid() and no profile).
revoke all on function public.confirm_pending_role(public.user_role) from public;
grant execute on function public.confirm_pending_role(public.user_role) to authenticated;
