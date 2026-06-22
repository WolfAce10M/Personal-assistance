import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai, getOpenAI, SYSTEM_PROMPT } from '@/lib/openai/client'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const VOICE_KEYWORDS = ['responde con voz', 'en audio', 'dímelo', 'cuéntame', 'explícame en voz']

// Notion command patterns
const NOTION_NOTE_KEYWORDS = ['guarda esto en notion', 'apunta en notion', 'nota en notion', 'guarda esta nota', 'anota esto', 'guárdalo en notion']
const NOTION_CRM_KEYWORDS = ['añade al crm', 'agrega al crm', 'nuevo contacto en notion', 'guarda el contacto', 'añade contacto']
const NOTION_BRIEFING_KEYWORDS = ['briefing de hoy en notion', 'genera el briefing', 'crea el briefing']

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

// Handle Notion commands — returns true if handled
async function handleNotionCommand(text: string, chatId: number, token: string): Promise<boolean> {
  const lowerText = text.toLowerCase()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Save note to Notion
  if (NOTION_NOTE_KEYWORDS.some(kw => lowerText.includes(kw))) {
    try {
      // Extract note content (remove the keyword trigger)
      let content = text
      for (const kw of NOTION_NOTE_KEYWORDS) {
        const idx = lowerText.indexOf(kw)
        if (idx !== -1) {
          content = text.slice(idx + kw.length).trim() || text
          break
        }
      }
      const res = await fetch(`${baseUrl}/api/notion/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content || text, source: 'telegram' }),
      })
      const data = await res.json()
      if (data.ok) {
        await sendTextReply(chatId, '✅ Nota guardada en Notion.', token)
      } else {
        await sendTextReply(chatId, `❌ Error al guardar en Notion: ${data.error}`, token)
      }
    } catch {
      await sendTextReply(chatId, '❌ No se pudo guardar en Notion.', token)
    }
    return true
  }

  // Add CRM contact
  if (NOTION_CRM_KEYWORDS.some(kw => lowerText.includes(kw))) {
    try {
      // Ask AI to extract structured CRM data from the message
      const extraction = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Extrae los datos del contacto del texto y devuelve SOLO un JSON con los campos: name (obligatorio), empresa, email, telefono, estado (Lead/En proceso/Cerrado/Perdido), valor (número), notas. Si no hay un campo, omítelo. Solo JSON, sin texto adicional.',
          },
          { role: 'user', content: text },
        ],
        temperature: 0,
        max_tokens: 300,
      })
      const jsonStr = extraction.choices[0]?.message?.content ?? '{}'
      const contactData = JSON.parse(jsonStr.replace(/```json|```/g, '').trim())

      if (!contactData.name) {
        await sendTextReply(chatId, 'No encontré el nombre del contacto. Dime: "Añade al CRM: [nombre], empresa: [empresa], email: [email]"', token)
        return true
      }

      const res = await fetch(`${baseUrl}/api/notion/crm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactData),
      })
      const data = await res.json()
      if (data.ok) {
        await sendTextReply(chatId, `✅ Contacto "${contactData.name}" añadido al CRM de Notion.`, token)
      } else {
        await sendTextReply(chatId, `❌ Error al añadir al CRM: ${data.error}`, token)
      }
    } catch {
      await sendTextReply(chatId, '❌ No se pudo añadir al CRM.', token)
    }
    return true
  }

  // Generate briefing
  if (NOTION_BRIEFING_KEYWORDS.some(kw => lowerText.includes(kw))) {
    try {
      await sendTextReply(chatId, '⏳ Generando briefing del día...', token)
      const res = await fetch(`${baseUrl}/api/notion/briefings`, { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        const preview = data.briefing.slice(0, 500) + (data.briefing.length > 500 ? '...' : '')
        await sendTextReply(chatId, `☀️ Briefing guardado en Notion:\n\n${preview}`, token)
      } else {
        await sendTextReply(chatId, `❌ Error: ${data.error}`, token)
      }
    } catch {
      await sendTextReply(chatId, '❌ No se pudo generar el briefing.', token)
    }
    return true
  }

  return false
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const message = body?.message
    if (!message) return NextResponse.json({ ok: true })

    const chatId = message.chat.id
    const token = process.env.TELEGRAM_BOT_TOKEN!
    let text = message.text ?? ''

    // Transcribe voice messages with Whisper
    if (!text && message.voice) {
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

    // Check for Notion commands first
    const notionHandled = await handleNotionCommand(text, chatId, token)
    if (notionHandled) return NextResponse.json({ ok: true })

    // Detect if user wants a voice reply (only when explicitly requested)
    const wantsVoice = VOICE_KEYWORDS.some(kw => text.toLowerCase().includes(kw))

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
