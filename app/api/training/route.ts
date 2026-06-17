import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const status = searchParams.get('status')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  let query = supabase
    .from('training_sessions')
    .select('*')
    .order('scheduled_date', { ascending: false })
    .limit(limit)

  if (status) query = query.eq('status', status)
  if (from) query = query.gte('scheduled_date', from)
  if (to) query = query.lte('scheduled_date', to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sessions: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()

  const { data, error } = await supabase
    .from('training_sessions')
    .insert({
      plan_id: body.plan_id,
      name: body.name,
      type: body.type,
      scheduled_date: body.scheduled_date,
      duration_minutes: body.duration_minutes,
      exercises: body.exercises ?? [],
      notes: body.notes,
      status: 'scheduled',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ session: data }, { status: 201 })
}
