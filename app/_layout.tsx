import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { useColorScheme } from '@/hooks/useColorScheme'
import { useSession } from '@/hooks/useSession'

// Prevent the splash screen from auto-hiding until auth state is known
SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const { loading } = useSession()
  const colorScheme = useColorScheme()

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync()
    }
  }, [loading])

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
