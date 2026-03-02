import { useColorScheme as useRNColorScheme } from 'react-native'
import { Colors } from '@/constants/Colors'

export function useColorScheme() {
  return useRNColorScheme() ?? 'light'
}

export function useThemeColors() {
  const scheme = useColorScheme()
  return Colors[scheme]
}
