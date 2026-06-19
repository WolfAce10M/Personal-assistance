import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id,name,autonomy_level,telegram_chat_id,preferences')
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: data })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()

  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.autonomy_level !== undefined) updates.autonomy_level = body.autonomy_level
  if (body.telegram_chat_id !== undefined) updates.telegram_chat_id = body.telegram_chat_id
  if (body.preferences !== undefined) updates.preferences = body.preferences

  // Upsert (create if doesn't exist, update if exists)
  const { data: existing } = await supabase.from('profiles').select('id').maybeSingle()

  let data, error
  if (existing) {
    ;({ data, error } = await supabase.from('profiles').update(updates).eq('id', existing.id).select().single())
  } else {
    ;({ data, error } = await supabase.from('profiles').insert({ email: 'user@pos.app', ...updates }).select().single())
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: data })
}
