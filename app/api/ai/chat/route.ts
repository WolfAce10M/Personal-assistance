import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai, SYSTEM_PROMPT } from '@/lib/openai/client'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export async function POST(req: NextRequest) {
  try {
    const { message, channel = 'web' } = await req.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 })
    }

    const fecha_actual = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy HH:mm", { locale: es })
    let context: Record<string, unknown> = { fecha_actual }
    let chatHistory: { role: 'user' | 'assistant'; content: string }[] = []

    // Load context from Supabase — non-blocking, ignore errors
    try {
      const supabase = await createClient()
      const today = format(new Date(), 'yyyy-MM-dd')
      const [
        { data: tasks },
        { data: goals },
        { data: events },
        { data: training },
        { data: history },
        { data: memory },
      ] = await Promise.all([
        supabase.from('tasks').select('title,priority,status').neq('status', 'completed').limit(10),
        supabase.from('goals').select('title,type,progress,status').eq('status', 'active').limit(5),
        supabase.from('calendar_events').select('title,start_time').gte('start_time', new Date().toISOString()).limit(5),
        supabase.from('training_sessions').select('name,status').eq('scheduled_date', today).maybeSingle(),
        supabase.from('chat_messages').select('role,content').order('created_at', { ascending: false }).limit(10),
        supabase.from('ai_memory').select('category,key,value').limit(20),
      ])

      context = {
        fecha_actual,
        tareas_pendientes: tasks ?? [],
        objetivos_activos: goals ?? [],
        proximos_eventos: events ?? [],
        entrenamiento_hoy: training ?? null,
        memoria: memory ?? [],
      }

      chatHistory = (history ?? []).reverse().map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

      // Save user message (non-blocking)
      supabase.from('chat_messages').insert({ role: 'user', content: message, channel }).then(() => {})
    } catch {
      // Continue without context if Supabase fails
    }

    // Call OpenAI — this is the core
    const systemWithContext = `${SYSTEM_PROMPT}\n\nContexto actual:\n${JSON.stringify(context, null, 2)}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemWithContext },
        ...chatHistory.slice(-8),
        { role: 'user', content: message },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    })

    const reply = completion.choices[0]?.message?.content ?? 'No pude generar una respuesta.'

    // Save assistant message (non-blocking)
    let savedMsg: { id: string } | null = null
    try {
      const supabase = await createClient()
      const { data } = await supabase
        .from('chat_messages')
        .insert({ role: 'assistant', content: reply, channel })
        .select('id,role,content,channel,created_at,metadata')
        .single()
      savedMsg = data
    } catch {
      // Continue even if save fails
    }

    return NextResponse.json({ reply, message: savedMsg })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno'
    console.error('Chat API error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') ?? '50')
    const channel = searchParams.get('channel')

    let query = supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(limit)

    if (channel) query = query.eq('channel', channel)

    const { data, error } = await query
    if (error) return NextResponse.json({ messages: [] })
    return NextResponse.json({ messages: data ?? [] })
  } catch {
    return NextResponse.json({ messages: [] })
  }
}
