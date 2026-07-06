'use client'

import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import { agentIcon, agentColors } from '@/components/company/agent-visuals'
import type { AgentActivity, ActivityType } from '@/types/company'

const TYPE_META: Record<ActivityType, { label: string; className: string }> = {
  system: { label: 'Sistema', className: 'bg-zinc-700/50 text-zinc-300' },
  thought: { label: 'Pensando', className: 'bg-violet-600/20 text-violet-400' },
  delegation: { label: 'Delegación', className: 'bg-indigo-600/20 text-indigo-400' },
  work: { label: 'Trabajando', className: 'bg-blue-600/20 text-blue-400' },
  output: { label: 'Entregable', className: 'bg-cyan-600/20 text-cyan-400' },
  review: { label: 'Revisión', className: 'bg-amber-600/20 text-amber-400' },
  revision: { label: 'Corrección', className: 'bg-orange-600/20 text-orange-400' },
  result: { label: 'Resultado', className: 'bg-emerald-600/20 text-emerald-400' },
  error: { label: 'Error', className: 'bg-red-600/20 text-red-400' },
}

export function ActivityFeed({ activities, live }: { activities: AgentActivity[]; live: boolean }) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const countRef = useRef(0)

  useEffect(() => {
    if (activities.length > countRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    countRef.current = activities.length
  }, [activities.length])

  return (
    <div className="flex h-full flex-col rounded-xl border border-zinc-800 bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-zinc-100">Actividad en vivo</h3>
        </div>
        {live && (
          <span className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            EN DIRECTO
          </span>
        )}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {activities.length === 0 && (
          <p className="py-8 text-center text-xs text-zinc-500">
            Sin actividad todavía. Lanza una misión y verás a tu equipo trabajar aquí.
          </p>
        )}

        <AnimatePresence initial={false}>
          {activities.map(a => {
            const meta = TYPE_META[a.type] ?? TYPE_META.system
            const Icon = a.agent ? agentIcon(a.agent.icon) : Activity
            const colors = agentColors(a.agent?.color ?? 'zinc')
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-2.5 rounded-lg bg-zinc-800/40 p-2.5"
              >
                <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md', colors.bg)}>
                  <Icon className={cn('h-3.5 w-3.5', colors.text)} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-xs font-medium text-zinc-200">
                      {a.agent?.name ?? 'Sistema'}
                    </span>
                    <span className={cn('rounded px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide', meta.className)}>
                      {meta.label}
                    </span>
                    {typeof a.meta?.model === 'string' && (
                      <span className="rounded bg-zinc-700/50 px-1.5 py-px text-[9px] text-zinc-400">
                        {a.meta.model}
                      </span>
                    )}
                    <span className="ml-auto text-[10px] text-zinc-600">
                      {format(parseISO(a.created_at), 'HH:mm:ss')}
                    </span>
                  </div>
                  <p className="mt-0.5 break-words text-xs leading-relaxed text-zinc-400">{a.content}</p>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
