import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deleteEvent } from '@/lib/google-calendar/client'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Get event to check if protected and get google_event_id
  const { data: event } = await supabase
    .from('calendar_events')
    .select('is_protected,google_event_id,calendar_id')
    .eq('id', id)
    .maybeSingle()

  if (!event) return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
  if (event.is_protected) return NextResponse.json({ error: 'No se puede eliminar un evento protegido' }, { status: 403 })

  // Delete from Google Calendar if we have tokens
  if (event.google_event_id) {
    const { data: profile } = await supabase.from('profiles').select('google_tokens').maybeSingle()
    if (profile?.google_tokens) {
      try {
        const tokens = profile.google_tokens as { access_token: string; refresh_token?: string }
        await deleteEvent(tokens, event.google_event_id, event.calendar_id ?? 'primary')
      } catch (err) {
        console.error('Google Calendar delete failed:', err)
      }
    }
  }

  // Delete from local DB
  const { error } = await supabase.from('calendar_events').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
