'use client'

import { useState } from 'react'
import { format, parseISO, isPast } from 'date-fns'
import { es } from 'date-fns/locale'
import { Clock, Calendar, Tag, Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TaskForm } from './task-form'
import { cn, priorityConfig, categoryConfig, formatDuration } from '@/lib/utils'
import type { Task } from '@/types'

interface TaskCardProps {
  task: Task
  onUpdate: (task: Task) => void
}

export function TaskCard({ task, onUpdate }: TaskCardProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [toggling, setToggling] = useState(false)

  const isCompleted = task.status === 'completed'
  const priority = priorityConfig[task.priority]
  const category = categoryConfig[task.category]
  const isDueSoon = task.due_date && !isCompleted && isPast(parseISO(task.due_date))

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (toggling) return
    setToggling(true)
    try {
      const newStatus = isCompleted ? 'pending' : 'completed'
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        const data = await res.json()
        onUpdate(data.task)
      }
    } finally {
      setToggling(false)
    }
  }

  return (
    <>
      <div
        className={cn(
          'group flex items-start gap-3 rounded-xl border bg-zinc-900 p-4 transition-all hover:border-zinc-700',
          isCompleted ? 'border-zinc-800/50 opacity-60' : 'border-zinc-800'
        )}
      >
        {/* Checkbox */}
        <button
          onClick={handleToggle}
          disabled={toggling}
          className={cn(
            'mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all',
            isCompleted
              ? 'border-indigo-500 bg-indigo-500 text-white'
              : 'border-zinc-600 hover:border-indigo-400'
          )}
          aria-label={isCompleted ? 'Marcar como pendiente' : 'Marcar como completada'}
        >
          {isCompleted && (
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className={cn('text-sm font-medium text-zinc-100 leading-snug', isCompleted && 'line-through text-zinc-500')}>
                {category.emoji} {task.title}
              </p>
              {task.description && (
                <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{task.description}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={e => { e.stopPropagation(); setEditOpen(true) }}
              aria-label="Editar tarea"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Meta */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge className={cn('text-xs border', priority.bg, priority.color)}>
              {priority.label}
            </Badge>
            {task.due_date && (
              <span className={cn('flex items-center gap-1 text-xs', isDueSoon ? 'text-red-400' : 'text-zinc-500')}>
                <Calendar className="h-3 w-3" />
                {format(parseISO(task.due_date), "d MMM", { locale: es })}
              </span>
            )}
            {task.estimated_minutes && (
              <span className="flex items-center gap-1 text-xs text-zinc-500">
                <Clock className="h-3 w-3" />
                {formatDuration(task.estimated_minutes)}
              </span>
            )}
            {task.tags.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-zinc-500">
                <Tag className="h-3 w-3" />
                {task.tags.slice(0, 2).join(', ')}
                {task.tags.length > 2 && ` +${task.tags.length - 2}`}
              </span>
            )}
          </div>
        </div>
      </div>

      <TaskForm open={editOpen} onOpenChange={setEditOpen} task={task} onSave={onUpdate} />
    </>
  )
}
