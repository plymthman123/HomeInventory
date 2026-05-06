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

    const supabaseUrl   = Deno.env.get('SUPABASE_URL')!
    const anonKey       = Deno.env.get('SUPABASE_ANON_KEY')!
    const anthropicKey  = Deno.env.get('ANTHROPIC_API_KEY')!

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) return json({ error: 'Unauthorized' }, 401)

    const body = await req.json()
    const messages: { role: string; content: string }[] = body.messages ?? []

    // Fetch household
    const { data: memberData } = await userClient
      .from('household_members')
      .select('household:households(id, name)')
      .eq('user_id', user.id)
      .single()

    if (!memberData?.household) return json({ error: 'No household found' }, 404)
    const hh = memberData.household as { id: string; name: string }

    // Fetch context in parallel
    const [itemsRes, locationsRes, warrantiesRes] = await Promise.all([
      userClient
        .from('items')
        .select('id, purchase_price, location_id')
        .eq('household_id', hh.id),
      userClient
        .from('locations')
        .select('id, name')
        .eq('household_id', hh.id),
      userClient
        .from('warranties')
        .select('end_date, provider, item:items!inner(name, household_id)')
        .eq('item.household_id', hh.id)
        .gte('end_date', new Date().toISOString().split('T')[0])
        .lte('end_date', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('end_date', { ascending: true })
        .limit(10),
    ])

    const items     = itemsRes.data ?? []
    const locations = locationsRes.data ?? []
    const warranties = warrantiesRes.data ?? []

    const totalValue = items.reduce((sum, i) => sum + (i.purchase_price ?? 0), 0)

    // Per-location item counts (computed from items we already fetched)
    const locationCounts: Record<string, number> = {}
    for (const item of items) {
      if (item.location_id) {
        locationCounts[item.location_id] = (locationCounts[item.location_id] ?? 0) + 1
      }
    }

    const locationSummary = locations.length === 0
      ? '  None configured'
      : locations
          .map(l => `  - ${l.name}: ${locationCounts[l.id] ?? 0} items`)
          .join('\n')

    const warrantySummary = warranties.length === 0
      ? '  None'
      : warranties
          .map(w => {
            const item = w.item as { name: string }
            return `  - ${item.name} (expires ${w.end_date}${w.provider ? ', ' + w.provider : ''})`
          })
          .join('\n')

    const today = new Date().toISOString().split('T')[0]
    const systemPrompt = `You are a helpful assistant for the HomeInventory app. You help users understand and manage their household belongings.

--- Household Context (as of ${today}) ---
Household name: ${hh.name}
Total tracked items: ${items.length}
Total estimated value: $${totalValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}

Locations and item counts:
${locationSummary}

Warranties expiring in the next 90 days:
${warrantySummary}
--- End of Context ---

Answer questions about the user's inventory concisely. If you don't know something specific (like exact item names or details not listed above), say so and suggest they check the Items screen. Never make up data. Keep responses brief — 2-4 sentences unless more detail is clearly needed.`

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 512,
        system: systemPrompt,
        messages: messages.slice(-12),
      }),
    })

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text()
      console.error('Anthropic error:', err)
      return json({ error: 'AI service error' }, 502)
    }

    const anthropicData = await anthropicRes.json()
    const reply: string = anthropicData.content?.[0]?.text ?? ''

    return json({ reply })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return json({ error: message }, 500)
  }
})
