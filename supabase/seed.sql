-- ============================================================
-- HomeInventory – Seed Data
-- Run AFTER schema.sql. Used for local development.
-- ============================================================

-- Default location templates (not tied to a specific household —
-- the app creates these for each new household on signup)
-- These are just reference names the app can seed per-household.

-- Example: after a household is created with id '<hid>', run:
-- insert into locations (household_id, name, icon) values
--   ('<hid>', 'Living Room',  'sofa'),
--   ('<hid>', 'Kitchen',      'chef-hat'),
--   ('<hid>', 'Bedroom',      'bed'),
--   ('<hid>', 'Garage',       'car'),
--   ('<hid>', 'Office',       'briefcase'),
--   ('<hid>', 'Basement',     'archive'),
--   ('<hid>', 'Attic',        'home'),
--   ('<hid>', 'Outdoor',      'tree');

-- The app handles this automatically in the onboarding flow.
