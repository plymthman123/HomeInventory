-- ============================================================
-- HomeInventory – Full Reset
-- WARNING: This drops ALL app data and tables.
-- Run this in the Supabase SQL Editor, then re-run schema.sql
-- ============================================================

-- Drop tables in reverse dependency order (children before parents)
drop table if exists item_receipts       cascade;
drop table if exists item_photos         cascade;
drop table if exists warranties          cascade;
drop table if exists items               cascade;
drop table if exists household_invites   cascade;
drop table if exists locations           cascade;
drop table if exists household_members   cascade;
drop table if exists households          cascade;

-- Drop helper functions
drop function if exists is_household_member(uuid);
drop function if exists is_household_admin(uuid);
drop function if exists update_updated_at();
