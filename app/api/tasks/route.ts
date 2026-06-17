import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)

  const status = searchParams.get('status')
  const priority = searchParams.get('priority')
  const category = searchParams.get('category')
  const limit = parseInt(searchParams.get('limit') ?? '50')
  const search = searchParams.get('q')

  let query = supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) {
    const statuses = status.split(',')
    query = query.in('status', statuses)
  }
  if (priority) {
    const priorities = priority.split(',')
    query = query.in('priority', priorities)
  }
  if (category) {
    query = query.eq('category', category)
  }
  if (search) {
    query = query.ilike('title', `%${search}%`)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tasks: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: body.title,
      description: body.description,
      priority: body.priority ?? 'medium',
      status: 'pending',
      category: body.category,
      due_date: body.due_date,
      goal_id: body.goal_id,
      estimated_minutes: body.estimated_minutes,
      tags: body.tags ?? [],
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ task: data }, { status: 201 })
}
