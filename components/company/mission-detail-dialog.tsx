'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, ChevronDown, Loader2, XCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { agentIcon, agentColors } from '@/components/company/agent-visuals'
import type { AgentJob, Mission } from '@/types/company'

interface MissionDetailDialogProps {
  missionId: string | null
  onClose: () => void
}

export function MissionDetailDialog({ missionId, onClose }: MissionDetailDialogProps) {
  const [mission, setMission] = useState<(Mission & { jobs: AgentJob[] }) | null>(null)
  const [openJob, setOpenJob] = useState<string | null>(null)

  useEffect(() => {
    if (!missionId) return
    let active = true
    fetch(`/api/company/missions/${missionId}`)
      .then(res => res.json())
      .then(data => {
        if (!active) return
        setMission(data.mission ?? null)
        setOpenJob(null)
      })
      .catch(() => active && setMission(null))
    return () => {
      active = false
    }
  }, [missionId])

  // Cargando mientras la misión mostrada no coincide con la pedida
  const loading = Boolean(missionId) && mission?.id !== missionId
  const current = mission?.id === missionId ? mission : null

  return (
    <Dialog open={Boolean(missionId)} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Misión</DialogTitle>
          <DialogDescription className="text-zinc-400">
            {current?.objective ?? 'Cargando…'}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
          </div>
        )}

        {current && (
          <ScrollArea className="max-h-[65vh] pr-3">
            <div className="space-y-4">
              {current.error && (
                <div className="rounded-lg border border-red-500/30 bg-red-600/10 p-3 text-xs text-red-300">
                  {current.error}
                </div>
              )}

              {/* Trabajos del equipo */}
              {current.jobs.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Trabajos del equipo
                  </h4>
                  <div className="space-y-1.5">
                    {current.jobs.map(job => {
                      const Icon = agentIcon(job.agent?.icon ?? 'bot')
                      const colors = agentColors(job.agent?.color ?? 'zinc')
                      const open = openJob === job.id
                      return (
                        <div key={job.id} className="rounded-lg border border-zinc-800 bg-zinc-900">
                          <button
                            onClick={() => setOpenJob(open ? null : job.id)}
                            className="flex w-full items-center gap-2.5 p-2.5 text-left"
                          >
                            <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md', colors.bg)}>
                              <Icon className={cn('h-3.5 w-3.5', colors.text)} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium text-zinc-200">{job.title}</p>
                              <p className="text-[10px] text-zinc-500">
                                {job.agent?.name ?? 'Agente'} · fase {job.phase}
                                {job.model && ` · ${job.model}`}
                              </p>
                            </div>
                            {job.status === 'completed' ? (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                            ) : job.status === 'failed' ? (
                              <XCircle className="h-4 w-4 shrink-0 text-red-400" />
                            ) : (
                              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-indigo-400" />
                            )}
                            <ChevronDown
                              className={cn('h-4 w-4 shrink-0 text-zinc-600 transition-transform', open && 'rotate-180')}
                            />
                          </button>
                          {open && (
                            <div className="border-t border-zinc-800 p-3">
                              {job.review_notes && (
                                <Badge variant="warning" className="mb-2 text-[10px]">
                                  Auditor: {job.review_notes.slice(0, 120)}
                                </Badge>
                              )}
                              <p className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-300">
                                {job.output ?? 'Sin entregable todavía.'}
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Entregable final */}
              {current.result && (
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-400">
                    Entregable final de Jarvis
                  </h4>
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-600/5 p-4">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
                      {current.result}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}
