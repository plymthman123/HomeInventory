import { useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useThemeColors } from '@/hooks/useColorScheme'
import { useSession } from '@/hooks/useSession'
import type { Location } from '@/types/database.types'

interface LocationWithCount extends Location {
  item_count: number
}

export default function LocationsScreen() {
  const colors = useThemeColors()
  const { session } = useSession()
  const [locations, setLocations]     = useState<LocationWithCount[]>([])
  const [loading, setLoading]         = useState(true)
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [showModal, setShowModal]     = useState(false)
  const [newName, setNewName]         = useState('')
  const [saving, setSaving]           = useState(false)

  useFocusEffect(
    useCallback(() => {
      if (session) loadLocations()
    }, [session])
  )

  async function loadLocations() {
    setLoading(true)
    try {
      const { data: member } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', session!.user.id)
        .single()

      if (!member) return
      setHouseholdId(member.household_id)

      const { data: locs } = await supabase
        .from('locations')
        .select('*')
        .eq('household_id', member.household_id)
        .order('name')

      if (!locs) return

      // Count items per location
      const { data: counts } = await supabase
        .from('items')
        .select('location_id')
        .eq('household_id', member.household_id)

      const countMap: Record<string, number> = {}
      counts?.forEach((i) => {
        if (i.location_id) countMap[i.location_id] = (countMap[i.location_id] ?? 0) + 1
      })

      setLocations(locs.map((l) => ({ ...l, item_count: countMap[l.id] ?? 0 })))
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd() {
    if (!newName.trim() || !householdId) return
    setSaving(true)
    const { error } = await supabase
      .from('locations')
      .insert({ household_id: householdId, name: newName.trim() })
    setSaving(false)
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      setNewName('')
      setShowModal(false)
      loadLocations()
    }
  }

  const s = styles(colors)

  return (
    <View style={s.container}>
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={locations}
          keyExtractor={(l) => l.id}
          contentContainerStyle={s.list}
          ListHeaderComponent={
            <TouchableOpacity style={s.addRow} onPress={() => setShowModal(true)}>
              <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
              <Text style={s.addText}>Add Location</Text>
            </TouchableOpacity>
          }
          renderItem={({ item: loc }) => (
            <TouchableOpacity
              style={s.card}
              onPress={() =>
                router.push({ pathname: '/(app)/items', params: { locationId: loc.id } })
              }
            >
              <View style={s.iconBox}>
                <Ionicons name="location" size={22} color={colors.primary} />
              </View>
              <View style={s.info}>
                <Text style={s.name}>{loc.name}</Text>
                <Text style={s.count}>{loc.item_count} item{loc.item_count !== 1 ? 's' : ''}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        />
      )}

      {/* Add location modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>New Location</Text>
            <TextInput
              style={s.modalInput}
              placeholder="Location name"
              placeholderTextColor={colors.textSecondary}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <View style={s.modalButtons}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={[s.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.primary }]} onPress={handleAdd} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Add</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list:      { padding: 16 },
    addRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    addText:   { color: colors.primary, fontSize: 16, fontWeight: '500' },
    card: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.card, borderRadius: 12,
      padding: 14, marginBottom: 10,
      borderWidth: 1, borderColor: colors.border,
    },
    iconBox: {
      width: 44, height: 44, borderRadius: 10,
      backgroundColor: colors.primaryLight,
      justifyContent: 'center', alignItems: 'center',
    },
    info:  { flex: 1, marginLeft: 12 },
    name:  { fontSize: 16, fontWeight: '600', color: colors.text },
    count: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    modalCard: {
      backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
      padding: 24,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 },
    modalInput: {
      height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 10,
      paddingHorizontal: 14, fontSize: 15, color: colors.text,
      backgroundColor: colors.backgroundSecondary,
    },
    modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
    cancelBtn:  { paddingHorizontal: 16, paddingVertical: 10 },
    cancelBtnText: { fontSize: 15 },
    saveBtn:    { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  })
