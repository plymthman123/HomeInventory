import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useThemeColors } from '@/hooks/useColorScheme'
import { useSession } from '@/hooks/useSession'
import type { Item, Location } from '@/types/database.types'

type ItemRow = Item & { location: Location | null }

export default function ItemsScreen() {
  const colors = useThemeColors()
  const { session } = useSession()
  const [items, setItems]       = useState<ItemRow[]>([])
  const [filtered, setFiltered] = useState<ItemRow[]>([])
  const [search, setSearch]     = useState('')
  const [loading, setLoading]   = useState(true)
  const [householdId, setHouseholdId] = useState<string | null>(null)

  // Reload items every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (session) loadItems()
    }, [session])
  )

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(
      q
        ? items.filter(
            (i) =>
              i.name.toLowerCase().includes(q) ||
              i.brand?.toLowerCase().includes(q) ||
              i.location?.name.toLowerCase().includes(q)
          )
        : items
    )
  }, [search, items])

  async function loadItems() {
    setLoading(true)
    try {
      const { data: member } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', session!.user.id)
        .single()

      if (!member) return
      setHouseholdId(member.household_id)

      const { data } = await supabase
        .from('items')
        .select('*, location:locations(id, name, icon)')
        .eq('household_id', member.household_id)
        .order('name')

      setItems((data as ItemRow[]) ?? [])
    } finally {
      setLoading(false)
    }
  }

  const s = styles(colors)

  return (
    <View style={s.container}>
      {/* Search bar */}
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={s.searchInput}
            placeholder="Search items..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={s.addButton}
          onPress={() => router.push('/(app)/items/add')}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.centered}>
          <Ionicons name="cube-outline" size={48} color={colors.border} />
          <Text style={s.emptyText}>
            {search ? 'No items match your search.' : 'No items yet. Tap + to add one.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => <ItemCard item={item} colors={colors} />}
          contentContainerStyle={s.list}
        />
      )}
    </View>
  )
}

function ItemCard({
  item,
  colors,
}: {
  item: ItemRow
  colors: ReturnType<typeof useThemeColors>
}) {
  const s = StyleSheet.create({
    card: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    photo: { width: 56, height: 56, borderRadius: 8, backgroundColor: colors.border },
    placeholder: {
      width: 56,
      height: 56,
      borderRadius: 8,
      backgroundColor: colors.backgroundSecondary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    info:  { flex: 1, marginLeft: 12 },
    name:  { fontSize: 16, fontWeight: '600', color: colors.text },
    meta:  { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    price: { fontSize: 15, fontWeight: '600', color: colors.text },
  })

  return (
    <TouchableOpacity style={s.card} onPress={() => router.push(`/(app)/items/${item.id}`)}>
      {item.primary_photo_url ? (
        <Image source={{ uri: item.primary_photo_url }} style={s.photo} />
      ) : (
        <View style={s.placeholder}>
          <Ionicons name="cube-outline" size={28} color={colors.textSecondary} />
        </View>
      )}
      <View style={s.info}>
        <Text style={s.name} numberOfLines={1}>{item.name}</Text>
        <Text style={s.meta} numberOfLines={1}>
          {[item.brand, item.location?.name].filter(Boolean).join(' · ')}
        </Text>
      </View>
      {item.purchase_price != null && (
        <Text style={s.price}>
          ${item.purchase_price.toLocaleString()}
        </Text>
      )}
    </TouchableOpacity>
  )
}

const styles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container:  { flex: 1, backgroundColor: colors.background },
    searchRow:  { flexDirection: 'row', padding: 12, gap: 10, alignItems: 'center' },
    searchBox:  {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 44,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 8,
    },
    searchInput: { flex: 1, fontSize: 15, color: colors.text },
    addButton:  {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    centered:  { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    emptyText: { color: colors.textSecondary, marginTop: 12, textAlign: 'center' },
    list:      { padding: 12, paddingTop: 4 },
  })
