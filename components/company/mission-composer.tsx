'use client'

import { useState } from 'react'
import { Loader2, Rocket, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Mission } from '@/types/company'

const SUGGESTIONS = [
  'Diseña un plan para conseguir los primeros 10 clientes',
  'Analiza el mercado y define nuestra oferta',
  'Crea una campaña de lanzamiento completa',
  'Monta el plan de contenidos del próximo mes',
]

interface MissionComposerProps {
  activeMission: Mission | null
  onLaunch: (objective: string) => Promise<unknown>
  onCancel: (missionId: string) => Promise<unknown>
  disabled?: boolean
}

export function MissionComposer({ activeMission, onLaunch, onCancel, disabled }: MissionComposerProps) {
  const [objective, setObjective] = useState('')
  const [launching, setLaunching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const launch = async (text?: string) => {
    const value = (text ?? objective).trim()
    if (!value || launching || activeMission) return
    setLaunching(true)
    setError(null)
    try {
      await onLaunch(value)
      setObjective('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al lanzar la misión')
    } finally {
      setLaunching(false)
    }
  }

  if (activeMission) {
    return (
      <div className="rounded-xl border border-indigo-500/30 bg-indigo-600/10 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Misión en curso
            </p>
            <p className="mt-1 text-sm text-zinc-200">{activeMission.objective}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCancel(activeMission.id)}
            className="shrink-0 border-red-500/40 text-red-400 hover:bg-red-600/10 hover:text-red-300"
          >
            <Square className="mr-1.5 h-3 w-3" />
            Cancelar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center gap-2">
        <input
          value={objective}
          onChange={e => setObjective(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              launch()
            }
          }}
          placeholder="Dale un objetivo a Jarvis y el equipo se pone a trabajar…"
          disabled={launching || disabled}
          className="flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
        />
        <Button onClick={() => launch()} disabled={launching || disabled || !objective.trim()}>
          {launching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Rocket className="mr-1.5 h-4 w-4" />
              Ejecutar
            </>
          )}
        </Button>
      </div>

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            onClick={() => launch(s)}
            disabled={launching || disabled}
            className="rounded-full border border-zinc-700 bg-zinc-800/50 px-3 py-1 text-xs text-zinc-400 transition-colors hover:border-indigo-500/50 hover:text-zinc-200 disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
