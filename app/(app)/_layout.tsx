import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { Redirect, Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/hooks/useSession'
import { useThemeColors } from '@/hooks/useColorScheme'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { Sidebar } from '@/components/Sidebar'
import { ChatWidget } from '@/components/ChatWidget'

export default function AppLayout() {
  const { session, loading }                                  = useSession()
  const colors                                                = useThemeColors()
  const { showSidebar }                                       = useBreakpoint()
  const [hasHousehold, setHasHousehold]                       = useState<boolean | null>(null)
  const [checkingHousehold, setCheckingHousehold]             = useState(true)

  useEffect(() => {
    if (!session) {
      setCheckingHousehold(false)
      return
    }
    supabase
      .from('household_members')
      .select('id')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        setHasHousehold(!!data)
        setCheckingHousehold(false)
      })
  }, [session])

  if (loading || checkingHousehold) return null
  if (!session)              return <Redirect href="/(auth)/login" />
  if (hasHousehold === false) return <Redirect href="/onboarding" />

  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      {showSidebar && <Sidebar />}

      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            tabBarActiveTintColor:   colors.primary,
            tabBarInactiveTintColor: colors.tabIconDefault,
            tabBarStyle: showSidebar
              ? { display: 'none' }
              : { backgroundColor: colors.card, borderTopColor: colors.border },
            headerStyle:       { backgroundColor: colors.background },
            headerTintColor:   colors.text,
            headerShadowVisible: false,
            // Hide individual screen headers on desktop — the sidebar provides context
            headerShown: !showSidebar,
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Dashboard',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="home-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="items"
            options={{
              title: 'Items',
              headerShown: false,
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="cube-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="locations"
            options={{
              title: 'Locations',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="location-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="reports"
            options={{
              title: 'Reports',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="bar-chart-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: 'Settings',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="settings-outline" size={size} color={color} />
              ),
            }}
          />
        </Tabs>
        <ChatWidget />
      </View>
    </View>
  )
}
