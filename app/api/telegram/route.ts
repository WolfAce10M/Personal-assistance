import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai, getOpenAI, SYSTEM_PROMPT } from '@/lib/openai/client'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const VOICE_KEYWORDS = ['responde con voz', 'en audio', 'dímelo', 'cuéntame', 'explícame en voz']

async function sendVoiceReply(chatId: number, text: string, token: string) {
  const ttsResponse = await getOpenAI().audio.speech.create({
    model: 'tts-1',
    voice: 'alloy',
    input: text,
    response_format: 'opus',
  })
  const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer())
  const formData = new FormData()
  formData.append('chat_id', String(chatId))
  formData.append('voice', new Blob([audioBuffer], { type: 'audio/ogg' }), 'reply.ogg')
  await fetch(`https://api.telegram.org/bot${token}/sendVoice`, { method: 'POST', body: formData })
}

async function sendTextReply(chatId: number, text: string, token: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const message = body?.message
    if (!message) return NextResponse.json({ ok: true })

    const chatId = message.chat.id
    const token = process.env.TELEGRAM_BOT_TOKEN!
    let text = message.text ?? ''
    let isVoiceMessage = false

    // Transcribe voice messages with Whisper
    if (!text && message.voice) {
      isVoiceMessage = true
      try {
        const fileInfo = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${message.voice.file_id}`).then(r => r.json())
        const filePath = fileInfo.result?.file_path
        if (filePath) {
          const audioRes = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`)
          const audioBuffer = await audioRes.arrayBuffer()
          const audioFile = new File([audioBuffer], 'voice.ogg', { type: 'audio/ogg' })
          const transcription = await getOpenAI().audio.transcriptions.create({ file: audioFile, model: 'whisper-1', language: 'es' })
          text = transcription.text
        }
      } catch (err) {
        console.error('Whisper error:', err)
      }
    }

    if (!text) return NextResponse.json({ ok: true })

    // Detect if user wants a voice reply
    const wantsVoice = isVoiceMessage || VOICE_KEYWORDS.some(kw => text.toLowerCase().includes(kw))

    let context = { fecha: format(new Date(), "EEEE, d 'de' MMMM HH:mm", { locale: es }) }

    try {
      const supabase = await createClient()
      const [{ data: tasks }, { data: events }, { data: goals }] = await Promise.all([
        supabase.from('tasks').select('title,priority,status').neq('status', 'completed').limit(5),
        supabase.from('calendar_events').select('title,start_time').gte('start_time', new Date().toISOString()).limit(3),
        supabase.from('goals').select('title,type,progress').eq('status', 'active').limit(3),
      ])
      context = { ...context, tareas: tasks ?? [], proximos_eventos: events ?? [], objetivos: goals ?? [] } as typeof context
      supabase.from('chat_messages').insert({ role: 'user', content: text, channel: 'telegram', metadata: { telegram_chat_id: chatId } }).then(() => {})
    } catch { /* continue */ }

    const systemNote = wantsVoice
      ? 'Responde de forma natural y conversacional, como si hablaras en voz alta. Sin listas, sin markdown, sin asteriscos.'
      : 'Respuestas directas y cortas. Máximo 3 párrafos.'

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: `${SYSTEM_PROMPT}\n\nContexto: ${JSON.stringify(context)}\n\n${systemNote}` },
        { role: 'user', content: text },
      ],
      temperature: 0.7,
      max_tokens: 500,
    })

    const reply = completion.choices[0]?.message?.content ?? 'No pude procesar tu mensaje.'

    try {
      const supabase = await createClient()
      supabase.from('chat_messages').insert({ role: 'assistant', content: reply, channel: 'telegram', metadata: { telegram_chat_id: chatId } }).then(() => {})
    } catch { /* ignore */ }

    if (wantsVoice) {
      try {
        await sendVoiceReply(chatId, reply, token)
      } catch {
        // Fallback to text if TTS fails
        await sendTextReply(chatId, reply, token)
      }
    } else {
      await sendTextReply(chatId, reply, token)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Telegram webhook error:', err)
    return NextResponse.json({ ok: true })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get('setup') !== 'webhook') {
    return NextResponse.json({ ok: false, error: 'Use ?setup=webhook' })
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return NextResponse.json({ ok: false, error: 'TELEGRAM_BOT_TOKEN not set' })

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
