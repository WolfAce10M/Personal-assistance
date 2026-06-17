import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('calendar_events')
    .select('is_protected')
    .eq('id', id)
    .single()

  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('calendar_events')
    .update({ is_protected: !event.is_protected })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ event: data })
}
