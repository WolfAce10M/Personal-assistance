import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai, SYSTEM_PROMPT } from '@/lib/openai/client'
import { addDays, format } from 'date-fns'

export async function POST(req: NextRequest) {
  const { goal, days_per_week = 4, duration_weeks = 8 } = await req.json()

  const prompt = `Crea un plan de entrenamiento personalizado para el usuario.

Objetivo: ${goal}
Días por semana: ${days_per_week}
Duración: ${duration_weeks} semanas

Genera:
1. Un plan estructurado en formato JSON con las sesiones de la primera semana
2. Cada sesión debe tener: nombre, tipo, duración en minutos, ejercicios (con nombre, series, repeticiones/tiempo, peso sugerido)
3. Días de descanso bien distribuidos
4. Progresión lógica

Responde SOLO con JSON válido en este formato:
{
  "plan_name": "string",
  "goal": "string",
  "sessions": [
    {
      "name": "string",
      "type": "strength|cardio|hiit|mobility|rest",
      "day_of_week": 1-7,
      "duration_minutes": number,
      "exercises": [
        {
          "name": "string",
          "sets": number,
          "reps": "string",
          "weight": "string",
          "notes": "string"
        }
      ]
    }
  ]
}`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    temperature: 0.5,
    max_tokens: 2000,
    response_format: { type: 'json_object' },
  })

  const planData = JSON.parse(completion.choices[0]?.message?.content ?? '{}')

  const supabase = await createClient()

  // Create plan
  const { data: plan } = await supabase
    .from('training_plans')
    .insert({
      name: planData.plan_name ?? 'Mi Plan',
      goal: planData.goal ?? goal,
      status: 'active',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: format(addDays(new Date(), duration_weeks * 7), 'yyyy-MM-dd'),
      schedule: planData,
    })
    .select()
    .single()

  if (!plan) return NextResponse.json({ error: 'Error creating plan' }, { status: 500 })

  // Create sessions for first week
  const sessions = (planData.sessions ?? []).map((s: {
    name: string; type: string; day_of_week: number;
    duration_minutes: number; exercises: unknown[]
  }) => ({
    plan_id: plan.id,
    name: s.name,
    type: s.type,
    scheduled_date: format(addDays(new Date(), s.day_of_week - 1), 'yyyy-MM-dd'),
    duration_minutes: s.duration_minutes,
    exercises: s.exercises ?? [],
    status: 'scheduled',
  }))

  await supabase.from('training_sessions').insert(sessions)

  return NextResponse.json({ plan, sessions })
}
