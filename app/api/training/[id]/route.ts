import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await req.json()

  const updates: Record<string, unknown> = {}
  const fields = ['name', 'type', 'scheduled_date', 'completed_at', 'duration_minutes', 'exercises', 'notes', 'status']
  for (const f of fields) {
    if (body[f] !== undefined) updates[f] = body[f]
  }

  const { data, error } = await supabase
    .from('training_sessions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ session: data })
}
