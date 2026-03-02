# HomeInventory — Project Summary

## What Was Built

### Config & Setup

| File | Purpose |
|------|---------|
| `package.json` | All dependencies (Expo 52, Supabase, Camera, etc.) |
| `app.json` | Expo config with camera/photo permissions |
| `tsconfig.json` | TypeScript with `@/*` path alias |
| `babel.config.js` | Expo + Reanimated babel preset |
| `.env.example` | Environment variable template |

### Database

| File | Purpose |
|------|---------|
| `supabase/schema.sql` | Full DB schema: 8 tables, indexes, RLS policies, helper functions |
| `supabase/seed.sql` | Reference seed data |

### Core Libraries

| File | Purpose |
|------|---------|
| `lib/supabase.ts` | Supabase client with SecureStore token encryption |
| `lib/household.ts` | Household creation + auto-seeds 8 default locations |
| `types/database.types.ts` | Full TypeScript types for all DB tables |
| `constants/Colors.ts` | Light/dark theme palette |
| `hooks/useSession.ts` | Reactive auth session hook |
| `hooks/useColorScheme.ts` | Theme color hook |

### Screens (12 total)

**Auth**
- `app/(auth)/login.tsx` — Email/password sign in
- `app/(auth)/register.tsx` — Account + household creation
- `app/(auth)/forgot-password.tsx` — Password reset via email

**App (authenticated)**
- `app/(app)/index.tsx` — Dashboard with stats and quick actions
- `app/(app)/items/index.tsx` — Item list with live search
- `app/(app)/items/add.tsx` — Add item form (photo, camera, location picker)
- `app/(app)/items/scan.tsx` — Barcode scanner with UPC auto-lookup
- `app/(app)/items/[id].tsx` — Item detail with warranty, receipts, delete
- `app/(app)/locations.tsx` — Location list with add modal
- `app/(app)/reports.tsx` — Value by location + warranty expiry tracker
- `app/(app)/settings.tsx` — Household members, invite, sign out

---

## Next Steps to Run It

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up Supabase**
   - Create a free project at [supabase.com](https://supabase.com)
   - In the SQL Editor, run `supabase/schema.sql`
   - In Storage, create three buckets:
     - `item-photos` (public)
     - `item-receipts` (private)
     - `item-documents` (private)

3. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
   ```

4. **Start the app**
   ```bash
   npx expo start
   ```
   Scan the QR code with the **Expo Go** app on your phone, or press `i`/`a` for simulators.

---

## Planned Next Features

- Receipt photo/PDF upload on item detail screen
- Warranty add/edit form on item detail screen
- Item edit screen (reuse add form)
- Invite acceptance flow (deep link handler)
- Push notifications for warranty expiry
- Export report as PDF/CSV
