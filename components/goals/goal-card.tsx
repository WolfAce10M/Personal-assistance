'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronDown, ChevronRight, Pencil, Trash2, Target, Calendar } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { GoalForm } from './goal-form'
import { cn, goalTypeConfig } from '@/lib/utils'
import type { Goal } from '@/types'

interface GoalCardProps {
  goal: Goal
  allGoals?: Goal[]
  onUpdate: (goal: Goal) => void
  onDelete: (id: string) => void
}

const statusLabels: Record<string, string> = {
  active: 'Activo',
  completed: 'Completado',
  paused: 'Pausado',
  cancelled: 'Cancelado',
}

const statusColors: Record<string, string> = {
  active: 'text-green-400',
  completed: 'text-indigo-400',
  paused: 'text-yellow-400',
  cancelled: 'text-zinc-500',
}

export function GoalCard({ goal, allGoals = [], onUpdate, onDelete }: GoalCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const typeConfig = goalTypeConfig[goal.type]
  const hasChildren = goal.children && goal.children.length > 0

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este objetivo?')) return
    setDeleting(true)
    try {
      await fetch(`/api/goals/${goal.id}`, { method: 'DELETE' })
      onDelete(goal.id)
    } finally {
      setDeleting(false)
    }
  }

  const handleStatusToggle = async () => {
    const next = goal.status === 'active' ? 'completed' : 'active'
    const res = await fetch(`/api/goals/${goal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    if (res.ok) {
      const data = await res.json()
      onUpdate(data.goal)
    }
  }

  return (
    <>
      <Card className={cn('transition-all', goal.status === 'completed' && 'opacity-70')}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Expand toggle */}
            {hasChildren ? (
              <button
                onClick={() => setExpanded(e => !e)}
                className="mt-0.5 flex-shrink-0 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            ) : (
              <Target className="mt-0.5 h-4 w-4 flex-shrink-0 text-zinc-600" />
            )}

            <div className="min-w-0 flex-1">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge variant="outline" className={cn('text-xs', typeConfig.color)}>
                      {typeConfig.label}
                    </Badge>
                    <span className={cn('text-xs font-medium', statusColors[goal.status])}>
                      {statusLabels[goal.status]}
                    </span>
                  </div>
                  <p className={cn('text-sm font-medium text-zinc-100 leading-snug', goal.status === 'completed' && 'line-through text-zinc-400')}>
                    {goal.title}
                  </p>
                  {goal.description && (
                    <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{goal.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
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

              {/* Progress */}
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Progreso</span>
                  <span className="text-xs font-medium text-zinc-300">{goal.progress}%</span>
                </div>
                <Progress value={goal.progress} />
              </div>

              {/* Footer */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  {goal.target_date && (
                    <span className="flex items-center gap-1 text-xs text-zinc-500">
                      <Calendar className="h-3 w-3" />
                      {format(parseISO(goal.target_date), "d MMM yyyy", { locale: es })}
                    </span>
                  )}
                  {goal.tasks && goal.tasks.length > 0 && (
                    <span className="text-xs text-zinc-500">{goal.tasks.length} tareas</span>
                  )}
                  {hasChildren && (
                    <span className="text-xs text-zinc-500">{goal.children!.length} sub-objetivos</span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={handleStatusToggle}
                >
                  {goal.status === 'active' ? 'Completar' : 'Reactivar'}
                </Button>
              </div>

              {/* Sub-goals */}
              {expanded && hasChildren && (
                <div className="mt-3 space-y-2 pl-2 border-l border-zinc-800">
                  {goal.children!.map(child => (
                    <GoalCard
                      key={child.id}
                      goal={child}
                      allGoals={allGoals}
                      onUpdate={onUpdate}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <GoalForm
        open={editOpen}
        onOpenChange={setEditOpen}
        goal={goal}
        parentGoals={allGoals.filter(g => g.id !== goal.id)}
        onSave={onUpdate}
      />
    </>
  )
}
