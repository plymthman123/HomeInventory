# HomeInventory — Project Summary

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile app | Expo 54 + Expo Router 6 (file-based routing), TypeScript, React Native 0.81 |
| Web app | Same codebase via react-native-web, deployed to Vercel |
| Backend / Auth / DB | Supabase (PostgreSQL + RLS + Storage) |
| Auth tokens | expo-secure-store (native) / AsyncStorage (web fallback) |
| Barcode lookup | UPCitemdb free API |

---

## Project Structure

```
app/
  _layout.tsx               Root layout (splash screen guard)
  onboarding.tsx            Household setup screen (shown on first login)
  (auth)/                   Unauthenticated routes
    login.tsx
    register.tsx
    forgot-password.tsx
  (app)/                    Authenticated tab/sidebar navigator
    _layout.tsx             Shows sidebar on tablet+/web, tab bar on mobile
    index.tsx               Dashboard (stats + quick actions)
    items/
      index.tsx             Item list with search
      add.tsx               Add item form (photo, barcode params)
      scan.tsx              Barcode scanner → UPC lookup
      [id].tsx              Item detail + delete
    locations.tsx           Location list + add modal
    reports.tsx             Value by location + warranty expiry
    settings.tsx            Members, invite, sign out, account/household deletion
components/
  Sidebar.tsx               Desktop/tablet sidebar navigation
  PageContainer.tsx         Centres + caps content width on web (960px max)
hooks/
  useSession.ts             Reactive auth session hook
  useColorScheme.ts         Light/dark theme hook
  useBreakpoint.ts          Responsive breakpoints (mobile/tablet/desktop)
lib/
  supabase.ts               Supabase client singleton (SecureStore + AsyncStorage)
  household.ts              Household creation via RPC
types/
  database.types.ts         TypeScript types for all DB tables + RPC functions
constants/
  Colors.ts                 Light/dark theme palette
supabase/
  schema.sql                Full DB schema + RLS policies (source of truth)
  schema_patch_003.sql      create_household_for_user SECURITY DEFINER function
  schema_patch_004.sql      cleanup_account + cleanup_household_delete functions
  reset.sql                 Drops all tables (use before re-running schema.sql)
  seed.sql                  Reference seed data
  functions/
    delete-user/
      index.ts              Edge Function — deletes auth accounts via GoTrue Admin API
```

---

## Supabase Setup

### 1. Run the schema

In **Supabase SQL Editor**, run `supabase/schema.sql`. This creates:
- 8 tables: `households`, `household_members`, `locations`, `items`, `item_photos`, `item_receipts`, `warranties`, `household_invites`
- Indexes, `updated_at` triggers, Row Level Security policies
- Helper functions: `is_household_member()`, `is_household_admin()`

### 2. Run the schema patches

Run each patch in order in the **SQL Editor**:

| Patch | Purpose |
|-------|---------|
| `schema_patch_003.sql` | `create_household_for_user` — required for onboarding |
| `schema_patch_004.sql` | `cleanup_account` + `cleanup_household_delete` — required for account deletion |

### 3. Create storage buckets

In **Supabase Dashboard → Storage**, create three buckets:

| Bucket name | Public? |
|-------------|---------|
| `item-photos` | Yes |
| `item-receipts` | No |
| `item-documents` | No |

### 4. Deploy the Edge Function

The `delete-user` Edge Function handles account deletion through GoTrue's Admin API. Install the Supabase CLI via Homebrew (not npm), then deploy once:

```bash
brew install supabase/tap/supabase
supabase login
supabase link --project-ref <your-project-ref>   # ref = subdomain in your Supabase URL
supabase functions deploy delete-user
```

This is a one-time deploy. The function lives on Supabase's infrastructure and is called by both the mobile and web app — no Vercel or EAS changes needed.

### 5. Use the anon key

In **Supabase Dashboard → Settings → API**, copy the **anon public** key. Never use the service role key in the app.

---

## Running Locally

### Install dependencies

```bash
npm install
```

> `legacy-peer-deps=true` is set in `.npmrc` — you do not need to add this flag manually.

### Configure environment

