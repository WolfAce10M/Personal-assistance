import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/service'
import { callModel, parseJSON, resolveModel } from '@/lib/agents/models'
import {
  findTemplate,
  genericTemplate,
  DIRECTOR_TEMPLATE,
  REVIEWER_TEMPLATE,
  type AgentTemplate,
} from '@/lib/agents/roster'
import type {
  ActivityType,
  Agent,
  AgentJob,
  Company,
  JobComplexity,
  Mission,
} from '@/types/company'

const MAX_PARALLEL_JOBS = 3
const MAX_AUTO_CHAIN = 2

// ---------- utilidades ----------

function truncate(text: string, max = 600): string {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

async function log(
  sb: SupabaseClient,
  entry: {
    company_id: string
    mission_id?: string | null
    job_id?: string | null
    agent_id?: string | null
    type: ActivityType
    content: string
    meta?: Record<string, unknown>
  }
) {
  await sb.from('agent_activities').insert({ meta: {}, ...entry })
}

async function setAgentStatus(
  sb: SupabaseClient,
  agentId: string,
  status: Agent['status'],
  currentJobId: string | null = null
) {
  await sb.from('agents').update({ status, current_job_id: currentJobId }).eq('id', agentId)
}

async function addAgentUsage(sb: SupabaseClient, agent: Agent, tokens: number, jobDone: boolean) {
  await sb
    .from('agents')
    .update({
      tokens_used: (agent.tokens_used ?? 0) + tokens,
      jobs_completed: (agent.jobs_completed ?? 0) + (jobDone ? 1 : 0),
    })
    .eq('id', agent.id)
  agent.tokens_used = (agent.tokens_used ?? 0) + tokens
  if (jobDone) agent.jobs_completed = (agent.jobs_completed ?? 0) + 1
}

function templateToRow(companyId: string, t: AgentTemplate) {
  return {
    company_id: companyId,
    role: t.role,
    specialty: t.specialty,
    name: t.name,
    icon: t.icon,
    color: t.color,
    description: t.description,
    system_prompt: t.systemPrompt,
    sort_order: t.sortOrder,
  }
}

// Crea el equipo inicial de una empresa (director + auditor + especialistas de la plantilla)
export async function seedAgents(
  sb: SupabaseClient,
  companyId: string,
  specialties: string[]
): Promise<void> {
  const rows = [DIRECTOR_TEMPLATE, REVIEWER_TEMPLATE, ...specialties.map(s => findTemplate(s) ?? genericTemplate(s))]
    .map(t => templateToRow(companyId, t))
  const { error } = await sb.from('agents').upsert(rows, { onConflict: 'company_id,specialty' })
  if (error) throw new Error(`No se pudo crear el equipo: ${error.message}`)
}

async function ensureAgent(sb: SupabaseClient, companyId: string, specialty: string): Promise<Agent> {
  const { data: existing } = await sb
    .from('agents')
    .select('*')
    .eq('company_id', companyId)
    .eq('specialty', specialty)
    .maybeSingle()
  if (existing) return existing as Agent

  const t = findTemplate(specialty) ?? genericTemplate(specialty)
  const { data, error } = await sb
    .from('agents')
    .upsert(templateToRow(companyId, t), { onConflict: 'company_id,specialty' })
    .select()
    .single()
  if (error || !data) throw new Error(`No se pudo contratar al agente ${specialty}: ${error?.message}`)
  return data as Agent
}

function companyContext(company: Company, mission: Mission): string {
  return `Empresa: ${company.name}
${company.description ? `Descripción: ${company.description}` : ''}
${company.mission ? `Misión de la empresa: ${company.mission}` : ''}
Objetivo actual: ${mission.objective}`
}

// ---------- fases del pipeline ----------

interface PlannedJobRaw {
  especialidad: string
  titulo: string
  descripcion: string
  complejidad?: string
  fase?: number
  entregable?: string
}

async function planMission(
  sb: SupabaseClient,
  company: Company,
  mission: Mission,
  director: Agent
): Promise<{ summary: string; tokens: number; jobs: PlannedJobRaw[] }> {
  await setAgentStatus(sb, director.id, 'thinking')
  await log(sb, {
    company_id: company.id,
    mission_id: mission.id,
    agent_id: director.id,
    type: 'thought',
    content: `Analizando el objetivo: "${truncate(mission.objective, 200)}"`,
  })

  const { data: roster } = await sb
    .from('agents')
    .select('specialty, name, description')
    .eq('company_id', company.id)
    .eq('is_active', true)
    .eq('role', 'specialist')

  const rosterList = (roster ?? [])
    .map(a => `- ${a.specialty}: ${a.name} — ${a.description ?? ''}`)
    .join('\n')

  const prompt = `${companyContext(company, mission)}

Equipo disponible (especialidad: nombre — descripción):
${rosterList || '(sin especialistas aún; puedes proponer las especialidades que necesites)'}

Descompón el objetivo en 2 a 6 trabajos concretos y delegables. Puedes usar especialidades del equipo o proponer nuevas (se contratarán automáticamente). Usa fases: los trabajos de la fase 1 se ejecutan en paralelo primero; los de fases posteriores reciben los resultados anteriores como contexto.

Responde SOLO con JSON válido:
{
  "resumen": "plan en una frase",
  "trabajos": [
    {
      "especialidad": "clave-corta-sin-espacios",
      "titulo": "título corto",
      "descripcion": "instrucciones detalladas para el especialista",
      "complejidad": "simple" | "standard" | "complex",
      "fase": 1,
      "entregable": "qué debe entregar exactamente"
    }
  ]
}
Criterio de complejidad: "simple" = tarea mecánica o corta; "standard" = trabajo experto normal; "complex" = requiere razonamiento profundo o estrategia crítica.`

  const res = await callModel({
    model: resolveModel(director.model_policy, 'standard'),
    system: director.system_prompt,
    user: prompt,
    json: true,
    maxTokens: 2000,
    temperature: 0.4,
  })

  const parsed = parseJSON<{ resumen?: string; trabajos?: PlannedJobRaw[] }>(res.content)
  const jobs = (parsed.trabajos ?? []).filter(j => j.especialidad && j.titulo && j.descripcion).slice(0, 6)
  if (jobs.length === 0) throw new Error('El director no pudo generar un plan de trabajo.')

  return { summary: parsed.resumen ?? '', tokens: res.tokens, jobs }
}

async function reviewOutput(
  sb: SupabaseClient,
  company: Company,
  mission: Mission,
  job: AgentJob,
  reviewer: Agent,
  output: string
): Promise<{ approved: boolean; notes: string; corrections: string; tokens: number }> {
  await setAgentStatus(sb, reviewer.id, 'reviewing', job.id)
  await log(sb, {
    company_id: company.id,
    mission_id: mission.id,
    job_id: job.id,
    agent_id: reviewer.id,
    type: 'review',
    content: `Revisando el entregable de "${job.title}"…`,
  })

  const res = await callModel({
    model: resolveModel(reviewer.model_policy, 'simple'),
    system: reviewer.system_prompt,
    user: `${companyContext(company, mission)}

Trabajo encargado: ${job.title}
Instrucciones: ${job.description ?? ''}
Entregable esperado: ${job.deliverable ?? ''}

--- ENTREGABLE A REVISAR ---
${output}
--- FIN ---

Responde SOLO con JSON válido:
{ "aprobado": true | false, "nota": "veredicto en una frase", "correcciones": "si no está aprobado, qué corregir exactamente" }
Sé exigente pero práctico: rechaza solo si hay fallos relevantes que merezcan una revisión.`,
    json: true,
    maxTokens: 800,
    temperature: 0.2,
  })

  await setAgentStatus(sb, reviewer.id, 'idle')

  try {
    const parsed = parseJSON<{ aprobado?: boolean; nota?: string; correcciones?: string }>(res.content)
    return {
      approved: parsed.aprobado !== false,
      notes: parsed.nota ?? '',
      corrections: parsed.correcciones ?? '',
      tokens: res.tokens,
    }
  } catch {
    // Si el auditor no devuelve JSON válido, no bloqueamos el pipeline
    return { approved: true, notes: 'Revisión no concluyente; aprobado por defecto.', corrections: '', tokens: res.tokens }
  }
}

async function executeJob(
  sb: SupabaseClient,
  company: Company,
  mission: Mission,
  job: AgentJob,
  agent: Agent,
  reviewer: Agent,
  priorContext: string
): Promise<{ output: string; tokens: number }> {
  const complexity = (job.complexity ?? 'standard') as JobComplexity
  const model = resolveModel(agent.model_policy, complexity)
  let totalTokens = 0

  await sb
    .from('agent_jobs')
    .update({ status: 'running', model, started_at: new Date().toISOString(), attempts: 1 })
    .eq('id', job.id)
  await setAgentStatus(sb, agent.id, 'working', job.id)
  await log(sb, {
    company_id: company.id,
    mission_id: mission.id,
    job_id: job.id,
    agent_id: agent.id,
    type: 'work',
    content: `Trabajando en "${job.title}"`,
    meta: { model },
  })

  const basePrompt = `${companyContext(company, mission)}
${priorContext ? `\nResultados de fases anteriores (contexto):\n${priorContext}\n` : ''}
Tu encargo: ${job.title}
Instrucciones del director: ${job.description ?? ''}
Entregable esperado: ${job.deliverable ?? 'Informe completo y accionable'}

Produce el entregable completo en markdown.`

  const first = await callModel({
    model,
    system: agent.system_prompt,
    user: basePrompt,
    maxTokens: complexity === 'complex' ? 6000 : 3500,
  })
  totalTokens += first.tokens
  let output = first.content

  await sb.from('agent_jobs').update({ status: 'reviewing', output }).eq('id', job.id)
  await setAgentStatus(sb, agent.id, 'idle')
  await log(sb, {
    company_id: company.id,
    mission_id: mission.id,
    job_id: job.id,
    agent_id: agent.id,
    type: 'output',
    content: `Entregable listo (${output.length.toLocaleString('es-ES')} caracteres): ${truncate(output.replace(/\s+/g, ' '), 220)}`,
    meta: { model, tokens: first.tokens },
  })

  // Revisión de calidad
  const review = await reviewOutput(sb, company, mission, job, reviewer, output)
  totalTokens += review.tokens
  await addAgentUsage(sb, reviewer, review.tokens, false)

  let verdict: AgentJob['review_verdict'] = 'approved'
  let reviewNotes = review.notes

  if (!review.approved && review.corrections) {
    // Una ronda de corrección
    verdict = 'approved_with_notes'
    await sb.from('agent_jobs').update({ status: 'revision', review_notes: review.corrections }).eq('id', job.id)
    await setAgentStatus(sb, agent.id, 'working', job.id)
    await log(sb, {
      company_id: company.id,
      mission_id: mission.id,
      job_id: job.id,
      agent_id: reviewer.id,
      type: 'revision',
      content: `Rechazado. Correcciones pedidas: ${truncate(review.corrections, 200)}`,
    })

    const fixed = await callModel({
      model,
      system: agent.system_prompt,
      user: `${basePrompt}

--- TU PRIMERA VERSIÓN ---
${output}
--- FIN ---

El auditor de calidad ha pedido estas correcciones:
${review.corrections}

Entrega la versión final corregida completa en markdown.`,
      maxTokens: complexity === 'complex' ? 6000 : 3500,
    })
    totalTokens += fixed.tokens
    if (fixed.content.trim()) output = fixed.content
    reviewNotes = `Corregido tras revisión: ${review.corrections}`
    await sb.from('agent_jobs').update({ attempts: 2 }).eq('id', job.id)
    await setAgentStatus(sb, agent.id, 'idle')
  }

  await sb
    .from('agent_jobs')
    .update({
      status: 'completed',
      output,
      review_verdict: verdict,
      review_notes: reviewNotes,
      tokens_used: totalTokens,
      completed_at: new Date().toISOString(),
    })
    .eq('id', job.id)
  await addAgentUsage(sb, agent, totalTokens - review.tokens, true)
  await log(sb, {
    company_id: company.id,
    mission_id: mission.id,
    job_id: job.id,
    agent_id: reviewer.id,
    type: 'review',
    content: verdict === 'approved'
      ? `Aprobado: "${job.title}". ${truncate(reviewNotes, 160)}`
      : `Aprobado tras corrección: "${job.title}"`,
  })

  return { output, tokens: totalTokens }
}

// Pool sencillo de concurrencia
async function runPool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  const queue = [...items]
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift()
      if (item) await fn(item)
    }
  })
  await Promise.all(workers)
}

