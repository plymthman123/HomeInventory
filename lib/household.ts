import { supabase } from './supabase'

/**
 * Creates a new household for a user and seeds default locations.
 * Uses a SECURITY DEFINER database function to avoid the chicken-and-egg
 * RLS problem where the user can't SELECT the household they just created
 * because they aren't yet a member of it.
 */
export async function createHousehold(userId: string, householdName: string) {
  const { data: householdId, error } = await supabase.rpc('create_household_for_user', {
    p_user_id: userId,
    p_household_name: householdName,
  })

  if (error) throw error

  return { id: householdId as string }
}

/**
 * Returns the household (and member record) for the current user.
 * Returns null if the user has no household yet (needs onboarding).
 */
export async function getCurrentHousehold() {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('household_members')
    .select('*, household:households(*)')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) throw error
  return data
}
