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
    settings.tsx            Members, invite, sign out
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
  reset.sql                 Drops all tables (use before re-running schema.sql)
  seed.sql                  Reference seed data
```

---

## Supabase Setup

### 1. Run the schema

In **Supabase SQL Editor**, run `supabase/schema.sql`. This creates:
- 8 tables: `households`, `household_members`, `locations`, `items`, `item_photos`, `item_receipts`, `warranties`, `household_invites`
- Indexes, `updated_at` triggers, Row Level Security policies
- Helper functions: `is_household_member()`, `is_household_admin()`

### 2. Run the household creation function

Run `supabase/schema_patch_003.sql`. This creates the `create_household_for_user` SECURITY DEFINER function used during onboarding. This is required — without it, new user setup will fail with an RLS error.

### 3. Create storage buckets

In **Supabase Dashboard → Storage**, create three buckets:

| Bucket name | Public? |
|-------------|---------|
| `item-photos` | Yes |
| `item-receipts` | No |
| `item-documents` | No |

### 4. Use the anon key

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

---

## Planned Next Features

- Receipt photo/PDF upload on item detail screen
- Warranty add/edit form on item detail screen
- Item edit screen (reuse add form)
- Invite acceptance flow (deep link handler)
- Push notifications for warranty expiry
- Export report as PDF/CSV
