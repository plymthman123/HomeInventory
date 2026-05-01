-- ============================================================
-- Patch 004: Account & Household Deletion (data-only cleanup)
--
-- These functions handle ONLY the data side of deletion:
-- item transfer/removal, admin promotion, household cascade.
--
-- Auth user deletion is intentionally NOT done here.
-- It is performed by the `delete-user` Edge Function via
-- supabase.auth.admin.deleteUser(), which goes through GoTrue
-- and properly cleans up email state so the address can be
-- reused for new registrations immediately.
-- ============================================================

-- cleanup_account
--
-- Called before deleting a user's auth account. Handles:
--   • Item transfer or deletion for items owned by the caller
--   • Auto-promoting the oldest remaining member to admin if needed
--   • Wiping the whole household (cascade) if the caller is the sole member
--
-- Does NOT touch auth.users — that is the Edge Function's job.
create or replace function cleanup_account(
  p_transfer_to_member_id uuid    default null,
  p_delete_my_items       boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id     uuid;
  v_household_id  uuid;
  v_other_admins  int;
  v_other_members int;
begin
  select id, household_id
  into   v_member_id, v_household_id
  from   household_members
  where  user_id = auth.uid();

  if v_member_id is null then
    raise exception 'User is not a member of any household';
  end if;

  -- Item disposition
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
  -- Otherwise items.owner_id stays as-is; the FK ON DELETE SET NULL will null
  -- it out automatically when the household_members row is removed later.

  -- Admin housekeeping (only when caller is an admin)
  if exists (
    select 1 from household_members
    where  id = v_member_id and role = 'admin'
  ) then
    select count(*) into v_other_members
    from   household_members
    where  household_id = v_household_id and id <> v_member_id;

    if v_other_members = 0 then
      -- Sole member: delete the household so items/locations/invites are
      -- all removed by cascade before the auth account goes away.
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
end;
$$;

grant execute on function cleanup_account(uuid, boolean) to authenticated;


-- cleanup_household_delete
--
-- Admin-only. Collects every member's user_id, then deletes the household
-- (cascades to items, locations, household_members, invites).
-- Returns the array of user_ids so the Edge Function can delete each
-- auth account through GoTrue.
create or replace function cleanup_household_delete()
returns uuid[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_user_ids     uuid[];
begin
  select household_id
  into   v_household_id
  from   household_members
  where  user_id = auth.uid() and role = 'admin';

  if v_household_id is null then
    raise exception 'Only household admins can delete the household';
  end if;

  select array_agg(user_id)
  into   v_user_ids
  from   household_members
  where  household_id = v_household_id;

  -- Cascade removes items, locations, household_members, invites
  delete from households where id = v_household_id;

  return coalesce(v_user_ids, '{}');
end;
$$;

grant execute on function cleanup_household_delete() to authenticated;