// ---------- orquestador principal ----------

export async function runMission(missionId: string): Promise<void> {
  const sb = createServiceClient()

  const { data: mission } = await sb.from('missions').select('*').eq('id', missionId).single()
  if (!mission) return
  const { data: company } = await sb.from('companies').select('*').eq('id', mission.company_id).single()
  if (!company) return

  const director = await ensureAgent(sb, company.id, 'director')
  const reviewer = await ensureAgent(sb, company.id, 'reviewer')
  let missionTokens = 0

  try {
    await sb.from('missions').update({ status: 'planning', started_at: new Date().toISOString() }).eq('id', missionId)
    await log(sb, {
      company_id: company.id,
      mission_id: missionId,
      agent_id: director.id,
      type: 'system',
      content: mission.auto_generated
        ? `Misión automática iniciada: "${truncate(mission.objective, 180)}"`
        : `Nueva misión recibida: "${truncate(mission.objective, 180)}"`,
    })

    // 1. El director planifica
    const plan = await planMission(sb, company, mission, director)
    missionTokens += plan.tokens
    await addAgentUsage(sb, director, plan.tokens, false)

    const normalizedJobs = plan.jobs.map(j => ({
      specialty: j.especialidad.toLowerCase().trim().replace(/\s+/g, '-'),
      title: j.titulo,
      description: j.descripcion,
      complexity: (['simple', 'standard', 'complex'].includes(j.complejidad ?? '') ? j.complejidad : 'standard') as JobComplexity,
      phase: Math.min(Math.max(Math.round(j.fase ?? 1), 1), 3),
      deliverable: j.entregable ?? '',
    }))

    await sb
      .from('missions')
      .update({ status: 'running', plan: { summary: plan.summary, jobs: normalizedJobs } })
      .eq('id', missionId)
    await setAgentStatus(sb, director.id, 'idle')
    await log(sb, {
      company_id: company.id,
      mission_id: missionId,
      agent_id: director.id,
      type: 'thought',
      content: `Plan listo: ${plan.summary || `${normalizedJobs.length} trabajos`}`,
    })

    // 2. Contratar agentes y crear los trabajos
    const jobRows: AgentJob[] = []
    for (const pj of normalizedJobs) {
      const agent = await ensureAgent(sb, company.id, pj.specialty)
      const { data: jobRow, error } = await sb
        .from('agent_jobs')
        .insert({
          mission_id: missionId,
          company_id: company.id,
          agent_id: agent.id,
          phase: pj.phase,
          title: pj.title,
          description: pj.description,
          deliverable: pj.deliverable,
          complexity: pj.complexity,
        })
        .select()
        .single()
      if (error || !jobRow) throw new Error(`No se pudo crear el trabajo "${pj.title}": ${error?.message}`)
      jobRows.push(jobRow as AgentJob)
      await log(sb, {
        company_id: company.id,
        mission_id: missionId,
        job_id: jobRow.id,
        agent_id: director.id,
        type: 'delegation',
        content: `Delegado a ${agent.name} (fase ${pj.phase}): "${pj.title}"`,
        meta: { specialty: pj.specialty, complexity: pj.complexity },
      })
    }

    // 3. Ejecutar por fases; dentro de cada fase, en paralelo
    const agentCache = new Map<string, Agent>()
    const outputs: Array<{ job: AgentJob; output: string }> = []
    const phases = [...new Set(jobRows.map(j => j.phase))].sort((a, b) => a - b)

    for (const phase of phases) {
      await assertNotCancelled(sb, missionId)
      const phaseJobs = jobRows.filter(j => j.phase === phase)
      const priorContext = outputs
        .map(o => `### ${o.job.title}\n${truncate(o.output, 1500)}`)
        .join('\n\n')

      await runPool(phaseJobs, MAX_PARALLEL_JOBS, async job => {
        let agent = agentCache.get(job.agent_id!)
        if (!agent) {
          const { data } = await sb.from('agents').select('*').eq('id', job.agent_id!).single()
          agent = data as Agent
          agentCache.set(agent.id, agent)
        }
        try {
          const result = await executeJob(sb, company, mission, job, agent, reviewer, priorContext)
          missionTokens += result.tokens
          outputs.push({ job, output: result.output })
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          await sb.from('agent_jobs').update({ status: 'failed', review_notes: msg }).eq('id', job.id)
          await setAgentStatus(sb, agent.id, 'error')
          await log(sb, {
            company_id: company.id,
            mission_id: missionId,
            job_id: job.id,
            agent_id: agent.id,
            type: 'error',
            content: `Fallo en "${job.title}": ${truncate(msg, 200)}`,
          })
        }
      })
    }

    if (outputs.length === 0) throw new Error('Ningún trabajo se completó con éxito.')
    await assertNotCancelled(sb, missionId)

    // 4. El director sintetiza el entregable final
    await setAgentStatus(sb, director.id, 'thinking')
    await log(sb, {
      company_id: company.id,
      mission_id: missionId,
      agent_id: director.id,
      type: 'thought',
      content: 'Consolidando los entregables del equipo en el informe final…',
    })

    const synthesis = await callModel({
      model: resolveModel(director.model_policy, outputs.length > 3 ? 'complex' : 'standard'),
      system: director.system_prompt,
      user: `${companyContext(company, mission)}

El equipo ha completado estos trabajos:

${outputs.map(o => `## ${o.job.title}\n${o.output}`).join('\n\n---\n\n')}

Redacta el ENTREGABLE FINAL para el dueño en markdown: síntesis ejecutiva, resultados clave por área, plan de acción priorizado (qué hacer esta semana) y riesgos. Directo, accionable, sin relleno.`,
      maxTokens: 4000,
      temperature: 0.4,
    })
    missionTokens += synthesis.tokens
    await addAgentUsage(sb, director, synthesis.tokens, true)

    await sb
      .from('missions')
      .update({
        status: 'completed',
        result: synthesis.content,
        summary: plan.summary,
        total_tokens: missionTokens,
        completed_at: new Date().toISOString(),
      })
      .eq('id', missionId)
    await setAgentStatus(sb, director.id, 'idle')
    await log(sb, {
      company_id: company.id,
      mission_id: missionId,
      agent_id: director.id,
      type: 'result',
      content: `Misión completada. ${outputs.length} entregables aprobados, ${missionTokens.toLocaleString('es-ES')} tokens.`,
      meta: { tokens: missionTokens },
    })

    // 5. Modo automático: el director propone y lanza la siguiente misión
    if (company.auto_mode && (mission.auto_chain ?? 0) < MAX_AUTO_CHAIN) {
      await continueAutonomously(sb, company, mission, director)
    }
  } catch (err) {
    if (err instanceof MissionCancelledError) {
      // La ruta DELETE ya dejó la misión y los agentes en su estado final
      return
    }
    const msg = err instanceof Error ? err.message : String(err)
    await sb
      .from('missions')
      .update({ status: 'failed', error: msg, total_tokens: missionTokens, completed_at: new Date().toISOString() })
      .eq('id', missionId)
    await sb.from('agents').update({ status: 'idle', current_job_id: null }).eq('company_id', company.id)
    await log(sb, {
      company_id: company.id,
      mission_id: missionId,
      agent_id: director.id,
      type: 'error',
      content: `Misión fallida: ${truncate(msg, 250)}`,
    })
  }
}

class MissionCancelledError extends Error {
  constructor() {
    super('Misión cancelada por el usuario')
    this.name = 'MissionCancelledError'
  }
}

async function assertNotCancelled(sb: SupabaseClient, missionId: string) {
  const { data } = await sb.from('missions').select('status').eq('id', missionId).single()
  if (data?.status === 'cancelled') throw new MissionCancelledError()
}

async function continueAutonomously(
  sb: SupabaseClient,
  company: Company,
  finished: Mission,
  director: Agent
): Promise<void> {
  try {
    const res = await callModel({
      model: resolveModel(director.model_policy, 'simple'),
      system: director.system_prompt,
      user: `La empresa "${company.name}" (misión: ${company.mission ?? 'sin definir'}) acaba de completar el objetivo: "${finished.objective}".

Estás en modo automático. Propón el SIGUIENTE objetivo más valioso: el paso lógico que más acerque a la empresa a generar resultados reales.

Responde SOLO con JSON válido: { "objetivo": "objetivo concreto y accionable", "razon": "por qué es el siguiente paso" }`,
      json: true,
      maxTokens: 500,
      temperature: 0.5,
    })
    const next = parseJSON<{ objetivo?: string; razon?: string }>(res.content)
    if (!next.objetivo) return

    const { data: newMission } = await sb
      .from('missions')
      .insert({
        company_id: company.id,
        objective: next.objetivo,
        auto_generated: true,
        auto_chain: (finished.auto_chain ?? 0) + 1,
      })
      .select()
      .single()
    if (!newMission) return

    await log(sb, {
      company_id: company.id,
      mission_id: newMission.id,
      agent_id: director.id,
      type: 'system',
      content: `Modo automático: siguiente objetivo propuesto — "${truncate(next.objetivo, 160)}". ${truncate(next.razon ?? '', 160)}`,
    })
    await runMission(newMission.id)
  } catch {
    // El modo auto nunca debe tumbar la misión ya completada
  }
}
