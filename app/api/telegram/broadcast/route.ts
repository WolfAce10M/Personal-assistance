import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendDailyBriefing } from '@/lib/telegram/bot'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export async function POST(req: NextRequest) {
  const { type = 'briefing' } = await req.json()
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('telegram_chat_id')
    .maybeSingle()

  if (!profile?.telegram_chat_id) {
    return NextResponse.json({ error: 'No Telegram chat ID configured' }, { status: 400 })
  }

  if (type === 'briefing') {
    const [{ data: tasks }, { data: events }, { data: training }] = await Promise.all([
      supabase.from('tasks').select('title').neq('status', 'completed').in('priority', ['urgent', 'high']).limit(5),
      supabase.from('calendar_events').select('title,start_time').gte('start_time', new Date().toISOString()).limit(1),
      supabase.from('training_sessions').select('name').eq('scheduled_date', format(new Date(), 'yyyy-MM-dd')).maybeSingle(),
    ])

    await sendDailyBriefing(profile.telegram_chat_id, {
      date: format(new Date(), "EEEE, d 'de' MMMM", { locale: es }),
      summary: 'Aquí está tu resumen del día',
      topTasks: tasks?.map((t: { title: string }) => t.title) ?? [],
      nextEvent: events?.[0] ? `${events[0].title} — ${format(new Date(events[0].start_time), 'HH:mm')}` : undefined,
      training: training?.name,
    })
  }

  return NextResponse.json({ ok: true })
}
