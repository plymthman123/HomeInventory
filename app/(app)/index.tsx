import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useThemeColors } from '@/hooks/useColorScheme'
import { useSession } from '@/hooks/useSession'
import { PageContainer } from '@/components/PageContainer'

interface DashboardStats {
  totalItems: number
  totalValue: number
  locationCount: number
  warrantiesExpiringSoon: number
}

export default function DashboardScreen() {
  const colors = useThemeColors()
  const { session } = useSession()
  const [stats, setStats]           = useState<DashboardStats | null>(null)
  const [householdName, setHouseholdName] = useState('')
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    if (session) loadDashboard()
  }, [session])

  async function loadDashboard() {
    try {
      // Get household info
      const { data: member } = await supabase
        .from('household_members')
        .select('household:households(name, id)')
        .eq('user_id', session!.user.id)
        .single()

      if (!member?.household) return
      const hh = member.household as { name: string; id: string }
      setHouseholdName(hh.name)

      // Aggregate stats
      const [itemsRes, locationsRes, warrantiesRes] = await Promise.all([
        supabase
          .from('items')
          .select('id, purchase_price')
          .eq('household_id', hh.id),
        supabase
          .from('locations')
          .select('id', { count: 'exact' })
          .eq('household_id', hh.id),
        supabase
          .from('warranties')
          .select('end_date, item:items!inner(household_id)')
          .eq('item.household_id', hh.id)
          .gte('end_date', new Date().toISOString().split('T')[0])
          .lte(
            'end_date',
            new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0]
          ),
      ])

      const items = itemsRes.data ?? []
      const totalValue = items.reduce((sum, i) => sum + (i.purchase_price ?? 0), 0)

      setStats({
        totalItems: items.length,
        totalValue,
        locationCount: locationsRes.count ?? 0,
        warrantiesExpiringSoon: warrantiesRes.data?.length ?? 0,
      })
    } finally {
      setLoading(false)
    }
  }

  const s = styles(colors)

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  return (
    <PageContainer>
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.heading}>{householdName}</Text>
      <Text style={s.subheading}>Household Inventory</Text>

      {/* Stat cards */}
      <View style={s.statsRow}>
        <StatCard
          label="Total Items"
          value={String(stats?.totalItems ?? 0)}
          icon="cube"
          color={colors.primary}
          colors={colors}
        />
        <StatCard
          label="Total Value"
          value={`$${(stats?.totalValue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          icon="cash"
          color={colors.success}
          colors={colors}
        />
      </View>
      <View style={s.statsRow}>
        <StatCard
          label="Locations"
          value={String(stats?.locationCount ?? 0)}
          icon="location"
          color={colors.warning}
          colors={colors}
        />
        <StatCard
          label="Warranties Expiring"
          value={String(stats?.warrantiesExpiringSoon ?? 0)}
          icon="shield-checkmark"
          color={colors.danger}
          colors={colors}
        />
      </View>

      {/* Quick actions */}
      <Text style={s.sectionTitle}>Quick Actions</Text>
      <View style={s.actionsGrid}>
        <QuickAction
          label="Add Item"
          icon="add-circle"
          onPress={() => router.push('/(app)/items/add')}
          colors={colors}
        />
        <QuickAction
          label="Scan Barcode"
          icon="barcode"
          onPress={() => router.push('/(app)/items/scan')}
          colors={colors}
        />
        <QuickAction
          label="View All Items"
          icon="list"
          onPress={() => router.push('/(app)/items')}
          colors={colors}
        />
        <QuickAction
          label="Reports"
          icon="bar-chart"
          onPress={() => router.push('/(app)/reports')}
          colors={colors}
        />
      </View>
    </ScrollView>
    </PageContainer>
  )
}

function StatCard({
  label, value, icon, color, colors,
}: {
  label: string
  value: string
  icon: string
  color: string
  colors: ReturnType<typeof useThemeColors>
}) {
  const s = StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      margin: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    value: { fontSize: 24, fontWeight: '700', color: colors.text, marginTop: 8 },
    label: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  })
  return (
    <View style={s.card}>
      <Ionicons name={icon as any} size={22} color={color} />
      <Text style={s.value}>{value}</Text>
      <Text style={s.label}>{label}</Text>
    </View>
  )
}

function QuickAction({
  label, icon, onPress, colors,
}: {
  label: string
  icon: string
  onPress: () => void
  colors: ReturnType<typeof useThemeColors>
}) {
  const s = StyleSheet.create({
    btn: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      margin: 4,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    label: { fontSize: 12, color: colors.text, marginTop: 8, textAlign: 'center' },
  })
  return (
    <TouchableOpacity style={s.btn} onPress={onPress}>
      <Ionicons name={icon as any} size={28} color={colors.primary} />
      <Text style={s.label}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content:   { padding: 16, paddingBottom: 40 },
    centered:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
    heading:   { fontSize: 26, fontWeight: '700', color: colors.text },
    subheading:{ fontSize: 14, color: colors.textSecondary, marginBottom: 20 },
    statsRow:  { flexDirection: 'row', marginHorizontal: -4, marginBottom: 0 },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginTop: 24,
      marginBottom: 8,
    },
    actionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -4,
    },
  })
