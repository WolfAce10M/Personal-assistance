'use client'

import { useEffect, useState } from 'react'
import { Calendar, ExternalLink, Lock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarEvent } from '@/types'
import { formatTime, formatRelative } from '@/lib/utils'

export function UpcomingMeetingsCard() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/calendar')
      .then((r) => r.json())
      .then((d) => setEvents(d.events ?? []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-purple-400" />
            <CardTitle>Próximos eventos</CardTitle>
          </div>
          <a href="/calendar" className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1">
            Ver todo <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-lg bg-zinc-800 animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-6">
            <Calendar className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">Sin eventos próximos</p>
            <p className="text-xs text-zinc-600 mt-1">Conecta Google Calendar para ver tus eventos</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {events.slice(0, 4).map((event) => (
              <li key={event.id} className="flex items-start gap-3 rounded-lg bg-zinc-800/50 px-3 py-2">
                <div className="w-1 rounded-full bg-purple-500 self-stretch shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-zinc-100 truncate">{event.title}</p>
                    {event.is_protected && <Lock className="h-3 w-3 text-amber-400 shrink-0" />}
                  </div>
                  <p className="text-xs text-zinc-500">{formatRelative(event.start_time)}</p>
                </div>
                <Badge variant="secondary" className="shrink-0 text-xs">
                  {formatTime(event.start_time)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
