import { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useThemeColors } from '@/hooks/useColorScheme'
import { useSession } from '@/hooks/useSession'

interface Member {
  id: string
  display_name: string | null
  role: 'admin' | 'member'
  user_id: string
}

export default function SettingsScreen() {
  const colors = useThemeColors()
  const { session } = useSession()
  const [householdName, setHouseholdName] = useState('')
  const [householdId, setHouseholdId]     = useState<string | null>(null)
  const [members, setMembers]             = useState<Member[]>([])
  const [isAdmin, setIsAdmin]             = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail]     = useState('')
  const [inviting, setInviting]           = useState(false)
  const [displayName, setDisplayName]     = useState('')

  useEffect(() => {
    if (session) loadSettings()
  }, [session])

  async function loadSettings() {
    const { data: member } = await supabase
      .from('household_members')
      .select('*, household:households(*)')
      .eq('user_id', session!.user.id)
      .single()

    if (!member) return
    const hh = member.household as any
    setHouseholdId(hh.id)
    setHouseholdName(hh.name)
    setIsAdmin(member.role === 'admin')
    setDisplayName(member.display_name ?? '')

    const { data: allMembers } = await supabase
      .from('household_members')
      .select('id, display_name, role, user_id')
      .eq('household_id', hh.id)

    setMembers((allMembers as Member[]) ?? [])
  }

  async function handleInvite() {
    if (!inviteEmail.trim() || !householdId) return
    setInviting(true)
    const { error } = await supabase
      .from('household_invites')
      .insert({
        household_id: householdId,
        email: inviteEmail.trim().toLowerCase(),
        role: 'member',
        created_by: session!.user.id,
      })
    setInviting(false)

    if (error) {
      Alert.alert('Error', error.message)
    } else {
      Alert.alert('Invite sent', `An invite has been recorded for ${inviteEmail}. Share the invite link with them.`)
      setInviteEmail('')
      setShowInviteModal(false)
    }
  }

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => supabase.auth.signOut(),
      },
    ])
  }

  const s = styles(colors)

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Household */}
      <Text style={s.sectionLabel}>Household</Text>
      <View style={s.card}>
        <View style={s.row}>
          <Text style={s.rowLabel}>Name</Text>
          <Text style={s.rowValue}>{householdName}</Text>
        </View>
      </View>

      {/* Family members */}
      <Text style={s.sectionLabel}>Family Members</Text>
      <View style={s.card}>
        {members.map((m, idx) => (
          <View key={m.id} style={[s.row, idx < members.length - 1 && s.rowBorder]}>
            <View style={s.memberAvatar}>
              <Text style={s.memberInitial}>
                {(m.display_name ?? 'U')[0].toUpperCase()}
              </Text>
            </View>
            <View style={s.memberInfo}>
              <Text style={s.rowLabel}>{m.display_name ?? 'Unknown'}</Text>
              <Text style={s.roleTag}>{m.role}</Text>
            </View>
            {m.user_id === session?.user.id && (
              <Text style={[s.youTag, { color: colors.primary }]}>You</Text>
            )}
          </View>
        ))}
        {isAdmin && (
          <TouchableOpacity style={s.inviteRow} onPress={() => setShowInviteModal(true)}>
            <Ionicons name="person-add-outline" size={18} color={colors.primary} />
            <Text style={[s.inviteText, { color: colors.primary }]}>Invite Family Member</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Account */}
      <Text style={s.sectionLabel}>Account</Text>
      <View style={s.card}>
        <View style={s.row}>
          <Text style={s.rowLabel}>Email</Text>
          <Text style={s.rowValue}>{session?.user.email}</Text>
        </View>
      </View>

      {/* Sign out */}
      <TouchableOpacity style={[s.signOutBtn, { borderColor: colors.danger }]} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
        <Text style={[s.signOutText, { color: colors.danger }]}>Sign Out</Text>
      </TouchableOpacity>

      {/* Invite modal */}
      <Modal visible={showInviteModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>Invite Family Member</Text>
            <Text style={[s.modalSubtitle, { color: colors.textSecondary }]}>
              They'll receive an invite to join your household.
            </Text>
            <TextInput
              style={[s.modalInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.backgroundSecondary }]}
              placeholder="Email address"
              placeholderTextColor={colors.textSecondary}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoFocus
            />
            <View style={s.modalButtons}>
              <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                <Text style={{ color: colors.textSecondary, fontSize: 15 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.sendBtn, { backgroundColor: colors.primary }]}
                onPress={handleInvite}
                disabled={inviting}
              >
                {inviting ? <ActivityIndicator color="#fff" /> : <Text style={s.sendBtnText}>Send Invite</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container:    { flex: 1, backgroundColor: colors.background },
    content:      { padding: 16, paddingBottom: 60 },
    sectionLabel: {
      fontSize: 12, fontWeight: '600', color: colors.textSecondary,
      textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 24, marginBottom: 8,
    },
    card: {
      backgroundColor: colors.card, borderRadius: 14,
      borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
    },
    row: { flexDirection: 'row', alignItems: 'center', padding: 14 },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    rowLabel:   { fontSize: 15, color: colors.text, flex: 1 },
    rowValue:   { fontSize: 15, color: colors.textSecondary },
    memberAvatar: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: colors.primaryLight,
      justifyContent: 'center', alignItems: 'center', marginRight: 10,
    },
    memberInitial: { color: colors.primary, fontWeight: '700', fontSize: 15 },
    memberInfo: { flex: 1 },
    roleTag:    { fontSize: 12, color: colors.textSecondary, textTransform: 'capitalize' },
    youTag:     { fontSize: 13, fontWeight: '500' },
    inviteRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
    inviteText: { fontSize: 15, fontWeight: '500' },
    signOutBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, marginTop: 32, paddingVertical: 14,
      borderWidth: 1, borderRadius: 12,
    },
    signOutText: { fontSize: 16, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalCard:    { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
    modalTitle:   { fontSize: 18, fontWeight: '700', marginBottom: 6 },
    modalSubtitle:{ fontSize: 14, marginBottom: 16 },
    modalInput:   { height: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, fontSize: 15 },
    modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 16, alignItems: 'center' },
    sendBtn:      { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
    sendBtnText:  { color: '#fff', fontSize: 15, fontWeight: '600' },
  })
