-- ============================================================
-- Patch 003: SECURITY DEFINER function for household creation
--
-- This replaces direct table inserts for onboarding.
-- The function runs with postgres-level privileges, so it
-- bypasses RLS — the chicken-and-egg problem is resolved because
-- the INSERT into households, the INSERT into household_members,
-- and the SELECT to return the household all happen inside
-- a single privileged function call.
-- ============================================================

create or replace function create_household_for_user(
  p_user_id       uuid,
  p_household_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
begin
  -- Verify the caller is who they claim to be
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if auth.uid() <> p_user_id then
    raise exception 'User ID mismatch';
  end if;

  -- Create the household
  insert into households (name)
  values (p_household_name)
  returning id into v_household_id;

  -- Add the user as admin
  insert into household_members (household_id, user_id, role)
  values (v_household_id, p_user_id, 'admin');

  -- Seed default locations
  insert into locations (household_id, name, icon) values
    (v_household_id, 'Living Room', 'sofa'),
    (v_household_id, 'Kitchen',     'chef-hat'),
    (v_household_id, 'Bedroom',     'bed'),
    (v_household_id, 'Garage',      'car'),
    (v_household_id, 'Office',      'briefcase'),
    (v_household_id, 'Basement',    'archive-box'),
    (v_household_id, 'Attic',       'home'),
    (v_household_id, 'Outdoor',     'tree-pine');

  return v_household_id;
end;
$$;

-- Allow any authenticated user to call this function
grant execute on function create_household_for_user(uuid, text) to authenticated;
