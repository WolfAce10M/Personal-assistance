'use client'

import { useState } from 'react'
import { CheckCircle, StickyNote, Pencil, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { DevForm } from './dev-form'
import { cn } from '@/lib/utils'
import type { PersonalDevEntry, PersonalDevType } from '@/types'

interface DevEntryCardProps {
  entry: PersonalDevEntry
  onUpdate: (entry: PersonalDevEntry) => void
  onDelete: (id: string) => void
}

const typeConfig: Record<PersonalDevType, { emoji: string; label: string }> = {
  book: { emoji: '📖', label: 'Libro' },
  course: { emoji: '🎓', label: 'Curso' },
  reflection: { emoji: '💭', label: 'Reflexión' },
  learning: { emoji: '🧠', label: 'Aprendizaje' },
  other: { emoji: '✨', label: 'Otro' },
}

const statusColors: Record<string, string> = {
  active: 'text-blue-400',
  completed: 'text-green-400',
  paused: 'text-yellow-400',
  cancelled: 'text-zinc-500',
}

const statusLabels: Record<string, string> = {
  active: 'Activo',
  completed: 'Completado',
  paused: 'Pausado',
  cancelled: 'Cancelado',
}

export function DevEntryCard({ entry, onUpdate, onDelete }: DevEntryCardProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const config = typeConfig[entry.type]
  const isCompleted = entry.status === 'completed'

  const handleComplete = async () => {
    setCompleting(true)
    try {
      const newStatus = isCompleted ? 'active' : 'completed'
      const res = await fetch(`/api/personal-dev/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          progress: newStatus === 'completed' ? 100 : entry.progress,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        onUpdate(data.entry)
      }
    } finally {
      setCompleting(false)
    }
  }

  const handleProgressUpdate = async (newProgress: number) => {
    const res = await fetch(`/api/personal-dev/${entry.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progress: newProgress }),
    })
    if (res.ok) {
      const data = await res.json()
      onUpdate(data.entry)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Eliminar esta actividad?')) return
    setDeleting(true)
    try {
      await fetch(`/api/personal-dev/${entry.id}`, { method: 'DELETE' })
      onDelete(entry.id)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Card className={cn('transition-all', isCompleted && 'opacity-70')}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0 mt-0.5">{config.emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-xs">{config.label}</Badge>
                    <span className={cn('text-xs', statusColors[entry.status])}>
                      {statusLabels[entry.status] ?? entry.status}
                    </span>
                  </div>
                  <p className={cn('text-sm font-medium text-zinc-100 leading-snug', isCompleted && 'line-through text-zinc-400')}>
                    {entry.title}
                  </p>
                  {entry.description && (
                    <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{entry.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {entry.notes && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn('h-7 w-7', showNotes && 'text-indigo-400')}
                      onClick={() => setShowNotes(n => !n)}
                      title="Ver notas"
                    >
                      <StickyNote className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditOpen(true)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-400 hover:text-red-300"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Notes */}
              {showNotes && entry.notes && (
                <div className="mt-2 rounded-lg bg-zinc-800/50 p-2.5">
                  <p className="text-xs text-zinc-400 whitespace-pre-wrap">{entry.notes}</p>
                </div>
              )}

              {/* Progress */}
              {entry.type !== 'reflection' && (
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Progreso</span>
                    <span className="text-xs font-medium text-zinc-300">{entry.progress}%</span>
                  </div>
                  <Progress value={entry.progress} />
                  <div className="flex gap-1 mt-1">
                    {[0, 25, 50, 75, 100].map(p => (
                      <button
                        key={p}
                        onClick={() => handleProgressUpdate(p)}
                        className={cn(
                          'flex-1 rounded text-xs py-0.5 transition-colors',
                          entry.progress >= p
                            ? 'bg-indigo-600/30 text-indigo-300'
                            : 'bg-zinc-800 text-zinc-600 hover:bg-zinc-700'
                        )}
                      >
                        {p}%
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Complete button */}
              <div className="mt-3 flex justify-end">
                <Button
                  variant={isCompleted ? 'outline' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleComplete}
                  disabled={completing}
                >
                  <CheckCircle className={cn('h-3.5 w-3.5 mr-1', isCompleted && 'text-green-400')} />
                  {isCompleted ? 'Reactivar' : 'Marcar completo'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <DevForm open={editOpen} onOpenChange={setEditOpen} entry={entry} onSave={onUpdate} />
    </>
  )
}
