import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai, SYSTEM_PROMPT } from '@/lib/openai/client'

export async function GET() {
  const supabase = await createClient()
  const { data: entries } = await supabase
    .from('personal_dev_entries')
    .select('type,title,progress')
    .eq('status', 'active')
    .limit(5)

  const prompt = `El usuario tiene estas actividades de desarrollo personal activas:
${JSON.stringify(entries ?? [], null, 2)}

Genera UNA sugerencia concreta y motivadora para hoy. Máximo 2 frases. En español.`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 150,
    })
    const suggestion = completion.choices[0]?.message?.content ?? 'Dedica 20 minutos hoy a tu desarrollo personal.'
    return NextResponse.json({ suggestion })
  } catch {
    return NextResponse.json({ suggestion: 'Dedica al menos 20 minutos hoy a tu desarrollo personal.' })
  }
}
