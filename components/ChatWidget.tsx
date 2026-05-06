import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useThemeColors } from '@/hooks/useColorScheme'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  error?: boolean
}

const PANEL_HEIGHT = Platform.OS === 'web' ? 520 : 480
const MAX_HISTORY  = 12

export function ChatWidget() {
  const colors = useThemeColors()
  const [isOpen, setIsOpen]   = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const slideAnim = useRef(new Animated.Value(0)).current
  const scrollRef = useRef<ScrollView>(null)

  // Auto-scroll to bottom whenever messages or loading state changes
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true })
    }, 50)
    return () => clearTimeout(timer)
  }, [messages, loading])

  function open() {
    setIsOpen(true)
    Animated.spring(slideAnim, { toValue: 1, useNativeDriver: true, bounciness: 4 }).start()
  }

  function close() {
    Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(
      () => setIsOpen(false)
    )
  }

  const panelTranslate = slideAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [PANEL_HEIGHT, 0],
  })

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const history = nextMessages
        .filter(m => !m.error)
        .slice(-MAX_HISTORY)
        .map(({ role, content }) => ({ role, content }))

      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/chat-assistant`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session!.access_token}`,
            'Content-Type': 'application/json',
            apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({ messages: history }),
        }
      )

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setMessages(prev => [
        ...prev,
        { id: Date.now().toString() + '_a', role: 'assistant', content: data.reply },
      ])
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString() + '_e',
          role: 'assistant',
          content: "Sorry, I couldn't connect. Please try again.",
          error: true,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const s = styles(colors)

  return (
    <View pointerEvents="box-none" style={s.root}>
      {isOpen && (
        <TouchableOpacity
          style={s.backdrop}
          onPress={close}
          activeOpacity={1}
        />
      )}

      <Animated.View
        style={[s.panel, { transform: [{ translateY: panelTranslate }] }]}
        pointerEvents={isOpen ? 'auto' : 'none'}
      >
        {/* Header */}
        <View style={s.header}>
          <Ionicons name="sparkles" size={18} color={colors.primary} />
          <Text style={s.headerTitle}>AI Assistant</Text>
          <TouchableOpacity
            onPress={close}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={s.messageList}
          contentContainerStyle={s.messageContent}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 && (
            <Text style={s.emptyText}>
              Ask me anything about your inventory — items, values, locations, warranty dates, and more.
            </Text>
          )}
          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} colors={colors} />
          ))}
          {loading && <TypingIndicator colors={colors} />}
        </ScrollView>

        {/* Input */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              value={input}
              onChangeText={setInput}
              placeholder="Ask about your inventory..."
              placeholderTextColor={colors.textSecondary}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
              editable={!loading}
            />
            <TouchableOpacity
              style={[s.sendBtn, (!input.trim() || loading) && s.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!input.trim() || loading}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>

      {/* FAB */}
      {!isOpen && (
        <TouchableOpacity style={s.fab} onPress={open} activeOpacity={0.85}>
          <Ionicons name="chatbubble-ellipses" size={26} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  )
}

function MessageBubble({
  message,
  colors,
}: {
  message: Message
  colors: ReturnType<typeof useThemeColors>
}) {
  const isUser = message.role === 'user'
  return (
    <View style={[bubbleStyles.row, isUser && bubbleStyles.rowUser]}>
      <View
        style={[
          bubbleStyles.bubble,
          isUser
            ? { backgroundColor: colors.primary }
            : message.error
            ? { backgroundColor: colors.danger + '33' }
            : {
                backgroundColor: colors.backgroundSecondary,
                borderWidth: 1,
                borderColor: colors.border,
              },
        ]}
      >
        <Text style={[bubbleStyles.text, { color: isUser ? '#fff' : colors.text }]}>
          {message.content}
        </Text>
      </View>
    </View>
  )
}

function TypingIndicator({ colors }: { colors: ReturnType<typeof useThemeColors> }) {
  const dot1 = useRef(new Animated.Value(0.3)).current
  const dot2 = useRef(new Animated.Value(0.3)).current
  const dot3 = useRef(new Animated.Value(0.3)).current

  useEffect(() => {
    const pulse = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ])
      ).start()

    pulse(dot1, 0)
    pulse(dot2, 200)
    pulse(dot3, 400)
  }, [])

  return (
    <View style={typingStyles.row}>
      <View
        style={[
          typingStyles.bubble,
          { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
        ]}
      >
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View
            key={i}
            style={[typingStyles.dot, { backgroundColor: colors.textSecondary, opacity: dot }]}
          />
        ))}
      </View>
    </View>
  )
}

const bubbleStyles = StyleSheet.create({
  row:     { flexDirection: 'row', marginBottom: 8 },
  rowUser: { justifyContent: 'flex-end' },
  bubble:  { maxWidth: '80%', borderRadius: 16, padding: 12, paddingHorizontal: 14 },
  text:    { fontSize: 14, lineHeight: 20 },
})

const typingStyles = StyleSheet.create({
  row:    { flexDirection: 'row', marginBottom: 8 },
  bubble: {
    borderRadius: 16,
    padding: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
})

const styles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    root: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.3)',
    },
    panel: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: PANEL_HEIGHT,
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 8,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 8,
    },
    headerTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    messageList:    { flex: 1 },
    messageContent: { padding: 16, paddingBottom: 8 },
    emptyText: {
      color: colors.textSecondary,
      fontSize: 14,
      textAlign: 'center',
      marginTop: 40,
      lineHeight: 20,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 8,
    },
    input: {
      flex: 1,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnDisabled: { opacity: 0.4 },
    fab: {
      position: 'absolute',
      bottom: 24,
      right: 16,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
    },
  })
