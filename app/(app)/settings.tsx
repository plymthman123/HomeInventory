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
import { PageContainer } from '@/components/PageContainer'

interface Member {
  id: string
  display_name: string | null
  role: 'admin' | 'member'
  user_id: string
}

interface MemberWithHousehold extends Member {
  household: { id: string; name: string }
}

type DeleteStep = null | 'choose_items' | 'pick_target' | 'confirm' | 'confirm_household'

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

  const [deleteStep, setDeleteStep]         = useState<DeleteStep>(null)
  const [itemAction, setItemAction]         = useState<'transfer' | 'delete' | null>(null)
  const [transferTarget, setTransferTarget] = useState<Member | null>(null)
  const [deleting, setDeleting]             = useState(false)

  useEffect(() => {
    if (session) loadSettings()
  }, [session])

  async function loadSettings() {
    const { data } = await supabase
      .from('household_members')
      .select('*, household:households(*)')
      .eq('user_id', session!.user.id)
      .single()

    const member = data as MemberWithHousehold | null
    if (!member) return
    setHouseholdId(member.household.id)
    setHouseholdName(member.household.name)
    setIsAdmin(member.role === 'admin')

    const { data: allMembers } = await supabase
      .from('household_members')
      .select('id, display_name, role, user_id')
      .eq('household_id', member.household.id)

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
      { text: 'Sign Out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ])
  }

  const otherMembers = members.filter(m => m.user_id !== session?.user.id)
  const isSoleMember = otherMembers.length === 0

  function openDeleteAccount() {
    setItemAction(null)
    setTransferTarget(null)
    setDeleteStep(isSoleMember ? 'confirm' : 'choose_items')
  }

  function closeDeleteModal() {
    if (deleting) return
    setDeleteStep(null)
    setItemAction(null)
    setTransferTarget(null)
  }

  async function executeDeleteAccount() {
    setDeleting(true)
    const { error } = await supabase.functions.invoke('delete-user', {
      body: {
        action: 'delete_account',
        transferToMemberId: itemAction === 'transfer' ? transferTarget?.id : undefined,
        deleteItems: itemAction === 'delete' ? true : undefined,
      },
    })
    setDeleting(false)
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      await supabase.auth.signOut()
    }
  }

  async function executeDeleteHousehold() {
    setDeleting(true)
    const { error } = await supabase.functions.invoke('delete-user', {
      body: { action: 'delete_household' },
    })
    setDeleting(false)
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      await supabase.auth.signOut()
    }
  }

  const s = styles(colors)

  function renderDeleteContent() {
    switch (deleteStep) {
      case 'choose_items':
        return (
          <>
            <Text style={s.delTitle}>Delete Account</Text>
            <Text style={s.delSubtitle}>What would you like to do with items you own?</Text>

            <TouchableOpacity
              style={[s.choiceRow, itemAction === 'transfer' && { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}
              onPress={() => setItemAction('transfer')}
            >
              <View style={[s.choiceIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="swap-horizontal-outline" size={20} color={colors.primary} />
              </View>
              <View style={s.choiceText}>
                <Text style={[s.choiceLabel, { color: colors.text }]}>Transfer to another member</Text>
                <Text style={[s.choiceDesc, { color: colors.textSecondary }]}>
                  Your items will be reassigned to a family member
                </Text>
              </View>
              {itemAction === 'transfer' && (
                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.choiceRow, itemAction === 'delete' && { borderColor: colors.danger, backgroundColor: '#fff1f0' }]}
              onPress={() => setItemAction('delete')}
            >
              <View style={[s.choiceIcon, { backgroundColor: '#fff1f0' }]}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </View>
              <View style={s.choiceText}>
                <Text style={[s.choiceLabel, { color: colors.text }]}>Delete items I own</Text>
                <Text style={[s.choiceDesc, { color: colors.textSecondary }]}>
                  Items will be permanently removed from the household
                </Text>
              </View>
              {itemAction === 'delete' && (
                <Ionicons name="checkmark-circle" size={22} color={colors.danger} />
              )}
            </TouchableOpacity>

            <View style={s.delButtons}>
              <TouchableOpacity onPress={closeDeleteModal} style={s.delCancelBtn}>
                <Text style={[s.delCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.delNextBtn, { backgroundColor: itemAction ? colors.primary : colors.border }]}
                onPress={() => setDeleteStep(itemAction === 'transfer' ? 'pick_target' : 'confirm')}
                disabled={!itemAction}
              >
                <Text style={s.delNextBtnText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </>
        )

      case 'pick_target':
        return (
          <>
            <Text style={s.delTitle}>Transfer Items To</Text>
            <Text style={s.delSubtitle}>Choose which family member receives your items</Text>

            {otherMembers.map(m => (
              <TouchableOpacity
                key={m.id}
                style={[s.choiceRow, transferTarget?.id === m.id && { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}
                onPress={() => setTransferTarget(m)}
              >
                <View style={[s.memberAvatarSm, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[s.memberInitialSm, { color: colors.primary }]}>
                    {(m.display_name ?? 'U')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={s.choiceText}>
                  <Text style={[s.choiceLabel, { color: colors.text }]}>{m.display_name ?? 'Unknown'}</Text>
                  <Text style={[s.choiceDesc, { color: colors.textSecondary }]}>
                    {m.role === 'admin' ? 'Admin' : 'Member'}
                  </Text>
                </View>
                {transferTarget?.id === m.id && (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}

            <View style={s.delButtons}>
              <TouchableOpacity onPress={() => setDeleteStep('choose_items')} style={s.delCancelBtn}>
                <Text style={[s.delCancelText, { color: colors.textSecondary }]}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.delNextBtn, { backgroundColor: transferTarget ? colors.primary : colors.border }]}
                onPress={() => setDeleteStep('confirm')}
                disabled={!transferTarget}
              >
                <Text style={s.delNextBtnText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </>
        )

      case 'confirm':
        return (
          <>
            <Text style={s.delTitle}>Confirm Deletion</Text>

            <View style={[s.warningBox, { backgroundColor: '#fff8f0', borderColor: '#f97316' }]}>
              <Ionicons name="warning-outline" size={18} color="#f97316" />
              <Text style={[s.warningText, { color: '#7c3100' }]}>This action cannot be undone.</Text>
            </View>

            <View style={s.confirmList}>
              <Text style={[s.confirmLine, { color: colors.text }]}>
                • Your account will be permanently deleted.
              </Text>
              {itemAction === 'transfer' && transferTarget ? (
                <Text style={[s.confirmLine, { color: colors.text }]}>
                  {'• Items you own will be transferred to '}
                  <Text style={{ fontWeight: '700' }}>{transferTarget.display_name ?? 'Unknown'}</Text>
                  {'.'}
                </Text>
              ) : itemAction === 'delete' ? (
                <Text style={[s.confirmLine, { color: colors.text }]}>
                  • Items you own will be permanently deleted.
                </Text>
              ) : null}
              {isSoleMember && (
                <Text style={[s.confirmLine, { color: colors.text }]}>
                  • Your household and all its data will also be deleted.
                </Text>
              )}
            </View>

            <View style={s.delButtons}>
              <TouchableOpacity onPress={closeDeleteModal} style={s.delCancelBtn} disabled={deleting}>
                <Text style={[s.delCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.delNextBtn, { backgroundColor: colors.danger }]}
                onPress={executeDeleteAccount}
                disabled={deleting}
              >
                {deleting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.delNextBtnText}>Delete Account</Text>
                }
              </TouchableOpacity>
            </View>
          </>
        )

      case 'confirm_household':
        return (
          <>
            <Text style={s.delTitle}>Delete Household</Text>

            <View style={[s.warningBox, { backgroundColor: '#fff1f0', borderColor: colors.danger }]}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
              <Text style={[s.warningText, { color: '#7f1d1d' }]}>
                This will immediately and permanently delete everything.
              </Text>
            </View>

            <View style={s.confirmList}>
              <Text style={[s.confirmLine, { color: colors.text }]}>• All items, photos, and warranties</Text>
              <Text style={[s.confirmLine, { color: colors.text }]}>• All locations</Text>
              <Text style={[s.confirmLine, { color: colors.text }]}>
                {'• All '}
                <Text style={{ fontWeight: '700' }}>{members.length}</Text>
                {` member account${members.length !== 1 ? 's' : ''}`}
              </Text>
              <Text style={[s.confirmLine, { color: colors.text }]}>
                • All members will be signed out immediately
              </Text>
            </View>

            <View style={s.delButtons}>
              <TouchableOpacity onPress={closeDeleteModal} style={s.delCancelBtn} disabled={deleting}>
                <Text style={[s.delCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.delNextBtn, { backgroundColor: colors.danger }]}
                onPress={executeDeleteHousehold}
                disabled={deleting}
              >
                {deleting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.delNextBtnText}>Delete Everything</Text>
                }
              </TouchableOpacity>
            </View>
          </>
        )

      default:
        return null
    }
  }

  return (
    <PageContainer narrow>
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
        <View style={[s.row, s.rowBorder]}>
          <Text style={s.rowLabel}>Email</Text>
          <Text style={s.rowValue}>{session?.user.email}</Text>
        </View>
        <TouchableOpacity style={s.row} onPress={openDeleteAccount}>
          <Ionicons name="person-remove-outline" size={17} color={colors.danger} style={{ marginRight: 8 }} />
          <Text style={[s.rowLabel, { color: colors.danger }]}>Delete Account</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.danger} />
        </TouchableOpacity>
      </View>

      {/* Sign out */}
      <TouchableOpacity style={[s.signOutBtn, { borderColor: colors.danger }]} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
        <Text style={[s.signOutText, { color: colors.danger }]}>Sign Out</Text>
      </TouchableOpacity>

      {/* Admin: delete entire household */}
      {isAdmin && (
        <>
          <Text style={s.sectionLabel}>Danger Zone</Text>
          <TouchableOpacity
            style={[s.deleteHouseholdBtn, { borderColor: colors.danger }]}
            onPress={() => setDeleteStep('confirm_household')}
          >
            <Ionicons name="warning-outline" size={18} color={colors.danger} />
            <Text style={[s.signOutText, { color: colors.danger }]}>Delete Household & All Accounts</Text>
          </TouchableOpacity>
        </>
      )}

    </ScrollView>

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

    {/* Delete account / household modal */}
    <Modal visible={deleteStep !== null} transparent animationType="slide">
      <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={closeDeleteModal}>
        <TouchableOpacity
          style={[s.modalCard, s.delModalCard, { backgroundColor: colors.card }]}
          activeOpacity={1}
        >
          {renderDeleteContent()}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>

    </PageContainer>
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
    row:        { flexDirection: 'row', alignItems: 'center', padding: 14 },
    rowBorder:  { borderBottomWidth: 1, borderBottomColor: colors.border },
    rowLabel:   { fontSize: 15, color: colors.text, flex: 1 },
    rowValue:   { fontSize: 15, color: colors.textSecondary },
    memberAvatar: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: colors.primaryLight,
      justifyContent: 'center', alignItems: 'center', marginRight: 10,
    },
    memberInitial: { color: colors.primary, fontWeight: '700', fontSize: 15 },
    memberInfo:    { flex: 1 },
    roleTag:       { fontSize: 12, color: colors.textSecondary, textTransform: 'capitalize' },
    youTag:        { fontSize: 13, fontWeight: '500' },
    inviteRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
    inviteText:    { fontSize: 15, fontWeight: '500' },
    signOutBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, marginTop: 32, paddingVertical: 14,
      borderWidth: 1, borderRadius: 12,
    },
    deleteHouseholdBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, marginTop: 8, paddingVertical: 14,
      borderWidth: 1, borderRadius: 12,
    },
    signOutText: { fontSize: 16, fontWeight: '600' },

    // Invite modal
    modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalCard:     { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
    modalTitle:    { fontSize: 18, fontWeight: '700', marginBottom: 6 },
    modalSubtitle: { fontSize: 14, marginBottom: 16 },
    modalInput:    { height: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, fontSize: 15 },
    modalButtons:  { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 16, alignItems: 'center' },
    sendBtn:       { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
    sendBtnText:   { color: '#fff', fontSize: 15, fontWeight: '600' },

    // Delete modal shared
    delModalCard: { paddingBottom: 36 },
    delTitle:     { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 4 },
    delSubtitle:  { fontSize: 14, color: colors.textSecondary, marginBottom: 20 },

    // Choice rows (item disposition + member picker)
    choiceRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      padding: 14, borderRadius: 12, borderWidth: 1.5,
      borderColor: colors.border, marginBottom: 10,
    },
    choiceIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    choiceText: { flex: 1 },
    choiceLabel: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
    choiceDesc:  { fontSize: 13 },

    // Small avatar used inside modal member list
    memberAvatarSm: {
      width: 36, height: 36, borderRadius: 18,
      justifyContent: 'center', alignItems: 'center',
    },
    memberInitialSm: { fontWeight: '700', fontSize: 15 },

    // Warning / confirm boxes
    warningBox: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 16,
    },
    warningText: { flex: 1, fontSize: 13, fontWeight: '500' },
    confirmList: { gap: 6, marginBottom: 24 },
    confirmLine: { fontSize: 14, lineHeight: 20 },

    // Modal action buttons
    delButtons:    { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginTop: 4 },
    delCancelBtn:  { paddingVertical: 10, paddingHorizontal: 4 },
    delCancelText: { fontSize: 15 },
    delNextBtn:    { paddingHorizontal: 20, paddingVertical: 11, borderRadius: 10 },
    delNextBtnText:{ color: '#fff', fontSize: 15, fontWeight: '600' },
  })
