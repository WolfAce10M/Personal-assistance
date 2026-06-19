import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai, SYSTEM_PROMPT } from '@/lib/openai/client'
import { format, startOfDay, endOfDay } from 'date-fns'
import { es } from 'date-fns/locale'

export async function POST() {
  const supabase = await createClient()

  const today = format(new Date(), 'yyyy-MM-dd')
  const startOfToday = startOfDay(new Date()).toISOString()
  const endOfToday = endOfDay(new Date()).toISOString()

  const [
    { data: tasks },
    { data: goals },
    { data: events },
    { data: training },
    { data: personalDev },
  ] = await Promise.all([
    supabase.from('tasks').select('*').in('status', ['pending', 'in_progress']).order('priority').limit(20),
    supabase.from('goals').select('*').eq('status', 'active').limit(10),
    supabase.from('calendar_events').select('*').gte('start_time', startOfToday).lte('start_time', endOfToday).order('start_time'),
    supabase.from('training_sessions').select('*').eq('scheduled_date', today).maybeSingle(),
    supabase.from('personal_dev_entries').select('*').eq('status', 'active').limit(5),
  ])

  const prompt = `Organiza el día de hoy para el usuario.

Fecha: ${format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
Hora actual: ${format(new Date(), 'HH:mm')}

EVENTOS DE HOY (NO se pueden mover los protegidos):
${JSON.stringify(events ?? [], null, 2)}

TAREAS PENDIENTES:
${JSON.stringify(tasks ?? [], null, 2)}

OBJETIVOS ACTIVOS:
${JSON.stringify(goals ?? [], null, 2)}

ENTRENAMIENTO HOY:
${JSON.stringify(training ?? 'No programado', null, 2)}

DESARROLLO PERSONAL ACTIVO:
${JSON.stringify(personalDev ?? [], null, 2)}

Genera un plan diario detallado con:
1. Bloques de tiempo específicos (hora inicio - hora fin)
2. Las 3 tareas más importantes del día
3. Cuándo entrenar (si hay sesión)
4. Cuándo dedicar tiempo al desarrollo personal
5. Bloques de trabajo profundo
6. Descansos
7. Tiempo libre estimado

Responde en español, de forma clara y accionable. Usa formato con horas específicas.`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    temperature: 0.6,
    max_tokens: 1500,
  })

  const plan = completion.choices[0]?.message?.content ?? 'No se pudo generar el plan.'

  // Save the plan
  await supabase.from('daily_plans').upsert(
    {
      date: today,
      plan: { text: plan },
      ai_generated: true,
    },
    { onConflict: 'date' }
  )

  // Log to chat
  await supabase.from('chat_messages').insert({
    role: 'assistant',
    content: `📅 Plan del día generado:\n\n${plan}`,
    channel: 'web',
    metadata: { type: 'daily_plan' },
  })

  return NextResponse.json({ plan })
}
