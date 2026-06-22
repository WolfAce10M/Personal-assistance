import { NextRequest, NextResponse } from 'next/server'
import { addDatabaseRow } from '@/lib/notion/client'
import { createClient } from '@/lib/supabase/server'
import { openai, SYSTEM_PROMPT } from '@/lib/openai/client'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

async function getBriefingsDbId(): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('ai_memory')
      .select('value')
      .eq('category', 'notion')
      .eq('key', 'briefings_db_id')
      .maybeSingle()
    return data?.value ?? null
  } catch { return null }
}

export async function POST(req: NextRequest) {
  try {
    const briefingsDbId = await getBriefingsDbId()
    if (!briefingsDbId) return NextResponse.json({ error: 'Notion no configurado' }, { status: 400 })

    const supabase = await createClient()
    const today = format(new Date(), 'yyyy-MM-dd')
    const fecha = format(new Date(), "EEEE d 'de' MMMM yyyy", { locale: es })

    const [{ data: tasks }, { data: goals }, { data: events }] = await Promise.all([
      supabase.from('tasks').select('title,priority,status').neq('status', 'completed').limit(10),
      supabase.from('goals').select('title,progress,status').eq('status', 'active').limit(5),
      supabase.from('calendar_events').select('title,start_time').gte('start_time', new Date().toISOString()).limit(5),
    ])

    const context = {
      fecha,
      tareas: tasks ?? [],
      objetivos: goals ?? [],
      eventos: events ?? [],
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `${SYSTEM_PROMPT}\n\nGenera un briefing diario conciso y motivador para hoy. Incluye: resumen de tareas prioritarias, próximos eventos, progreso en objetivos y una frase de motivación enfocada en resultados y dinero. Formato limpio sin markdown excesivo.`,
        },
        { role: 'user', content: `Contexto: ${JSON.stringify(context)}\n\nGenera el briefing de hoy.` },
      ],
      temperature: 0.7,
      max_tokens: 800,
    })

    const briefingText = completion.choices[0]?.message?.content ?? 'Sin briefing disponible'

    const page = await addDatabaseRow(briefingsDbId, {
      Name: { title: [{ type: 'text', text: { content: `Briefing — ${fecha}` } }] },
      Fecha: { date: { start: today } },
      Resumen: { rich_text: [{ type: 'text', text: { content: briefingText.slice(0, 2000) } }] },
      Prioridad: { select: { name: 'Normal' } },
    })

    return NextResponse.json({ ok: true, briefing: briefingText, pageId: page.id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    console.error('Notion briefing error:', err)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
