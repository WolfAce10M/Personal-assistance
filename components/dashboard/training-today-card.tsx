'use client'

import { useEffect, useState } from 'react'
import { Dumbbell, CheckCircle2, Play } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TrainingSession } from '@/types'
import { formatDuration } from '@/lib/utils'

export function TrainingTodayCard() {
  const [session, setSession] = useState<TrainingSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/training/today')
      .then((r) => r.json())
      .then((d) => setSession(d.session ?? null))
      .catch(() => setSession(null))
      .finally(() => setLoading(false))
  }, [])

  const markCompleted = async () => {
    if (!session) return
    await fetch(`/api/training/${session.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed', completed_at: new Date().toISOString() }),
    })
    setSession({ ...session, status: 'completed' })
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-4 w-4 text-green-400" />
          <CardTitle>Entrenamiento de hoy</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-20 rounded-lg bg-zinc-800 animate-pulse" />
        ) : !session ? (
          <div className="text-center py-4">
            <p className="text-sm text-zinc-500">Sin sesión programada hoy</p>
            <a href="/training" className="text-xs text-indigo-400 hover:underline mt-1 block">
              Ver plan de entrenamiento →
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-100">{session.name}</p>
                {session.duration_minutes && (
                  <p className="text-xs text-zinc-500 mt-0.5">{formatDuration(session.duration_minutes)}</p>
                )}
              </div>
              {session.status === 'completed' ? (
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Completado
                </Badge>
              ) : (
                <Button size="sm" onClick={markCompleted} className="gap-1">
                  <Play className="h-3 w-3" /> Iniciar
                </Button>
              )}
            </div>
            {session.exercises.length > 0 && (
              <ul className="space-y-1">
                {session.exercises.slice(0, 4).map((ex, i) => (
                  <li key={i} className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300">{ex.name}</span>
                    <span className="text-zinc-500">
                      {ex.sets && ex.reps ? `${ex.sets}x${ex.reps}` : ex.duration_minutes ? `${ex.duration_minutes}min` : ''}
                      {ex.weight ? ` · ${ex.weight}` : ''}
                    </span>
                  </li>
                ))}
                {session.exercises.length > 4 && (
                  <li className="text-xs text-zinc-600">+{session.exercises.length - 4} ejercicios más</li>
                )}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
