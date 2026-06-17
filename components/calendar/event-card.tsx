'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Clock, MapPin, Lock, Pencil, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CalendarEvent } from '@/types'

interface EventCardProps {
  event: CalendarEvent
  onUpdate?: (event: CalendarEvent) => void
  onDelete?: (id: string) => void
  compact?: boolean
}

export function EventCard({ event, onUpdate, onDelete, compact = false }: EventCardProps) {
  const [deleting, setDeleting] = useState(false)

  const start = parseISO(event.start_time)
  const end = parseISO(event.end_time)
  const durationMs = end.getTime() - start.getTime()
  const durationMin = Math.round(durationMs / 60000)
  const hours = Math.floor(durationMin / 60)
  const mins = durationMin % 60
  const durationStr = hours > 0 ? (mins > 0 ? `${hours}h ${mins}min` : `${hours}h`) : `${mins}min`

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este evento?')) return
    setDeleting(true)
    try {
      await fetch(`/api/calendar/events/${event.id}`, { method: 'DELETE' })
      onDelete?.(event.id)
    } finally {
      setDeleting(false)
    }
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
        <div className="flex flex-col items-center text-center w-10 flex-shrink-0">
          <span className="text-xs font-semibold text-indigo-400">{format(start, 'HH:mm')}</span>
          <span className="text-xs text-zinc-600">{format(end, 'HH:mm')}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {event.is_protected && <Lock className="h-3 w-3 text-zinc-500 flex-shrink-0" />}
            <p className="text-sm font-medium text-zinc-100 truncate">{event.title}</p>
          </div>
          {event.location && (
            <p className="text-xs text-zinc-500 truncate mt-0.5">{event.location}</p>
          )}
        </div>
        <span className="text-xs text-zinc-500 flex-shrink-0">{durationStr}</span>
      </div>
    )
  }

  return (
    <Card className={cn(event.is_protected && 'border-zinc-700')}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {event.is_all_day && (
                <Badge variant="secondary" className="text-xs">Todo el día</Badge>
              )}
              {event.is_protected && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Lock className="h-3 w-3" />
                  Protegido
                </Badge>
              )}
            </div>
            <p className="text-sm font-semibold text-zinc-100">{event.title}</p>
            {event.description && (
              <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{event.description}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {!event.is_all_day && (
                <span className="flex items-center gap-1 text-xs text-zinc-400">
                  <Clock className="h-3 w-3" />
                  {format(start, 'HH:mm')} – {format(end, 'HH:mm')} ({durationStr})
                </span>
              )}
              {event.location && (
                <span className="flex items-center gap-1 text-xs text-zinc-500">
                  <MapPin className="h-3 w-3" />
                  {event.location}
                </span>
              )}
            </div>
          </div>

          {!event.is_protected && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="Editar evento"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-red-400 hover:text-red-300"
                onClick={handleDelete}
                disabled={deleting}
                aria-label="Eliminar evento"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
