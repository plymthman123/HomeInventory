-- ============================================================
-- Patch 002: Replace 'to authenticated' role qualifier with
-- explicit auth.uid() checks — more reliable in React Native
-- ============================================================

-- households
drop policy if exists "Authenticated users can create a household" on households;
create policy "Authenticated users can create a household"
  on households for insert
  with check (auth.uid() is not null);

-- household_members
drop policy if exists "Users can add themselves to a household" on household_members;
create policy "Users can add themselves to a household"
  on household_members for insert
  with check (auth.uid() is not null and user_id = auth.uid());
