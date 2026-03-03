import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { createHousehold } from '@/lib/household'
import { useThemeColors } from '@/hooks/useColorScheme'
import { useSession } from '@/hooks/useSession'

export default function OnboardingScreen() {
  const colors = useThemeColors()
  const { session } = useSession()
  const [householdName, setHouseholdName] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleCreate() {
    if (!householdName.trim()) {
      Alert.alert('Required', 'Please enter a name for your household.')
      return
    }
    if (!session) return

    setSaving(true)
    try {
      await createHousehold(session.user.id, householdName.trim())
      // Replace so the user can't navigate back to onboarding
      router.replace('/(app)')
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setSaving(false)
    }
  }

  const s = styles(colors)

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.inner}>
        <Text style={s.title}>Welcome!</Text>
        <Text style={s.subtitle}>
          Let's set up your household. You can rename it anytime in Settings.
        </Text>

        <Text style={s.label}>Household Name</Text>
        <TextInput
          style={s.input}
          placeholder="e.g. The Smith Family"
          placeholderTextColor={colors.textSecondary}
          value={householdName}
          onChangeText={setHouseholdName}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleCreate}
        />

        <TouchableOpacity style={s.button} onPress={handleCreate} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.buttonText}>Get Started</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    inner: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 28,
      paddingBottom: 60,
    },
    title: {
      fontSize: 32,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      lineHeight: 24,
      marginBottom: 36,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    input: {
      height: 52,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.backgroundSecondary,
      marginBottom: 24,
    },
    button: {
      height: 52,
      backgroundColor: colors.primary,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonText: {
      color: '#fff',
      fontSize: 17,
      fontWeight: '600',
    },
  })
