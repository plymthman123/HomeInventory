import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useThemeColors } from '@/hooks/useColorScheme'

export default function RegisterScreen() {
  const colors = useThemeColors()
  const [displayName, setDisplayName]         = useState('')
  const [email, setEmail]                     = useState('')
  const [password, setPassword]               = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading]                 = useState(false)
  const [emailSent, setEmailSent]             = useState(false)

  async function handleRegister() {
    if (!displayName || !email || !password) {
      Alert.alert('Missing fields', 'Please fill in all fields.')
      return
    }
    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Passwords do not match.')
      return
    }
    if (password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      // emailRedirectTo tells Supabase where to send the user after they click
      // the confirmation link. On web we use the current origin (works in both
      // dev and production automatically). On native we use the app's URL scheme
      // so iOS/Android opens the app directly.
      const emailRedirectTo =
        Platform.OS === 'web'
          ? (typeof window !== 'undefined' ? window.location.origin : undefined)
          : 'homeinventory://'

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo,
        },
      })

      if (signUpError) throw signUpError
      if (!data.user) throw new Error('User creation failed.')

      // data.session is null when email confirmation is required.
      // Show the "check your email" screen instead of an Alert.
      setEmailSent(true)
    } catch (err: any) {
      Alert.alert('Registration failed', err.message)
    } finally {
      setLoading(false)
    }
  }

  const s = styles(colors)

  // ── Email-sent confirmation screen ──────────────────────────────────────────
  if (emailSent) {
    return (
      <View style={[s.container, s.sentContainer]}>
        <View style={[s.iconCircle, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="mail-outline" size={36} color={colors.primary} />
        </View>
        <Text style={[s.sentTitle, { color: colors.text }]}>Check your email</Text>
        <Text style={[s.sentBody, { color: colors.textSecondary }]}>
          We sent a confirmation link to{'\n'}
          <Text style={{ fontWeight: '600', color: colors.text }}>{email}</Text>
          {'\n\n'}
          Click the link in that email to verify your account, then sign in below.
        </Text>
        <TouchableOpacity
          style={[s.button, { backgroundColor: colors.primary }]}
          onPress={() => router.replace('/(auth)/login')}
        >
          <Text style={s.buttonText}>Go to Sign In</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // ── Registration form ────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled">
        <Text style={s.sectionLabel}>Your Info</Text>
        <TextInput
          style={s.input}
          placeholder="Your name"
          placeholderTextColor={colors.textSecondary}
          value={displayName}
          onChangeText={setDisplayName}
          autoComplete="name"
        />
        <TextInput
          style={s.input}
          placeholder="Email"
          placeholderTextColor={colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <Text style={s.sectionLabel}>Password</Text>
        <TextInput
          style={s.input}
          placeholder="Password (min 8 characters)"
          placeholderTextColor={colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
        />
        <TextInput
          style={s.input}
          placeholder="Confirm password"
          placeholderTextColor={colors.textSecondary}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoComplete="new-password"
        />

        <TouchableOpacity style={s.button} onPress={handleRegister} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 60,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginTop: 20,
      marginBottom: 8,
    },
    input: {
      height: 52,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      marginBottom: 12,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.backgroundSecondary,
    },
    button: {
      height: 52,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 24,
    },
    buttonText: {
      color: '#fff',
      fontSize: 17,
      fontWeight: '600',
    },
    // Email-sent state
    sentContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    iconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    sentTitle: {
      fontSize: 24,
      fontWeight: '700',
      marginBottom: 16,
      textAlign: 'center',
    },
    sentBody: {
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
      marginBottom: 32,
    },
  })
