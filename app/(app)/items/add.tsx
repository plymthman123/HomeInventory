import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native'
import { router } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useThemeColors } from '@/hooks/useColorScheme'
import { useSession } from '@/hooks/useSession'
import type { Location } from '@/types/database.types'

export default function AddItemScreen() {
  const colors = useThemeColors()
  const { session } = useSession()
  const [saving, setSaving]           = useState(false)
  const [locations, setLocations]     = useState<Location[]>([])
  const [householdId, setHouseholdId] = useState<string | null>(null)

  // Form state
  const [name, setName]               = useState('')
  const [brand, setBrand]             = useState('')
  const [model, setModel]             = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [notes, setNotes]             = useState('')
  const [manualUrl, setManualUrl]     = useState('')
  const [locationId, setLocationId]   = useState<string | null>(null)
  const [photoUri, setPhotoUri]       = useState<string | null>(null)

  useEffect(() => {
    if (session) loadHousehold()
  }, [session])

  async function loadHousehold() {
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

    setLocations(locs ?? [])
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    })
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri)
    }
  }

  async function takePhoto() {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    })
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri)
    }
  }

  async function uploadPhoto(uri: string, itemId: string): Promise<string | null> {
    const ext = uri.split('.').pop() ?? 'jpg'
    const path = `${householdId}/${itemId}/${Date.now()}.${ext}`

    const response = await fetch(uri)
    const blob = await response.blob()
    const arrayBuffer = await blob.arrayBuffer()

    const { error } = await supabase.storage
      .from('item-photos')
      .upload(path, arrayBuffer, { contentType: `image/${ext}` })

    if (error) return null

    const { data } = supabase.storage.from('item-photos').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a name for the item.')
      return
    }
    if (!householdId) return

    setSaving(true)
    try {
      // Insert the item first (to get its ID for photo upload)
      const { data: item, error } = await supabase
        .from('items')
        .insert({
          household_id: householdId,
          location_id: locationId,
          name: name.trim(),
          brand: brand.trim() || null,
          model: model.trim() || null,
          serial_number: serialNumber.trim() || null,
          purchase_date: purchaseDate || null,
          purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
          notes: notes.trim() || null,
          manual_url: manualUrl.trim() || null,
        })
        .select()
        .single()

      if (error) throw error

      // Upload photo and update item if provided
      if (photoUri) {
        const url = await uploadPhoto(photoUri, item.id)
        if (url) {
          await supabase
            .from('items')
            .update({ primary_photo_url: url })
            .eq('id', item.id)

          await supabase.from('item_photos').insert({
            item_id: item.id,
            storage_path: `${householdId}/${item.id}`,
            url,
            is_primary: true,
          })
        }
      }

      router.back()
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setSaving(false)
    }
  }

  const s = styles(colors)

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      {/* Photo */}
      <View style={s.photoSection}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={s.photoPreview} />
        ) : (
          <View style={s.photoPlaceholder}>
            <Ionicons name="image-outline" size={40} color={colors.textSecondary} />
          </View>
        )}
        <View style={s.photoButtons}>
          <TouchableOpacity style={s.photoBtn} onPress={takePhoto}>
            <Ionicons name="camera-outline" size={18} color={colors.primary} />
            <Text style={s.photoBtnText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.photoBtn} onPress={pickPhoto}>
            <Ionicons name="images-outline" size={18} color={colors.primary} />
            <Text style={s.photoBtnText}>Library</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Core fields */}
      <Text style={s.label}>Item Name *</Text>
      <TextInput style={s.input} value={name} onChangeText={setName} placeholder="e.g. 65-inch OLED TV" placeholderTextColor={colors.textSecondary} />

      <Text style={s.label}>Brand</Text>
      <TextInput style={s.input} value={brand} onChangeText={setBrand} placeholder="e.g. Sony" placeholderTextColor={colors.textSecondary} />

      <Text style={s.label}>Model</Text>
      <TextInput style={s.input} value={model} onChangeText={setModel} placeholder="e.g. XR-65A95L" placeholderTextColor={colors.textSecondary} />

      <Text style={s.label}>Serial Number</Text>
      <TextInput style={s.input} value={serialNumber} onChangeText={setSerialNumber} placeholder="Optional" placeholderTextColor={colors.textSecondary} />

      <Text style={s.label}>Purchase Date</Text>
      <TextInput style={s.input} value={purchaseDate} onChangeText={setPurchaseDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textSecondary} keyboardType="numbers-and-punctuation" />

      <Text style={s.label}>Purchase Price ($)</Text>
      <TextInput style={s.input} value={purchasePrice} onChangeText={setPurchasePrice} placeholder="0.00" placeholderTextColor={colors.textSecondary} keyboardType="decimal-pad" />

      {/* Location picker */}
      <Text style={s.label}>Location</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.locationPicker}>
        {locations.map((loc) => (
          <TouchableOpacity
            key={loc.id}
            style={[s.locationChip, locationId === loc.id && s.locationChipActive]}
            onPress={() => setLocationId(loc.id === locationId ? null : loc.id)}
          >
            <Text style={[s.locationChipText, locationId === loc.id && s.locationChipTextActive]}>
              {loc.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={s.label}>Manual URL</Text>
      <TextInput style={s.input} value={manualUrl} onChangeText={setManualUrl} placeholder="https://..." placeholderTextColor={colors.textSecondary} autoCapitalize="none" keyboardType="url" />

      <Text style={s.label}>Notes</Text>
      <TextInput style={[s.input, s.textArea]} value={notes} onChangeText={setNotes} placeholder="Any additional notes..." placeholderTextColor={colors.textSecondary} multiline numberOfLines={4} textAlignVertical="top" />

      <TouchableOpacity style={s.saveButton} onPress={handleSave} disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.saveButtonText}>Save Item</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content:   { padding: 16, paddingBottom: 60 },
    photoSection: { alignItems: 'center', marginBottom: 20 },
    photoPreview: { width: 140, height: 140, borderRadius: 14, marginBottom: 12 },
    photoPlaceholder: {
      width: 140, height: 140, borderRadius: 14,
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed',
      justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    },
    photoButtons: { flexDirection: 'row', gap: 12 },
    photoBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 16, paddingVertical: 8,
      borderRadius: 8, borderWidth: 1, borderColor: colors.primary,
    },
    photoBtnText: { color: colors.primary, fontSize: 14, fontWeight: '500' },
    label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6, marginTop: 14 },
    input: {
      height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 10,
      paddingHorizontal: 14, fontSize: 15, color: colors.text,
      backgroundColor: colors.backgroundSecondary,
    },
    textArea: { height: 96, paddingTop: 12 },
    locationPicker: { marginVertical: 4 },
    locationChip: {
      paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
      borderWidth: 1, borderColor: colors.border,
      backgroundColor: colors.backgroundSecondary, marginRight: 8,
    },
    locationChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    locationChipText: { color: colors.text, fontSize: 14 },
    locationChipTextActive: { color: '#fff' },
    saveButton: {
      height: 52, backgroundColor: colors.primary, borderRadius: 12,
      justifyContent: 'center', alignItems: 'center', marginTop: 28,
    },
    saveButtonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  })
