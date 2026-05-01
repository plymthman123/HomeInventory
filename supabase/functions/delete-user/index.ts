// Edge Function: delete-user
//
// Handles account and household deletion properly by going through GoTrue's
// Admin API (auth.admin.deleteUser) instead of DELETE FROM auth.users directly.
// Direct SQL deletion bypasses GoTrue's internal email state cleanup, which
// prevents the same email address from being used to register again.
//
// Flow:
//   1. Verify the caller's JWT
//   2. Run data-only cleanup via RPC (item transfer, admin promotion, etc.)
//   3. Delete auth account(s) through the Admin API — GoTrue cleans up properly

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing authorization header' }, 401)

    const supabaseUrl        = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey            = Deno.env.get('SUPABASE_ANON_KEY')!

    // User-context client — validates the JWT and enforces RLS
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })

    // Admin client — bypasses RLS, used only for auth.admin.deleteUser
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) return json({ error: 'Unauthorized' }, 401)

    const { action, transferToMemberId, deleteItems } = await req.json()

    if (action === 'delete_account') {
      // Step 1: data cleanup (item transfer/deletion, admin promotion, sole-member
      //         household wipe) — does NOT touch auth.users
      const { error: cleanupErr } = await userClient.rpc('cleanup_account', {
        p_transfer_to_member_id: transferToMemberId ?? null,
        p_delete_my_items:       deleteItems ?? false,
      })
      if (cleanupErr) return json({ error: cleanupErr.message }, 500)

      // Step 2: proper GoTrue deletion — cleans up email state so the address
      //         can be reused immediately for a new registration
      const { error: deleteErr } = await adminClient.auth.admin.deleteUser(user.id)
      if (deleteErr) return json({ error: deleteErr.message }, 500)

      return json({ success: true })
    }

    if (action === 'delete_household') {
      // Step 1: collect all member user_ids and wipe household data
      const { data: userIds, error: cleanupErr } =
        await userClient.rpc('cleanup_household_delete')
      if (cleanupErr) return json({ error: cleanupErr.message }, 500)

      // Step 2: delete every member's auth account through GoTrue
      const ids: string[] = userIds ?? []
      for (const uid of ids) {
        const { error } = await adminClient.auth.admin.deleteUser(uid)
        // Log but don't abort — remaining accounts should still be cleaned up
        if (error) console.error(`Failed to delete auth user ${uid}:`, error.message)
      }

      return json({ success: true })
    }

    return json({ error: `Unknown action: ${action}` }, 400)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return json({ error: message }, 500)
  }
})
