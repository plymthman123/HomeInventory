import { Stack } from 'expo-router'
import { useThemeColors } from '@/hooks/useColorScheme'

export default function ItemsLayout() {
  const colors = useThemeColors()
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index"  options={{ title: 'Items' }} />
      <Stack.Screen name="add"    options={{ title: 'Add Item', presentation: 'modal' }} />
      <Stack.Screen name="scan"   options={{ title: 'Scan Barcode', presentation: 'modal' }} />
      <Stack.Screen name="[id]"   options={{ title: 'Item Details' }} />
    </Stack>
  )
}
