import { Redirect, Stack } from 'expo-router'
import { useSession } from '@/hooks/useSession'
import { useThemeColors } from '@/hooks/useColorScheme'

export default function AuthLayout() {
  const { session, loading } = useSession()
  const colors = useThemeColors()

  // If the user is already signed in, send them to the app
  if (!loading && session) {
    return <Redirect href="/(app)" />
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="login"    options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ title: 'Create Account' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Reset Password' }} />
    </Stack>
  )
}
