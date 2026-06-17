import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const type = searchParams.get('type')
  const limit = parseInt(searchParams.get('limit') ?? '20')

  let query = supabase
    .from('personal_dev_entries')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (status) query = query.eq('status', status)
  if (type) query = query.eq('type', type)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entries: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()

  const { data, error } = await supabase
    .from('personal_dev_entries')
    .insert({
      type: body.type,
      title: body.title,
      description: body.description,
      status: 'active',
      progress: 0,
      notes: body.notes,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: data }, { status: 201 })
}
