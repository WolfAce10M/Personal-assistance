'use client'

import { useState } from 'react'
import { Loader2, UserPlus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SPECIALIST_TEMPLATES } from '@/lib/agents/roster'
import { agentIcon, agentColors } from '@/components/company/agent-visuals'
import type { Agent } from '@/types/company'

interface HireAgentDialogProps {
  agents: Agent[]
  onHire: (specialty: string) => Promise<unknown>
}

export function HireAgentDialog({ agents, onHire }: HireAgentDialogProps) {
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState('')
  const [hiring, setHiring] = useState<string | null>(null)

  const hired = new Set(agents.map(a => a.specialty))
  const available = SPECIALIST_TEMPLATES.filter(t => !hired.has(t.specialty))

  const hire = async (specialty: string) => {
    if (!specialty.trim() || hiring) return
    setHiring(specialty)
    try {
      await onHire(specialty)
      setCustom('')
      setOpen(false)
    } finally {
      setHiring(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="mr-1.5 h-3.5 w-3.5" />
          Contratar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Contratar especialista</DialogTitle>
          <DialogDescription>
            Añade un experto al equipo. Jarvis también contrata automáticamente lo que necesite.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[45vh] grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
          {available.map(t => {
            const Icon = agentIcon(t.icon)
            const colors = agentColors(t.color)
            return (
              <button
                key={t.specialty}
                onClick={() => hire(t.specialty)}
                disabled={Boolean(hiring)}
                className="flex items-center gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900 p-2.5 text-left transition-colors hover:border-indigo-500/40 disabled:opacity-50"
              >
                <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-md', colors.bg)}>
                  {hiring === t.specialty ? (
                    <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                  ) : (
                    <Icon className={cn('h-4 w-4', colors.text)} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-zinc-200">{t.name}</p>
                  <p className="truncate text-[10px] text-zinc-500">{t.description}</p>
                </div>
              </button>
            )
          })}
          {available.length === 0 && (
            <p className="col-span-full py-4 text-center text-xs text-zinc-500">
              Ya tienes contratados a todos los especialistas de plantilla.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-zinc-800 pt-3">
          <input
            value={custom}
            onChange={e => setCustom(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                hire(custom)
              }
            }}
            placeholder="O crea uno a medida: p. ej. «seo», «recursos humanos»…"
            className="flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <Button size="sm" onClick={() => hire(custom)} disabled={!custom.trim() || Boolean(hiring)}>
            Crear
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
