# HomeInventory

A cross-platform mobile app (iOS & Android) for managing your household item inventory.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile app | [Expo](https://expo.dev) (React Native) with [Expo Router](https://expo.github.io/router) |
| Backend / Auth / DB | [Supabase](https://supabase.com) |
| Storage | Supabase Storage (S3-compatible) |
| Barcode lookup | [UPCitemdb](https://upcitemdb.com) |

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. In the SQL Editor, run `supabase/schema.sql`
3. In Storage, create three buckets:
   - `item-photos` (public)
   - `item-receipts` (private)
   - `item-documents` (private)

### 3. Configure environment

```bash
cp .env.example .env.local
# Fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
```

### 4. Start the app

```bash
npx expo start
```

Scan the QR code with the **Expo Go** app on your phone, or press `i` for iOS simulator / `a` for Android emulator.

## Project Structure

```
app/
  (auth)/          # Login, register, forgot-password screens
  (app)/           # Authenticated tab navigator
    index.tsx      # Dashboard
    items/         # Item list, detail, add, barcode scan
    locations.tsx  # Location management
    reports.tsx    # Value reports & warranty tracker
    settings.tsx   # Household members, invite, sign out
lib/
  supabase.ts      # Supabase client (with SecureStore token storage)
  household.ts     # Household creation & helpers
types/
  database.types.ts # TypeScript types matching the DB schema
supabase/
  schema.sql       # Full database schema + RLS policies
  seed.sql         # Reference seed data
constants/
  Colors.ts        # Light/dark theme palette
hooks/
  useSession.ts    # Auth session hook
  useColorScheme.ts # Theme hooks
```

## Features

- **Add items** manually, by camera photo, or by scanning a UPC barcode
- **Organize by location** (Living Room, Garage, Office, etc. — fully customizable)
- **Track** purchase date, price, warranty, serial number, manual links, receipts
- **Reports** showing total value by location and upcoming warranty expirations
- **Multi-user** household with admin/member roles and email invite system
- **Secure** — encrypted token storage, Row-Level Security enforced at DB layer

## Deploying to App Stores

Use [Expo EAS](https://docs.expo.dev/eas/) for managed builds:

```bash
npm install -g eas-cli
eas build --platform all
eas submit --platform all
```
