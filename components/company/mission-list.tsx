'use client'

import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronRight, Loader2, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { AgentJob, Mission, MissionStatus } from '@/types/company'

const STATUS_META: Record<MissionStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' }> = {
  planning: { label: 'Planificando', variant: 'warning' },
  running: { label: 'En curso', variant: 'default' },
  completed: { label: 'Completada', variant: 'success' },
  failed: { label: 'Fallida', variant: 'destructive' },
  cancelled: { label: 'Cancelada', variant: 'secondary' },
}

interface MissionListProps {
  missions: Mission[]
  activeJobs: AgentJob[]
  onSelect: (mission: Mission) => void
}

export function MissionList({ missions, activeJobs, onSelect }: MissionListProps) {
  if (missions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center">
        <p className="text-sm text-zinc-500">Aún no hay misiones. Dale el primer objetivo a tu equipo.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {missions.map(mission => {
        const meta = STATUS_META[mission.status]
        const isActive = mission.status === 'planning' || mission.status === 'running'
        const jobs = isActive ? activeJobs : []
        const done = jobs.filter(j => j.status === 'completed').length
        const planned = mission.plan?.jobs?.length ?? jobs.length

        return (
          <button
            key={mission.id}
            onClick={() => onSelect(mission)}
            className="group flex w-full items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 text-left transition-colors hover:border-zinc-700"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={meta.variant} className="text-[10px]">
                  {isActive && <Loader2 className="mr-1 h-2.5 w-2.5 animate-spin" />}
                  {meta.label}
                </Badge>
                {mission.auto_generated && (
                  <Badge variant="secondary" className="text-[10px]">
                    <Sparkles className="mr-1 h-2.5 w-2.5" />
                    auto
                  </Badge>
                )}
                <span className="text-[10px] text-zinc-600">
                  {format(parseISO(mission.created_at), "d MMM · HH:mm", { locale: es })}
                </span>
                {mission.total_tokens > 0 && (
                  <span className="text-[10px] text-zinc-600">
                    {(mission.total_tokens / 1000).toFixed(1)}k tokens
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-sm text-zinc-200">{mission.objective}</p>

              {isActive && planned > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all duration-700"
                      style={{ width: `${Math.round((done / Math.max(planned, 1)) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] tabular-nums text-zinc-500">
                    {done}/{planned}
                  </span>
                </div>
              )}
            </div>
            <ChevronRight
              className={cn('h-4 w-4 shrink-0 text-zinc-600 transition-transform group-hover:translate-x-0.5')}
            />
          </button>
        )
      })}
    </div>
  )
}
