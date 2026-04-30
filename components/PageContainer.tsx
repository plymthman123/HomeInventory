import { View, StyleSheet, Platform } from 'react-native'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  narrow?: boolean  // 680px cap for forms/detail screens
}

/**
 * On web: centres content and caps width so it doesn't stretch across
 * a 27-inch monitor. On native it's a transparent passthrough.
 */
export function PageContainer({ children, narrow = false }: Props) {
  if (Platform.OS !== 'web') return <>{children}</>
  return (
    <View style={styles.outer}>
      <View style={[styles.inner, narrow && styles.narrow]}>
        {children}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: 'center',
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: 960,
  },
  narrow: {
    maxWidth: 680,
  },
})
