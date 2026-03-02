import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native'
import { useLocalSearchParams, router, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useThemeColors } from '@/hooks/useColorScheme'
import type { ItemWithDetails } from '@/types/database.types'

export default function ItemDetailScreen() {
  const colors = useThemeColors()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [item, setItem]     = useState<ItemWithDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadItem()
  }, [id])

  async function loadItem() {
    const { data } = await supabase
      .from('items')
      .select(`
        *,
        location:locations(*),
        owner:household_members(*),
        photos:item_photos(*),
        receipts:item_receipts(*),
        warranties(*)
      `)
      .eq('id', id)
      .single()

    setItem(data as ItemWithDetails)
    setLoading(false)
  }

  async function handleDelete() {
    Alert.alert('Delete Item', `Are you sure you want to delete "${item?.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('items').delete().eq('id', id)
          router.back()
        },
      },
    ])
  }

  const s = styles(colors)

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  if (!item) {
    return (
      <View style={s.centered}>
        <Text style={{ color: colors.textSecondary }}>Item not found.</Text>
      </View>
    )
  }

  const activeWarranty = item.warranties?.find(
    (w) => w.end_date && new Date(w.end_date) > new Date()
  )

  return (
    <>
      <Stack.Screen
        options={{
          title: item.name,
          headerRight: () => (
            <TouchableOpacity onPress={handleDelete} style={{ marginRight: 4 }}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={s.container} contentContainerStyle={s.content}>
        {/* Primary photo */}
        {item.primary_photo_url ? (
          <Image source={{ uri: item.primary_photo_url }} style={s.photo} />
        ) : (
          <View style={s.photoPlaceholder}>
            <Ionicons name="cube-outline" size={48} color={colors.textSecondary} />
          </View>
        )}

        {/* Core info */}
        <Text style={s.name}>{item.name}</Text>
        {item.brand && <Text style={s.brand}>{item.brand}{item.model ? ` — ${item.model}` : ''}</Text>}

        {/* Detail rows */}
        <View style={s.card}>
          {item.location && <DetailRow label="Location" value={item.location.name} colors={colors} />}
          {item.purchase_date && <DetailRow label="Purchased" value={item.purchase_date} colors={colors} />}
          {item.purchase_price != null && (
            <DetailRow label="Purchase Price" value={`$${item.purchase_price.toLocaleString()}`} colors={colors} />
          )}
          {item.serial_number && <DetailRow label="Serial Number" value={item.serial_number} colors={colors} />}
          {item.upc_code && <DetailRow label="UPC" value={item.upc_code} colors={colors} />}
          {item.owner && <DetailRow label="Owner" value={item.owner.display_name ?? 'Unknown'} colors={colors} />}
        </View>

        {/* Warranty */}
        {item.warranties && item.warranties.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Warranty</Text>
            {item.warranties.map((w) => (
              <View key={w.id} style={s.card}>
                {w.provider && <DetailRow label="Provider" value={w.provider} colors={colors} />}
                {w.start_date && <DetailRow label="Start" value={w.start_date} colors={colors} />}
                {w.end_date && (
                  <DetailRow
                    label="Expires"
                    value={w.end_date}
                    valueStyle={{
                      color: new Date(w.end_date) < new Date() ? colors.danger : colors.success,
                    }}
                    colors={colors}
                  />
                )}
                {w.description && <DetailRow label="Notes" value={w.description} colors={colors} />}
              </View>
            ))}
          </>
        )}

        {/* Manual link */}
        {item.manual_url && (
          <>
            <Text style={s.sectionTitle}>Manual</Text>
            <TouchableOpacity
              style={s.linkBtn}
              onPress={() => Linking.openURL(item.manual_url!)}
            >
              <Ionicons name="document-text-outline" size={18} color={colors.primary} />
              <Text style={[s.linkText, { color: colors.primary }]}>Open User Manual</Text>
              <Ionicons name="open-outline" size={14} color={colors.primary} />
            </TouchableOpacity>
          </>
        )}

        {/* Notes */}
        {item.notes && (
          <>
            <Text style={s.sectionTitle}>Notes</Text>
            <View style={s.card}>
              <Text style={s.notes}>{item.notes}</Text>
            </View>
          </>
        )}

        {/* Receipts */}
        {item.receipts && item.receipts.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Receipts</Text>
            {item.receipts.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={s.linkBtn}
                onPress={() => Linking.openURL(r.url)}
              >
                <Ionicons name="receipt-outline" size={18} color={colors.primary} />
                <Text style={[s.linkText, { color: colors.primary }]}>{r.file_name ?? 'View Receipt'}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </>
  )
}

function DetailRow({
  label, value, valueStyle, colors,
}: {
  label: string
  value: string
  valueStyle?: object
  colors: ReturnType<typeof useThemeColors>
}) {
  const s = StyleSheet.create({
    row:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 14 },
    label: { fontSize: 14, color: colors.textSecondary },
    value: { fontSize: 14, color: colors.text, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
  })
  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <Text style={[s.value, valueStyle]}>{value}</Text>
    </View>
  )
}

const styles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content:   { padding: 16, paddingBottom: 60 },
    centered:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
    photo:     { width: '100%', height: 240, borderRadius: 14, marginBottom: 16, resizeMode: 'cover' },
    photoPlaceholder: {
      width: '100%', height: 180, borderRadius: 14, marginBottom: 16,
      backgroundColor: colors.backgroundSecondary,
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 1, borderColor: colors.border,
    },
    name:      { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 4 },
    brand:     { fontSize: 15, color: colors.textSecondary, marginBottom: 16 },
    card: {
      backgroundColor: colors.card, borderRadius: 14,
      borderWidth: 1, borderColor: colors.border,
      marginBottom: 8, overflow: 'hidden',
    },
    sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 20, marginBottom: 8 },
    linkBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: colors.card, borderRadius: 12, padding: 14,
      borderWidth: 1, borderColor: colors.border, marginBottom: 8,
    },
    linkText: { flex: 1, fontSize: 15 },
    notes:    { fontSize: 14, color: colors.text, padding: 14, lineHeight: 20 },
  })
