'use client'

import { motion } from 'framer-motion'
import { Crown, ShieldCheck, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { AgentGlyph, agentColors, AGENT_STATUS_META } from '@/components/company/agent-visuals'
import type { Agent, AgentJob } from '@/types/company'

interface AgentCardProps {
  agent: Agent
  currentJob?: AgentJob
  onFire?: (agent: Agent) => void
}

export function AgentCard({ agent, currentJob, onFire }: AgentCardProps) {
  const colors = agentColors(agent.color)
  const status = AGENT_STATUS_META[agent.status] ?? AGENT_STATUS_META.idle
  const busy = agent.status !== 'idle' && agent.status !== 'error'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'group relative rounded-xl border bg-zinc-900 p-4 transition-colors',
        busy ? `border-transparent ring-1 ${colors.ring}` : 'border-zinc-800'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', colors.bg)}>
          <AgentGlyph icon={agent.icon} className={cn('h-5 w-5', colors.text)} />
          <span
            className={cn(
              'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-zinc-900',
              status.dotClass,
              status.pulse && 'animate-pulse'
            )}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-zinc-100">{agent.name}</p>
            {agent.role === 'director' && <Crown className="h-3.5 w-3.5 shrink-0 text-amber-400" />}
            {agent.role === 'reviewer' && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" />}
          </div>
          <p className={cn('text-xs', busy ? colors.text : 'text-zinc-500')}>
            {status.label}
            {busy && <span className="inline-block animate-pulse">…</span>}
          </p>
        </div>

        {onFire && agent.role === 'specialist' && (
          <button
            onClick={() => onFire(agent)}
            className="rounded-md p-1 text-zinc-600 opacity-0 transition-opacity hover:bg-zinc-800 hover:text-red-400 group-hover:opacity-100"
            title="Despedir agente"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Tarea en curso */}
      {currentJob && busy && (
        <div className="mt-3 rounded-lg bg-zinc-800/60 px-2.5 py-1.5">
          <p className="truncate text-xs text-zinc-300">{currentJob.title}</p>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-zinc-700">
            <motion.div
              className={cn('h-full w-1/3 rounded-full', colors.dot)}
              animate={{ x: ['-100%', '300%'] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
            />
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <Badge variant="secondary" className="text-[10px]">
          {agent.model_policy === 'auto' ? 'modelo auto' : agent.model_policy}
        </Badge>
        <p className="text-[10px] text-zinc-500">
          {agent.jobs_completed} trabajos · {(agent.tokens_used / 1000).toFixed(1)}k tok
        </p>
      </div>
    </motion.div>
  )
}
