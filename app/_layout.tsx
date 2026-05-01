import { useEffect } from 'react'
import { Platform } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import * as Linking from 'expo-linking'
import { useColorScheme } from '@/hooks/useColorScheme'
import { useSession } from '@/hooks/useSession'
import { supabase } from '@/lib/supabase'

// Prevent the splash screen from auto-hiding until auth state is known.
// Wrapped in try/catch because SplashScreen is a no-op during static rendering.
try { SplashScreen.preventAutoHideAsync() } catch {}

// Parses the hash fragment from a Supabase auth deep link and establishes
// a session. Called on native only — web uses detectSessionInUrl instead.
//
// Supabase redirects to:  homeinventory://#access_token=xxx&refresh_token=xxx&...
async function processAuthDeepLink(url: string | null) {
  if (!url) return
  const hash = url.split('#')[1]
  if (!hash) return
  const params = new URLSearchParams(hash)
  const accessToken  = params.get('access_token')
  const refreshToken = params.get('refresh_token')
  if (accessToken && refreshToken) {
    await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
  }
}

export default function RootLayout() {
  const { loading } = useSession()
  const colorScheme = useColorScheme()

  // Hide splash once auth state resolves
  useEffect(() => {
    if (!loading) SplashScreen.hideAsync()
  }, [loading])

  // Native deep-link handler for email confirmation callbacks.
  // On web, detectSessionInUrl:true in supabase.ts handles this automatically.
  useEffect(() => {
    if (Platform.OS === 'web') return

    // Cold-start: app was opened directly from the confirmation link
    Linking.getInitialURL().then(processAuthDeepLink)

    // Warm-start: app was already open when the link was tapped
    const sub = Linking.addEventListener('url', e => processAuthDeepLink(e.url))
    return () => sub.remove()
  }, [])

  if (loading) return null

  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="onboarding" />
      </Stack>
    </>
  )
}
