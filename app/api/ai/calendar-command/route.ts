import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai, SYSTEM_PROMPT } from '@/lib/openai/client'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export async function POST(req: NextRequest) {
  const { command } = await req.json()

  if (!command?.trim()) {
    return NextResponse.json({ error: 'Comando requerido' }, { status: 400 })
  }

  const supabase = await createClient()

  // Get current events (including protected ones)
  const { data: events } = await supabase
    .from('calendar_events')
    .select('*')
    .gte('start_time', new Date().toISOString())
    .order('start_time')
    .limit(20)

  const prompt = `El usuario quiere modificar su calendario con el siguiente comando en lenguaje natural:
"${command}"

Fecha y hora actual: ${format(new Date(), "EEEE, d 'de' MMMM yyyy HH:mm", { locale: es })}

Eventos actuales del calendario:
${JSON.stringify(events ?? [], null, 2)}

REGLAS CRÍTICAS:
- Los eventos con is_protected=true NO pueden modificarse ni eliminarse
- Si el comando intenta modificar un evento protegido, recházalo y explica por qué
- Usa búsqueda semántica para encontrar el evento correcto aunque el nombre no sea exacto

Analiza el comando y responde en JSON con este formato:
{
  "action": "create|move|delete|block|find_slot|info",
  "can_execute": boolean,
  "reason": "explicación de la acción o por qué no se puede",
  "requires_confirmation": boolean,
  "changes": {
    "event_id": "id si aplica",
    "new_title": "string",
    "new_start": "ISO datetime",
    "new_end": "ISO datetime",
    "new_location": "string"
  },
  "alternatives": ["alternativa 1", "alternativa 2"],
  "message_to_user": "mensaje amigable para el usuario"
}`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 800,
    response_format: { type: 'json_object' },
  })

  const result = JSON.parse(completion.choices[0]?.message?.content ?? '{}')

  return NextResponse.json(result)
}
