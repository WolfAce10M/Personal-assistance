import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai, SYSTEM_PROMPT } from '@/lib/openai/client'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export async function POST(req: NextRequest) {
  const { message, channel = 'web' } = await req.json()

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 })
  }

  const supabase = await createClient()

  // Load recent context
  const today = format(new Date(), 'yyyy-MM-dd')
  const [
    { data: tasks },
    { data: goals },
    { data: events },
    { data: training },
    { data: history },
    { data: memory },
  ] = await Promise.all([
    supabase.from('tasks').select('title,priority,status,due_date').neq('status', 'completed').limit(10),
    supabase.from('goals').select('title,type,progress,status').eq('status', 'active').limit(5),
    supabase.from('calendar_events').select('title,start_time,end_time,is_protected').gte('start_time', new Date().toISOString()).limit(5),
    supabase.from('training_sessions').select('name,scheduled_date,status,exercises').eq('scheduled_date', today).single(),
    supabase.from('chat_messages').select('role,content').order('created_at', { ascending: false }).limit(10),
    supabase.from('ai_memory').select('category,key,value').limit(20),
  ])

  const context = {
    fecha_actual: format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy HH:mm", { locale: es }),
    tareas_pendientes: tasks ?? [],
    objetivos_activos: goals ?? [],
    proximos_eventos: events ?? [],
    entrenamiento_hoy: training ?? null,
    memoria: memory ?? [],
  }

  const chatHistory = (history ?? []).reverse().map((m: { role: string; content: string }) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  // Save user message
  await supabase.from('chat_messages').insert({
    role: 'user',
    content: message,
    channel,
  })

  // Call OpenAI
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

  // Save assistant message
  const { data: savedMsg } = await supabase
    .from('chat_messages')
    .insert({ role: 'assistant', content: reply, channel })
    .select()
    .single()

  // Extract and save any memory mentions
  if (reply.toLowerCase().includes('recuerdo') || reply.toLowerCase().includes('prefier')) {
    await supabase.from('ai_memory').upsert({
      category: 'conversation',
      key: `note_${Date.now()}`,
      value: message.substring(0, 200),
    }, { onConflict: 'category,key' })
  }

  return NextResponse.json({ reply, message: savedMsg })
}

export async function GET(req: NextRequest) {
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
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ messages: data })
}
