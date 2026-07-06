import { getOpenAI } from '@/lib/openai/client'
import type { JobComplexity } from '@/types/company'

// Escalones de modelo por complejidad. Configurables por entorno para
// cambiar de modelo sin tocar código.
export const MODEL_TIERS = {
  fast: process.env.AI_MODEL_FAST ?? 'gpt-4o-mini',
  standard: process.env.AI_MODEL_STANDARD ?? 'gpt-4o',
  deep: process.env.AI_MODEL_DEEP ?? 'o1',
} as const

export type ModelTier = keyof typeof MODEL_TIERS

const COMPLEXITY_TIER: Record<JobComplexity, ModelTier> = {
  simple: 'fast',
  standard: 'standard',
  complex: 'deep',
}

// Resuelve el modelo a usar: la política del agente manda ('auto' delega
// en la complejidad de la tarea; cualquier otro valor es un modelo fijo).
export function resolveModel(modelPolicy: string, complexity: JobComplexity): string {
  if (modelPolicy && modelPolicy !== 'auto') return modelPolicy
  return MODEL_TIERS[COMPLEXITY_TIER[complexity]]
}

// Los modelos de razonamiento (o1, o3...) no aceptan temperature ni rol system
function isReasoningModel(model: string): boolean {
  return /^o\d/.test(model)
}

export interface ModelCallResult {
  content: string
  tokens: number
  model: string
}

export async function callModel(opts: {
  model: string
  system: string
  user: string
  json?: boolean
  maxTokens?: number
  temperature?: number
}): Promise<ModelCallResult> {
  const ai = getOpenAI()
  const { model, system, user, json, maxTokens = 3000, temperature = 0.7 } = opts

  const reasoning = isReasoningModel(model)
  const messages = reasoning
    ? [{ role: 'user' as const, content: `${system}\n\n---\n\n${user}` }]
    : [
        { role: 'system' as const, content: system },
        { role: 'user' as const, content: user },
      ]

  const response = await ai.chat.completions.create({
    model,
    messages,
    ...(reasoning
      ? { max_completion_tokens: Math.max(maxTokens, 4000) }
      : { temperature, max_tokens: maxTokens }),
    ...(json && !reasoning ? { response_format: { type: 'json_object' as const } } : {}),
  })

  return {
    content: response.choices[0]?.message?.content ?? '',
    tokens: response.usage?.total_tokens ?? 0,
    model,
  }
}

// Extrae JSON aunque el modelo lo envuelva en texto o fences
export function parseJSON<T>(raw: string): T {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  try {
    return JSON.parse(cleaned) as T
  } catch {
    const start = cleaned.search(/[{[]/)
    if (start === -1) throw new Error(`Respuesta sin JSON: ${raw.slice(0, 200)}`)
    const open = cleaned[start]
    const close = open === '{' ? '}' : ']'
    const end = cleaned.lastIndexOf(close)
    if (end <= start) throw new Error(`JSON incompleto: ${raw.slice(0, 200)}`)
    return JSON.parse(cleaned.slice(start, end + 1)) as T
  }
}
