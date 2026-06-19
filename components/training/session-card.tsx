'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Clock, Dumbbell, CheckCircle, SkipForward, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn, formatDuration } from '@/lib/utils'
import type { TrainingSession } from '@/types'

interface SessionCardProps {
  session: TrainingSession
  onUpdate: (session: TrainingSession) => void
  isToday?: boolean
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'secondary' | 'warning' | 'destructive' | 'outline' }> = {
  scheduled: { label: 'Programado', variant: 'secondary' },
  completed: { label: 'Completado', variant: 'success' },
  skipped: { label: 'Omitido', variant: 'outline' },
  modified: { label: 'Modificado', variant: 'warning' },
}

export function SessionCard({ session, onUpdate, isToday = false }: SessionCardProps) {
  const [expanded, setExpanded] = useState(isToday)
  const [loading, setLoading] = useState<'complete' | 'skip' | null>(null)

  const config = statusConfig[session.status] ?? statusConfig.scheduled

  const handleAction = async (action: 'complete' | 'skip') => {
    setLoading(action)
    try {
      const status = action === 'complete' ? 'completed' : 'skipped'
      const res = await fetch(`/api/training/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          completed_at: action === 'complete' ? new Date().toISOString() : undefined,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        onUpdate(data.session)
      }
    } finally {
      setLoading(null)
    }
  }

  return (
    <Card className={cn(isToday && 'border-indigo-500/30 bg-indigo-600/5')}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {isToday && (
                <Badge className="text-xs bg-indigo-600/20 text-indigo-400 border-indigo-500/30">
                  Hoy
                </Badge>
              )}
              <Badge variant={config.variant}>{config.label}</Badge>
              {session.type && (
                <span className="text-xs text-zinc-500">{session.type}</span>
              )}
            </div>
            <p className="text-sm font-semibold text-zinc-100">{session.name}</p>
            <div className="flex items-center gap-3 mt-1">
              {session.scheduled_date && (
                <span className="text-xs text-zinc-500">
                  {format(parseISO(session.scheduled_date), "EEEE d 'de' MMM", { locale: es })}
                </span>
              )}
              {session.duration_minutes && (
                <span className="flex items-center gap-1 text-xs text-zinc-500">
                  <Clock className="h-3 w-3" />
                  {formatDuration(session.duration_minutes)}
                </span>
              )}
              {session.exercises.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-zinc-500">
                  <Dumbbell className="h-3 w-3" />
                  {session.exercises.length} ejercicios
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => setExpanded(e => !e)}
            className="flex-shrink-0 text-zinc-500 hover:text-zinc-300 transition-colors mt-1"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {/* Exercises */}
        {expanded && session.exercises.length > 0 && (
          <div className="mt-3 space-y-2 border-t border-zinc-800 pt-3">
            {session.exercises.map((ex, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-medium">{ex.name}</span>
                <span className="text-zinc-500">
                  {ex.sets && ex.reps && `${ex.sets}x${ex.reps}`}
                  {ex.weight && ` · ${ex.weight}`}
                  {ex.duration_minutes && ` · ${ex.duration_minutes}min`}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Notes */}
        {expanded && session.notes && (
          <p className="mt-2 text-xs text-zinc-500 border-t border-zinc-800 pt-2">{session.notes}</p>
        )}

        {/* Actions for scheduled sessions */}
        {session.status === 'scheduled' && (
          <div className="mt-3 flex gap-2 border-t border-zinc-800 pt-3">
            <Button
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={() => handleAction('complete')}
              disabled={loading !== null}
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1" />
              {loading === 'complete' ? 'Guardando...' : 'Completar sesión'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => handleAction('skip')}
              disabled={loading !== null}
            >
              <SkipForward className="h-3.5 w-3.5 mr-1" />
              {loading === 'skip' ? '...' : 'Omitir'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