```bash
cp .env.example .env.local
# Fill in:
# EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Run on mobile (Expo Go)

```bash
npx expo start
```

Scan the QR code with **Expo Go** on your phone. Expo Go requires SDK 54 — update it from the App Store if prompted.

### Run on web (browser)

```bash
npm run web
# or
npx expo start --web
```

---

## Auth & Onboarding Flow

1. **Register** → creates auth account only (no household yet)
2. **Email confirmation** → user clicks link in email
3. **Login** → app checks if user has a household membership
4. **No household** → redirected to `/onboarding` to name their household
5. **Onboarding** → calls `create_household_for_user` RPC, which atomically creates the household, adds the user as admin, and seeds 8 default locations
6. **Main app** → redirected to dashboard

> The household is created via a `SECURITY DEFINER` database function to avoid a Supabase RLS chicken-and-egg issue (you can't SELECT a household you just created until you're a member of it).

---

## Responsive Web Layout

The app is fully responsive using a single codebase:

| Breakpoint | Navigation | Content width |
|------------|-----------|---------------|
| Mobile (< 768px) | Bottom tab bar | Full width |
| Tablet (768–1023px) | Sidebar (220px) | Full width |
| Desktop (≥ 1024px) | Sidebar (220px) | Max 960px, centred |

---

## Deploying to Vercel (Web)

1. Push the repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → import the repo
3. Vercel auto-detects `vercel.json` — no build settings to change
4. Add environment variables under **Settings → Environment Variables**:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
5. Click **Deploy**

To build locally before deploying:
```bash
npm run build:web
# Output goes to dist/
```

---

## Deploying to App Stores (Mobile)

Use [Expo EAS](https://docs.expo.dev/eas/):

```bash
npm install -g eas-cli
eas build --platform all
eas submit --platform all
```

Before submitting, update `app.json`:
- `ios.bundleIdentifier` — e.g. `com.yourdomain.homeinventory`
- `android.package` — e.g. `com.yourdomain.homeinventory`

---

## Resetting the Database

To wipe all data and start fresh:
1. Run `supabase/reset.sql` in the SQL Editor
2. Delete test users in **Authentication → Users**
3. Re-run `supabase/schema.sql`
4. Re-run `supabase/schema_patch_003.sql`
5. Re-run `supabase/schema_patch_004.sql`

> The Edge Function does not need to be redeployed — it is unaffected by a database reset.

---

## Account Deletion

Both admins and members can delete their account from **Settings → Account → Delete Account**. The flow:

1. **Choose item disposition** (skipped if sole member of household):
   - *Transfer to another member* — select which member receives ownership of your items
   - *Delete items I own* — permanently removes items where you are the owner

2. **Confirm** — shows a plain-English summary of what will be deleted, then calls the `delete-user` Edge Function.

**Admin-only: Delete Household & All Accounts** (Settings → Danger Zone):
- Wipes all items, photos, warranties, locations, and invites via cascade
- Deletes every member's auth account
- Irreversible — shown only to admins

Edge cases handled automatically:
- If the departing admin is the only admin, the oldest remaining member is auto-promoted
- If the departing user is the sole household member, the household is deleted automatically

### How deletion works internally

The app uses a two-step approach to avoid leaving emails stuck in Supabase's auth system:

1. **`cleanup_account` / `cleanup_household_delete` RPC** — handles all data (item transfer, admin promotion, household cascade). Does not touch `auth.users`.
2. **`delete-user` Edge Function** — calls `supabase.auth.admin.deleteUser()` through GoTrue's Admin API, which properly purges email state so the address can be reused for new registrations immediately.

> Do not delete users via direct SQL (`DELETE FROM auth.users`) — this bypasses GoTrue and leaves the email address permanently locked out of re-registration.

### Debugging stuck emails (SQL Editor)

If a test account's email can't be reused, run these in the **Supabase SQL Editor** to check for leftover auth state:

```sql
-- Check if the user record still exists
SELECT id, email, email_confirmed_at, created_at
FROM auth.users
WHERE email = 'stuck@example.com';

-- Check for orphaned identity records
SELECT * FROM auth.identities
WHERE email = 'stuck@example.com';

-- Check for lingering confirmation tokens
SELECT * FROM auth.one_time_tokens
WHERE relates_to = 'stuck@example.com';
```

If any rows are returned, a hard delete will cascade and clean everything up:

```sql
DELETE FROM auth.users WHERE email = 'stuck@example.com';
```

If no rows exist and the confirmation email still doesn't arrive, the issue is **Supabase's project-wide email rate limit** (≈ 2–3 emails/hour on the free plan), not leftover data. The fastest workaround during development:

**Supabase Dashboard → Authentication → Settings → disable "Enable email confirmations"**

Re-enable before going to production.

---

## Planned Next Features

- Receipt photo/PDF upload on item detail screen
- Warranty add/edit form on item detail screen
- Item edit screen (reuse add form)
- Invite acceptance flow (deep link handler)
- Push notifications for warranty expiry
- Export report as PDF/CSV
