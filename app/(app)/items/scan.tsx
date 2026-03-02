import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useThemeColors } from '@/hooks/useColorScheme'

interface UPCResult {
  title: string
  brand: string
  model: string
  description: string
}

export default function ScanScreen() {
  const colors = useThemeColors()
  const [permission, requestPermission] = useCameraPermissions()
  const [scanned, setScanned]           = useState(false)
  const [loading, setLoading]           = useState(false)

  if (!permission) return <View />

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Ionicons name="camera-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.permText, { color: colors.text }]}>Camera access required</Text>
        <Text style={[styles.permSubText, { color: colors.textSecondary }]}>
          Camera permission is needed to scan barcodes.
        </Text>
        <TouchableOpacity
          style={[styles.permBtn, { backgroundColor: colors.primary }]}
          onPress={requestPermission}
        >
          <Text style={styles.permBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    )
  }

  async function handleBarCodeScanned({ type, data }: { type: string; data: string }) {
    if (scanned || loading) return
    setScanned(true)
    setLoading(true)

    try {
      // Look up the UPC via UPCitemdb (free tier: 100 lookups/day)
      const response = await fetch(
        `https://api.upcitemdb.com/prod/trial/lookup?upc=${data}`
      )
      const json = await response.json()
      const item: UPCResult | undefined = json.items?.[0]

      router.replace({
        pathname: '/(app)/items/add',
        params: {
          upc: data,
          name:  item?.title  ?? '',
          brand: item?.brand  ?? '',
          model: item?.model  ?? '',
        },
      })
    } catch {
      Alert.alert('Lookup failed', 'Could not look up the barcode. You can enter details manually.', [
        {
          text: 'Enter Manually',
          onPress: () =>
            router.replace({ pathname: '/(app)/items/add', params: { upc: data } }),
        },
        { text: 'Try Again', onPress: () => setScanned(false) },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{ barcodeTypes: ['upc_a', 'upc_e', 'ean13', 'ean8', 'qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        <View style={styles.finder} />
      </View>

      <View style={styles.hint}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.hintText}>
            Point the camera at a barcode or QR code
          </Text>
        )}
      </View>

      {scanned && !loading && (
        <TouchableOpacity
          style={styles.rescanBtn}
          onPress={() => setScanned(false)}
        >
          <Text style={styles.rescanText}>Tap to Scan Again</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container:   { flex: 1, justifyContent: 'center', alignItems: 'center' },
  overlay:     { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  finder: {
    width: 260, height: 160, borderRadius: 12,
    borderWidth: 3, borderColor: '#fff',
    backgroundColor: 'transparent',
  },
  hint: {
    position: 'absolute', bottom: 100,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
  },
  hintText:    { color: '#fff', fontSize: 14 },
  rescanBtn: {
    position: 'absolute', bottom: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24,
  },
  rescanText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  permText:    { fontSize: 18, fontWeight: '600', marginTop: 16 },
  permSubText: { fontSize: 14, textAlign: 'center', marginTop: 8, marginHorizontal: 32 },
  permBtn: {
    marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10,
  },
  permBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
})
