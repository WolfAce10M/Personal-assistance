import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listEvents } from '@/lib/google-calendar/client'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get('days') ?? '7')

  // Get user profile with google tokens
  const { data: profile } = await supabase
    .from('profiles')
    .select('google_tokens')
    .single()

  if (!profile?.google_tokens) {
    // Return cached events from DB
    const now = new Date().toISOString()
    const future = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('calendar_events')
      .select('*')
      .gte('start_time', now)
      .lte('start_time', future)
      .order('start_time')

    return NextResponse.json({ events: data ?? [], connected: false })
  }

  try {
    const tokens = profile.google_tokens as { access_token: string; refresh_token: string }
    const events = await listEvents(tokens, {
      timeMin: new Date().toISOString(),
      timeMax: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
      maxResults: 50,
    })

    // Sync to DB
    for (const event of events) {
      if (!event.google_event_id) continue
      const { data: existing } = await supabase
        .from('calendar_events')
        .select('id, is_protected')
        .eq('google_event_id', event.google_event_id)
        .single()

      if (existing) {
        await supabase
          .from('calendar_events')
          .update({
            title: event.title,
            description: event.description,
            start_time: event.start_time,
            end_time: event.end_time,
            location: event.location,
          })
          .eq('id', existing.id)
        event.is_protected = existing.is_protected
      } else {
        await supabase.from('calendar_events').insert(event)
      }
    }

    return NextResponse.json({ events, connected: true })
  } catch (err) {
    console.error('Calendar sync error:', err)
    const { data } = await supabase
      .from('calendar_events')
      .select('*')
      .gte('start_time', new Date().toISOString())
      .order('start_time')
      .limit(20)
    return NextResponse.json({ events: data ?? [], connected: false, error: 'Sync failed' })
  }
}
