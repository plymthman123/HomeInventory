import { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useThemeColors } from '@/hooks/useColorScheme'
import { useSession } from '@/hooks/useSession'
import { PageContainer } from '@/components/PageContainer'

interface LocationValue {
  locationName: string
  itemCount: number
  totalValue: number
}

interface WarrantyExpiry {
  itemName: string
  provider: string | null
  endDate: string
  daysLeft: number
}

export default function ReportsScreen() {
  const colors = useThemeColors()
  const { session } = useSession()
  const [loading, setLoading]           = useState(true)
  const [totalValue, setTotalValue]     = useState(0)
  const [totalItems, setTotalItems]     = useState(0)
  const [byLocation, setByLocation]     = useState<LocationValue[]>([])
  const [expiringWarranties, setExpiringWarranties] = useState<WarrantyExpiry[]>([])

  useFocusEffect(
    useCallback(() => {
      if (session) loadReport()
    }, [session])
  )

  async function loadReport() {
    setLoading(true)
    try {
      const { data: member } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', session!.user.id)
        .single()

      if (!member) return
      const hid = member.household_id

      // All items with their location
      const { data: items } = await supabase
        .from('items')
        .select('id, name, purchase_price, location:locations(id, name)')
        .eq('household_id', hid)

      if (items) {
        const total = items.reduce((s, i) => s + (i.purchase_price ?? 0), 0)
        setTotalValue(total)
        setTotalItems(items.length)

        // Group by location
        const map: Record<string, LocationValue> = {}
        items.forEach((item) => {
          const loc = (item.location as any)?.name ?? 'Unassigned'
          if (!map[loc]) map[loc] = { locationName: loc, itemCount: 0, totalValue: 0 }
          map[loc].itemCount++
          map[loc].totalValue += item.purchase_price ?? 0
        })
        setByLocation(Object.values(map).sort((a, b) => b.totalValue - a.totalValue))
      }

      // Upcoming warranty expirations (next 180 days)
      const today = new Date().toISOString().split('T')[0]
      const in180 = new Date(Date.now() + 180 * 86400 * 1000).toISOString().split('T')[0]

      const { data: warranties } = await supabase
        .from('warranties')
        .select('provider, end_date, item:items!inner(name, household_id)')
        .eq('item.household_id', hid)
        .gte('end_date', today)
        .lte('end_date', in180)
        .order('end_date')

      if (warranties) {
        setExpiringWarranties(
          warranties.map((w) => ({
            itemName: (w.item as any).name,
            provider: w.provider,
            endDate: w.end_date!,
            daysLeft: Math.ceil(
              (new Date(w.end_date!).getTime() - Date.now()) / 86400000
            ),
          }))
        )
      }
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
      {/* Summary */}
      <View style={s.summaryRow}>
        <View style={[s.summaryCard, { flex: 1 }]}>
          <Text style={s.summaryValue}>{totalItems}</Text>
          <Text style={s.summaryLabel}>Total Items</Text>
        </View>
        <View style={[s.summaryCard, { flex: 1 }]}>
          <Text style={s.summaryValue}>
            ${totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </Text>
          <Text style={s.summaryLabel}>Total Value</Text>
        </View>
      </View>

      {/* Value by location */}
      <Text style={s.sectionTitle}>Value by Location</Text>
      {byLocation.map((loc) => (
        <View key={loc.locationName} style={s.locationRow}>
          <View style={s.locationMeta}>
            <Text style={s.locationName}>{loc.locationName}</Text>
            <Text style={s.locationCount}>{loc.itemCount} items</Text>
          </View>
          <View style={s.locationBarWrapper}>
            <View
              style={[
                s.locationBar,
                {
                  width: `${totalValue > 0 ? (loc.totalValue / totalValue) * 100 : 0}%`,
                  backgroundColor: colors.primary,
                },
              ]}
            />
          </View>
          <Text style={s.locationValue}>
            ${loc.totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </Text>
        </View>
      ))}

      {/* Expiring warranties */}
      <Text style={s.sectionTitle}>Warranties Expiring Soon</Text>
      {expiringWarranties.length === 0 ? (
        <Text style={s.emptyText}>No warranties expiring in the next 6 months.</Text>
      ) : (
        expiringWarranties.map((w, idx) => (
          <View key={idx} style={s.warrantyRow}>
            <View style={s.warrantyInfo}>
              <Text style={s.warrantyItem}>{w.itemName}</Text>
              {w.provider && (
                <Text style={s.warrantyProvider}>{w.provider}</Text>
              )}
            </View>
            <View style={s.warrantyDays}>
              <Text
                style={[
                  s.daysLeft,
                  { color: w.daysLeft <= 30 ? colors.danger : w.daysLeft <= 90 ? colors.warning : colors.success },
                ]}
              >
                {w.daysLeft}d
              </Text>
              <Text style={s.expiryDate}>{w.endDate}</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
    </PageContainer>
  )
}

const styles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content:   { padding: 16, paddingBottom: 40 },
    centered:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
    summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
    summaryCard: {
      backgroundColor: colors.card, borderRadius: 14, padding: 16,
      borderWidth: 1, borderColor: colors.border,
    },
    summaryValue: { fontSize: 24, fontWeight: '700', color: colors.text },
    summaryLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 24, marginBottom: 12 },
    locationRow:  { marginBottom: 14 },
    locationMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    locationName: { fontSize: 14, fontWeight: '500', color: colors.text },
    locationCount:{ fontSize: 12, color: colors.textSecondary },
    locationBarWrapper: {
      height: 8, backgroundColor: colors.backgroundSecondary,
      borderRadius: 4, overflow: 'hidden', marginBottom: 4,
    },
    locationBar:  { height: 8, borderRadius: 4 },
    locationValue: { fontSize: 13, color: colors.textSecondary, textAlign: 'right' },
    warrantyRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 8,
      borderWidth: 1, borderColor: colors.border,
    },
    warrantyInfo: { flex: 1 },
    warrantyItem: { fontSize: 15, fontWeight: '500', color: colors.text },
    warrantyProvider: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    warrantyDays: { alignItems: 'flex-end' },
    daysLeft:     { fontSize: 18, fontWeight: '700' },
    expiryDate:   { fontSize: 12, color: colors.textSecondary },
    emptyText:    { color: colors.textSecondary, fontStyle: 'italic' },
  })
