-- ============================================================
-- HomeInventory – Supabase Schema
-- Run this in your Supabase SQL editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Households: the top-level account unit (one per family)
create table if not exists households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Household members: links auth.users to households with a role
create table if not exists household_members (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          text not null check (role in ('admin', 'member')),
  display_name  text,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  unique (household_id, user_id)
);

-- Locations: customizable rooms/areas within a household
create table if not exists locations (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  name          text not null,
  description   text,
  icon          text,   -- e.g. "home", "car", "briefcase"
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Items: the main catalog of household belongings
create table if not exists items (
  id                 uuid primary key default gen_random_uuid(),
  household_id       uuid not null references households(id) on delete cascade,
  location_id        uuid references locations(id) on delete set null,
  owner_id           uuid references household_members(id) on delete set null,
  name               text not null,
  description        text,
  brand              text,
  model              text,
  serial_number      text,
  upc_code           text,
  purchase_date      date,
  purchase_price     numeric(12, 2),
  currency           text not null default 'USD',
  current_value      numeric(12, 2),   -- for depreciation tracking (future)
  manual_url         text,
  notes              text,
  primary_photo_url  text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Item photos: multiple photos per item
create table if not exists item_photos (
  id            uuid primary key default gen_random_uuid(),
  item_id       uuid not null references items(id) on delete cascade,
  storage_path  text not null,
  url           text not null,
  is_primary    boolean not null default false,
  created_at    timestamptz not null default now()
);

-- Item receipts: photo or PDF receipts
create table if not exists item_receipts (
  id            uuid primary key default gen_random_uuid(),
  item_id       uuid not null references items(id) on delete cascade,
  storage_path  text not null,
  url           text not null,
  file_name     text,
  file_type     text check (file_type in ('image', 'pdf')),
  created_at    timestamptz not null default now()
);

-- Warranties: warranty details per item
create table if not exists warranties (
  id            uuid primary key default gen_random_uuid(),
  item_id       uuid not null references items(id) on delete cascade,
  provider      text,
  start_date    date,
  end_date      date,
  description   text,
  document_url  text,  -- link to warranty PDF/page
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Household invites: token-based invite system for adding family members
create table if not exists household_invites (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  email         text not null,
  role          text not null check (role in ('admin', 'member')),
  token         text unique not null default encode(gen_random_bytes(32), 'hex'),
  expires_at    timestamptz not null default now() + interval '7 days',
  accepted_at   timestamptz,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists items_household_id_idx   on items (household_id);
create index if not exists items_location_id_idx    on items (location_id);
create index if not exists items_upc_code_idx        on items (upc_code);
create index if not exists items_purchase_date_idx   on items (purchase_date);
create index if not exists warranties_item_id_idx    on warranties (item_id);
create index if not exists warranties_end_date_idx   on warranties (end_date);
create index if not exists item_photos_item_id_idx   on item_photos (item_id);
create index if not exists item_receipts_item_id_idx on item_receipts (item_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_households_updated_at
  before update on households
  for each row execute function update_updated_at();

create trigger update_locations_updated_at
  before update on locations
  for each row execute function update_updated_at();

create trigger update_items_updated_at
  before update on items
  for each row execute function update_updated_at();

create trigger update_warranties_updated_at
  before update on warranties
  for each row execute function update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table households        enable row level security;
alter table household_members enable row level security;
alter table locations         enable row level security;
alter table items             enable row level security;
alter table item_photos       enable row level security;
alter table item_receipts     enable row level security;
alter table warranties        enable row level security;
alter table household_invites enable row level security;

-- Helper: check if current user is a member of a given household
create or replace function is_household_member(hid uuid)
returns boolean as $$
  select exists (
    select 1 from household_members
    where household_id = hid and user_id = auth.uid()
  );
$$ language sql security definer;

-- Helper: check if current user is an admin of a given household
create or replace function is_household_admin(hid uuid)
returns boolean as $$
  select exists (
    select 1 from household_members
    where household_id = hid and user_id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

-- ── households ──────────────────────────────────────────────
create policy "Authenticated users can create a household"
  on households for insert
  with check (auth.uid() is not null);

create policy "Members can view their household"
  on households for select
  using (is_household_member(id));

create policy "Admins can update their household"
  on households for update
  using (is_household_admin(id));

-- ── household_members ────────────────────────────────────────
create policy "Users can add themselves to a household"
  on household_members for insert
  with check (auth.uid() is not null and user_id = auth.uid());

create policy "Members can view household members"
  on household_members for select
  using (is_household_member(household_id));

create policy "Members can update their own record"
  on household_members for update
  using (user_id = auth.uid());

create policy "Admins can manage members"
  on household_members for all
  using (is_household_admin(household_id));

-- ── locations ────────────────────────────────────────────────
create policy "Members can view locations"
  on locations for select
  using (is_household_member(household_id));

create policy "Members can insert locations"
  on locations for insert
  with check (is_household_member(household_id));

create policy "Members can update locations"
  on locations for update
  using (is_household_member(household_id));

create policy "Admins can delete locations"
  on locations for delete
  using (is_household_admin(household_id));

-- ── items ────────────────────────────────────────────────────
create policy "Members can view items"
  on items for select
  using (is_household_member(household_id));

create policy "Members can insert items"
  on items for insert
  with check (is_household_member(household_id));

create policy "Members can update items"
  on items for update
  using (is_household_member(household_id));

create policy "Admins can delete items"
  on items for delete
  using (is_household_admin(household_id));

-- ── item_photos ──────────────────────────────────────────────
create policy "Members can view item photos"
  on item_photos for select
  using (
    item_id in (
      select id from items where is_household_member(household_id)
    )
  );

create policy "Members can insert item photos"
  on item_photos for insert
  with check (
    item_id in (
      select id from items where is_household_member(household_id)
    )
  );

create policy "Members can delete item photos"
  on item_photos for delete
  using (
    item_id in (
      select id from items where is_household_member(household_id)
    )
  );

-- ── item_receipts ─────────────────────────────────────────────
create policy "Members can view item receipts"
  on item_receipts for select
  using (
    item_id in (
      select id from items where is_household_member(household_id)
    )
  );

create policy "Members can insert item receipts"
  on item_receipts for insert
  with check (
    item_id in (
      select id from items where is_household_member(household_id)
    )
  );

create policy "Members can delete item receipts"
  on item_receipts for delete
  using (
    item_id in (
      select id from items where is_household_member(household_id)
    )
  );

-- ── warranties ───────────────────────────────────────────────
create policy "Members can view warranties"
  on warranties for select
  using (
    item_id in (
      select id from items where is_household_member(household_id)
    )
  );

create policy "Members can insert warranties"
  on warranties for insert
  with check (
    item_id in (
      select id from items where is_household_member(household_id)
    )
  );

create policy "Members can update warranties"
  on warranties for update
  using (
    item_id in (
      select id from items where is_household_member(household_id)
    )
  );

-- ── household_invites ─────────────────────────────────────────
create policy "Admins can manage invites"
  on household_invites for all
  using (is_household_admin(household_id));

-- Allow unauthenticated lookup by token (for invite acceptance flow)
create policy "Anyone can view invite by token"
  on household_invites for select
  to anon
  using (accepted_at is null and expires_at > now());

-- ============================================================
-- STORAGE BUCKETS
-- (Run these separately or via Supabase dashboard Storage tab)
-- ============================================================
-- insert into storage.buckets (id, name, public) values ('item-photos', 'item-photos', true);
-- insert into storage.buckets (id, name, public) values ('item-receipts', 'item-receipts', false);
-- insert into storage.buckets (id, name, public) values ('item-documents', 'item-documents', false);
