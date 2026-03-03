-- ============================================================
-- Patch 001: Add missing INSERT policies
-- Run this in the Supabase SQL Editor if you already ran schema.sql
-- (schema.sql has been updated to include these going forward)
-- ============================================================

-- Allow any authenticated user to create a new household
-- (needed when a new user sets up their account for the first time)
create policy "Authenticated users can create a household"
  on households for insert
  to authenticated
  with check (true);

-- Allow an authenticated user to add themselves to a household
-- (needed for the onboarding flow — the user inserts their own member record)
create policy "Users can add themselves to a household"
  on household_members for insert
  to authenticated
  with check (user_id = auth.uid());
