import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai, SYSTEM_PROMPT } from '@/lib/openai/client'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const message = body?.message
    if (!message?.text) return NextResponse.json({ ok: true })

    const chatId = message.chat.id
    const text = message.text

    let context = { fecha: format(new Date(), "EEEE, d 'de' MMMM HH:mm", { locale: es }) }

    // Load context — non-blocking
    try {
      const supabase = await createClient()
      const [{ data: tasks }, { data: events }, { data: goals }] = await Promise.all([
        supabase.from('tasks').select('title,priority,status').neq('status', 'completed').limit(5),
        supabase.from('calendar_events').select('title,start_time').gte('start_time', new Date().toISOString()).limit(3),
        supabase.from('goals').select('title,type,progress').eq('status', 'active').limit(3),
      ])
      context = { ...context, tareas: tasks ?? [], proximos_eventos: events ?? [], objetivos: goals ?? [] } as typeof context
      supabase.from('chat_messages').insert({ role: 'user', content: text, channel: 'telegram', metadata: { telegram_chat_id: chatId } }).then(() => {})
    } catch { /* continue without context */ }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `${SYSTEM_PROMPT}\n\nContexto: ${JSON.stringify(context)}\n\nEstás en Telegram. Respuestas directas y cortas. Máximo 3 párrafos.`,
        },
        { role: 'user', content: text },
      ],
      temperature: 0.7,
      max_tokens: 500,
    })

    const reply = completion.choices[0]?.message?.content ?? 'No pude procesar tu mensaje.'

    // Save reply and send — non-blocking save
    try {
      const supabase = await createClient()
      supabase.from('chat_messages').insert({ role: 'assistant', content: reply, channel: 'telegram', metadata: { telegram_chat_id: chatId } }).then(() => {})
    } catch { /* ignore */ }

    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: reply }),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Telegram webhook error:', err)
    return NextResponse.json({ ok: true }) // Always return 200 to Telegram
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get('setup') !== 'webhook') {
    return NextResponse.json({ ok: false, error: 'Use ?setup=webhook' })
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return NextResponse.json({ ok: false, error: 'TELEGRAM_BOT_TOKEN not set' })

  // Build webhook URL from request headers
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || new URL(req.url).host
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  const webhookUrl = `${proto}://${host}/api/telegram`

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl }),
  })
  const data = await res.json()
  return NextResponse.json({ ...data, webhookUrl })
}
