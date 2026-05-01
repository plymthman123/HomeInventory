import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'
import { Database } from '@/types/database.types'

// Three environments:
//  1. Node.js / static rendering (no window)  → no-op storage (no session at build time)
//  2. Web browser                              → AsyncStorage (localStorage-backed)
//  3. Native iOS / Android                     → SecureStore (device keychain)
const isServerRender = typeof window === 'undefined'

const storage = isServerRender
  ? {
      getItem:    (_key: string) => Promise.resolve(null),
      setItem:    (_key: string, _value: string) => Promise.resolve(),
      removeItem: (_key: string) => Promise.resolve(),
    }
  : Platform.OS === 'web'
  ? AsyncStorage
  : {
      getItem:    (key: string) => SecureStore.getItemAsync(key),
      setItem:    (key: string, value: string) => SecureStore.setItemAsync(key, value),
      removeItem: (key: string) => SecureStore.deleteItemAsync(key),
    }

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[supabase] EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY is not set.'
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    // On web, Supabase reads the #access_token hash from the URL automatically
    // after email confirmation redirects back to the app.
    // On native we handle deep links manually in app/_layout.tsx.
    detectSessionInUrl: Platform.OS === 'web',
  },
})
