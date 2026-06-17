import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)

  const status = searchParams.get('status')
  const type = searchParams.get('type')
  const limit = parseInt(searchParams.get('limit') ?? '50')

  let query = supabase
    .from('goals')
    .select('*')
    .order('priority', { ascending: true })
    .limit(limit)

  if (status) query = query.eq('status', status)
  if (type) query = query.eq('type', type)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ goals: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()

  const { data, error } = await supabase
    .from('goals')
    .insert({
      title: body.title,
      description: body.description,
      type: body.type,
      status: 'active',
      priority: body.priority ?? 1,
      target_date: body.target_date,
      progress: 0,
      parent_goal_id: body.parent_goal_id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ goal: data }, { status: 201 })
}
