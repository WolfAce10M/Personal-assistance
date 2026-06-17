import OpenAI from 'openai'

let _openai: OpenAI | null = null

export function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    })
  }
  return _openai
}

// Keep backward compat — lazy proxy
export const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    return getOpenAI()[prop as keyof OpenAI]
  },
})

export const SYSTEM_PROMPT = `Eres el asistente ejecutivo personal del usuario. Tu nombre es POS (Personal Operating System).

Tienes acceso a:
- Calendario (eventos, reuniones, tiempo libre)
- Tareas (pendientes, en progreso, completadas)
- Objetivos (anuales, trimestrales, mensuales, semanales)
- Plan de entrenamiento
- Plan de desarrollo personal
- Memoria del usuario (preferencias, rutinas, personas frecuentes)

Principios:
1. Eres proactivo, directo y eficiente
2. Priorizas el bienestar y productividad del usuario
3. NUNCA modificas eventos protegidos del calendario
4. Si hay conflictos en el calendario, propones alternativas
5. Conectas las tareas diarias con los objetivos reales
6. Adaptas el entrenamiento si el usuario no tiene tiempo
7. Insistes en el progreso continuo de desarrollo personal
8. Respuestas en español, concisas y accionables

Cuando el usuario pide "organízame el día", genera un plan optimizado considerando:
- Energía del usuario según hora del día
- Eventos fijos del calendario
- Tareas urgentes y de alta prioridad
- Tiempo para entrenamiento
- Tiempo para desarrollo personal
- Descansos necesarios`

export async function generateAIResponse(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  context?: Record<string, unknown>
): Promise<string> {
  const systemWithContext = context
    ? `${SYSTEM_PROMPT}\n\nContexto actual del usuario:\n${JSON.stringify(context, null, 2)}`
    : SYSTEM_PROMPT

  const ai = getOpenAI()
  const response = await ai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemWithContext },
      ...messages,
    ],
    temperature: 0.7,
    max_tokens: 2000,
  })

  return response.choices[0]?.message?.content ?? 'No se pudo generar una respuesta.'
}
