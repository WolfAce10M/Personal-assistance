import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai, SYSTEM_PROMPT } from '@/lib/openai/client'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Telegram webhook payload
  const message = body?.message
  if (!message?.text) {
    return NextResponse.json({ ok: true })
  }

  const chatId = message.chat.id
  const text = message.text
  const supabase = await createClient()

  // Save user message
  await supabase.from('chat_messages').insert({
    role: 'user',
    content: text,
    channel: 'telegram',
    metadata: { telegram_chat_id: chatId, telegram_message_id: message.message_id },
  })

  // Get context
  const [
    { data: tasks },
    { data: events },
    { data: goals },
  ] = await Promise.all([
    supabase.from('tasks').select('title,priority,status').neq('status', 'completed').limit(5),
    supabase.from('calendar_events').select('title,start_time').gte('start_time', new Date().toISOString()).limit(3),
    supabase.from('goals').select('title,type,progress').eq('status', 'active').limit(3),
  ])

  const context = {
    fecha: format(new Date(), "EEEE, d 'de' MMMM HH:mm", { locale: es }),
    tareas: tasks ?? [],
    proximos_eventos: events ?? [],
    objetivos: goals ?? [],
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `${SYSTEM_PROMPT}\n\nContexto: ${JSON.stringify(context)}\n\nEres el asistente en Telegram. Respuestas cortas y directas. Máximo 3 párrafos.`,
      },
      { role: 'user', content: text },
    ],
    temperature: 0.7,
    max_tokens: 500,
  })

  const reply = completion.choices[0]?.message?.content ?? 'No pude procesar tu mensaje.'

  // Save assistant reply
  await supabase.from('chat_messages').insert({
    role: 'assistant',
    content: reply,
    channel: 'telegram',
    metadata: { telegram_chat_id: chatId },
  })

  // Send reply via Telegram API
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN
  if (telegramToken) {
    await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: reply,
        parse_mode: 'HTML',
      }),
    })
  }

  return NextResponse.json({ ok: true })
}

// Set Telegram webhook
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const setup = searchParams.get('setup')

  if (setup !== 'webhook') {
    return NextResponse.json({ ok: false, error: 'Use ?setup=webhook' })
  }

  const telegramToken = process.env.TELEGRAM_BOT_TOKEN
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!telegramToken || !appUrl) {
    return NextResponse.json({ ok: false, error: 'Missing env vars' })
  }

  const res = await fetch(
    `https://api.telegram.org/bot${telegramToken}/setWebhook`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: `${appUrl}/api/telegram` }),
    }
  )
  const data = await res.json()
  return NextResponse.json(data)
}
