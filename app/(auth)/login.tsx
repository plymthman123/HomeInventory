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
import { Link, router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useThemeColors } from '@/hooks/useColorScheme'

export default function LoginScreen() {
  const colors = useThemeColors()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (error) {
      Alert.alert('Login failed', error.message)
    }
    // On success, the auth listener in useSession will update the session
    // and the auth layout will redirect to (app)
  }

  const s = styles(colors)

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.inner}>
        <Text style={s.logo}>HomeInventory</Text>
        <Text style={s.subtitle}>Your household, organized.</Text>

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
        <TextInput
          style={s.input}
          placeholder="Password"
          placeholderTextColor={colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />

        <Link href="/(auth)/forgot-password" style={s.forgotLink}>
          Forgot password?
        </Link>

        <TouchableOpacity style={s.button} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <View style={s.footer}>
          <Text style={s.footerText}>Don't have an account? </Text>
          <Link href="/(auth)/register" style={s.footerLink}>
            Sign up
          </Link>
        </View>
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
      paddingBottom: 40,
    },
    logo: {
      fontSize: 32,
      fontWeight: '700',
      color: colors.primary,
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 40,
    },
    input: {
      height: 52,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      marginBottom: 14,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.backgroundSecondary,
    },
    forgotLink: {
      color: colors.primary,
      textAlign: 'right',
      marginBottom: 20,
      fontSize: 14,
    },
    button: {
      height: 52,
      backgroundColor: colors.primary,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    buttonText: {
      color: '#fff',
      fontSize: 17,
      fontWeight: '600',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 8,
    },
    footerText: {
      color: colors.textSecondary,
      fontSize: 14,
    },
    footerLink: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '600',
    },
  })
