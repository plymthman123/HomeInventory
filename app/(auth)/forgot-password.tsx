import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { supabase } from '@/lib/supabase'
import { useThemeColors } from '@/hooks/useColorScheme'

export default function ForgotPasswordScreen() {
  const colors = useThemeColors()
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)

  async function handleReset() {
    if (!email) {
      Alert.alert('Enter your email', 'Please enter the email address for your account.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'homeinventory://reset-password',
    })
    setLoading(false)

    if (error) {
      Alert.alert('Error', error.message)
    } else {
      setSent(true)
    }
  }

  const s = styles(colors)

  if (sent) {
    return (
      <View style={s.container}>
        <Text style={s.title}>Check your email</Text>
        <Text style={s.body}>
          We sent a password reset link to {email}. Follow the link in the email to set a new password.
        </Text>
      </View>
    )
  }

  return (
    <View style={s.container}>
      <Text style={s.body}>
        Enter your account email and we'll send you a link to reset your password.
      </Text>
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
      <TouchableOpacity style={s.button} onPress={handleReset} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.buttonText}>Send Reset Link</Text>
        )}
      </TouchableOpacity>
    </View>
  )
}

const styles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 24,
      paddingTop: 24,
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 12,
    },
    body: {
      fontSize: 15,
      color: colors.textSecondary,
      marginBottom: 24,
      lineHeight: 22,
    },
    input: {
      height: 52,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      marginBottom: 16,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.backgroundSecondary,
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
