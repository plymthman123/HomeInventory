-- ============================================================
-- Patch 004: Account & Household Deletion
--
-- Provides two SECURITY DEFINER functions so authenticated users
-- can delete their own account (with optional item transfer) and
-- admins can optionally nuke the entire household.
--
-- Both functions run with postgres-level privileges so they can
-- DELETE from auth.users, which requires bypassing RLS.
-- ============================================================

-- delete_account
-- Called by any authenticated user who wants to leave.
--
-- p_transfer_to_member_id  – household_members.id to receive owned items.
--                            NULL means items.owner_id becomes NULL (unassigned).
-- p_delete_my_items        – true means permanently delete items owned by caller.
--
-- If the caller is the sole admin with no other members the household
-- itself is also deleted (cascades items, locations, invites).
-- If the caller is the sole admin with other members the oldest other
-- member is promoted to admin before the caller is removed.
create or replace function delete_account(
  p_transfer_to_member_id uuid    default null,
  p_delete_my_items       boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id        uuid;
  v_household_id     uuid;
  v_other_admins     int;
  v_other_members    int;
begin
  -- Resolve the caller's member record
  select id, household_id
  into   v_member_id, v_household_id
  from   household_members
  where  user_id = auth.uid();

  if v_member_id is null then
    raise exception 'User is not a member of any household';
  end if;

  -- Handle item disposition before the cascade wipes the member row
  if p_transfer_to_member_id is not null then
    if not exists (
      select 1 from household_members
      where  id = p_transfer_to_member_id
      and    household_id = v_household_id
    ) then
      raise exception 'Transfer target must be in the same household';
    end if;
    update items set owner_id = p_transfer_to_member_id where owner_id = v_member_id;
  elsif p_delete_my_items then
    delete from items where owner_id = v_member_id;
  end if;
  -- If neither: the FK ON DELETE SET NULL handles it automatically.

  -- Admin housekeeping
  if exists (
    select 1 from household_members
    where  id = v_member_id and role = 'admin'
  ) then
    select count(*) into v_other_members
    from   household_members
    where  household_id = v_household_id and id <> v_member_id;

    if v_other_members = 0 then
      -- Sole member: wipe the whole household (items, locations cascade)
      delete from households where id = v_household_id;
    else
      select count(*) into v_other_admins
      from   household_members
      where  household_id = v_household_id and role = 'admin' and id <> v_member_id;

      if v_other_admins = 0 then
        -- Promote the longest-standing remaining member
        update household_members
        set    role = 'admin'
        where  id = (
          select id from household_members
          where  household_id = v_household_id and id <> v_member_id
          order  by created_at asc
          limit  1
        );
      end if;
    end if;
  end if;

  -- Deleting from auth.users cascades to household_members, which sets
  -- items.owner_id = NULL via the FK ON DELETE SET NULL.
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function delete_account(uuid, boolean) to authenticated;


-- delete_household_and_account
-- Admin-only nuclear option: deletes the entire household, every member's
-- auth account, and the caller's account.
create or replace function delete_household_and_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id    uuid;
  v_current_user_id uuid;
  v_other_uid       uuid;
begin
  v_current_user_id := auth.uid();

  select household_id
  into   v_household_id
  from   household_members
  where  user_id = v_current_user_id and role = 'admin';

  if v_household_id is null then
    raise exception 'Only household admins can delete the household';
  end if;

  -- Remove other members' auth accounts first so the cascade on
  -- household_members doesn't race with the household deletion.
  for v_other_uid in
    select user_id
    from   household_members
    where  household_id = v_household_id and user_id <> v_current_user_id
  loop
    delete from auth.users where id = v_other_uid;
  end loop;

  -- Wipe the household (cascades: items, locations, invites, household_members)
  delete from households where id = v_household_id;

  -- Remove the admin's own auth account last
  delete from auth.users where id = v_current_user_id;
end;
$$;

grant execute on function delete_household_and_account() to authenticated;
