import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { router, usePathname } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useThemeColors } from '@/hooks/useColorScheme'
import { useSession } from '@/hooks/useSession'
import { supabase } from '@/lib/supabase'

const NAV_ITEMS = [
  { label: 'Dashboard', icon: 'home-outline',      activeIcon: 'home',         path: '/'          },
  { label: 'Items',     icon: 'cube-outline',      activeIcon: 'cube',         path: '/items'     },
  { label: 'Locations', icon: 'location-outline',  activeIcon: 'location',     path: '/locations' },
  { label: 'Reports',   icon: 'bar-chart-outline', activeIcon: 'bar-chart',    path: '/reports'   },
  { label: 'Settings',  icon: 'settings-outline',  activeIcon: 'settings',     path: '/settings'  },
] as const

export function Sidebar() {
  const colors = useThemeColors()
  const pathname = usePathname()
  const { session } = useSession()

  function isActive(path: string) {
    if (path === '/') return pathname === '/' || pathname === ''
    return pathname.startsWith(path)
  }

  const s = styles(colors)

  return (
    <View style={s.sidebar}>
      {/* Brand */}
      <View style={s.brand}>
        <Ionicons name="home" size={22} color={colors.primary} />
        <Text style={s.brandText}>HomeInventory</Text>
      </View>

      {/* Navigation */}
      <View style={s.nav}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path)
          return (
            <TouchableOpacity
              key={item.path}
              style={[s.navItem, active && s.navItemActive]}
              onPress={() => router.navigate(item.path as any)}
            >
              <Ionicons
                name={active ? item.activeIcon : item.icon}
                size={18}
                color={active ? colors.primary : colors.textSecondary}
              />
              <Text style={[s.navLabel, active && s.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Footer — user info + sign out */}
      <View style={s.footer}>
        <View style={s.footerInner}>
          <Text style={s.email} numberOfLines={1}>{session?.user.email}</Text>
          <TouchableOpacity onPress={() => supabase.auth.signOut()}>
            <Text style={[s.signOut, { color: colors.danger }]}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    sidebar: {
      width: 220,
      height: '100%',
      backgroundColor: colors.card,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      flexDirection: 'column',
    },
    brand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 20,
      paddingVertical: 24,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    brandText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    nav: {
      flex: 1,
      paddingTop: 12,
      paddingHorizontal: 10,
    },
    navItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 8,
      marginBottom: 2,
    },
    navItemActive: {
      backgroundColor: colors.primaryLight,
    },
    navLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    navLabelActive: {
      color: colors.primary,
      fontWeight: '600',
    },
    footer: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      padding: 16,
    },
    footerInner: {
      gap: 4,
    },
    email: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    signOut: {
      fontSize: 13,
      fontWeight: '500',
      marginTop: 4,
    },
  })
