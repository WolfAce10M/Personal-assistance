'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, addDays, startOfWeek, isToday, parseISO, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarDays, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EventCard } from '@/components/calendar/event-card'
import { AICalendarCommand } from '@/components/calendar/ai-calendar-command'
import { cn } from '@/lib/utils'
import type { CalendarEvent } from '@/types'

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7) // 7:00 - 20:00
const DAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)
  const [googleConnected, setGoogleConnected] = useState(false)

  const today = new Date()
  const weekStart = startOfWeek(addDays(today, weekOffset * 7), { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const start = weekStart.toISOString()
      const end = addDays(weekStart, 7).toISOString()
      const res = await fetch(`/api/calendar/events?start=${start}&end=${end}`)
      if (res.ok) {
        const data: CalendarEvent[] = await res.json()
        setEvents(data)
      }
    } finally {
      setLoading(false)
    }
  }, [weekOffset])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const handleDelete = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  const eventsForDay = (day: Date) =>
    events.filter(e => {
      if (e.is_all_day) return false
      return isSameDay(parseISO(e.start_time), day)
    })

  const allDayEventsForDay = (day: Date) =>
    events.filter(e => e.is_all_day && isSameDay(parseISO(e.start_time), day))

  const todayEvents = events
    .filter(e => isSameDay(parseISO(e.start_time), today))
    .sort((a, b) => a.start_time.localeCompare(b.start_time))

  const upcomingEvents = events
    .filter(e => !isSameDay(parseISO(e.start_time), today) && parseISO(e.start_time) > today)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
    .slice(0, 5)

  const getEventStyle = (event: CalendarEvent) => {
    const start = parseISO(event.start_time)
    const end = parseISO(event.end_time)
    const startHour = start.getHours() + start.getMinutes() / 60
    const endHour = end.getHours() + end.getMinutes() / 60
    const top = Math.max(0, (startHour - 7) * 48)
    const height = Math.max(24, (endHour - startHour) * 48)
    return { top, height }
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Calendario"
        subtitle="Tu agenda y eventos"
        actions={
          !googleConnected ? (
            <Button size="sm" variant="outline" onClick={() => window.open('/api/auth/google', '_blank')}>
              <CalendarDays className="h-4 w-4" />
              Conectar Google Calendar
            </Button>
          ) : (
            <Button size="sm" variant="outline">
              <Search className="h-4 w-4" />
              Buscar hueco libre
            </Button>
          )
        }
      />

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">
        {/* Google Calendar CTA */}
        {!googleConnected && (
          <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-zinc-200">Conecta Google Calendar</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Sincroniza tus eventos y deja que la IA organice tu tiempo automáticamente.
              </p>
            </div>
            <Button size="sm" onClick={() => window.open('/api/auth/google', '_blank')}>
              Conectar
            </Button>
          </div>
        )}

        {/* AI Command */}
        <AICalendarCommand onCommandResult={() => fetchEvents()} />

        {/* Week navigation */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">
            {format(weekStart, "d 'de' MMMM", { locale: es })} –{' '}
            {format(addDays(weekStart, 6), "d 'de' MMMM yyyy", { locale: es })}
          </h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(w => w - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setWeekOffset(0)}>
              Hoy
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(w => w + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Week view */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-8 border-b border-zinc-800">
            <div className="p-2" />
            {weekDays.map((day, i) => (
              <div
                key={i}
                className={cn(
                  'p-2 text-center border-l border-zinc-800',
                  isToday(day) && 'bg-indigo-600/10'
                )}
              >
                <p className="text-xs text-zinc-500">{DAYS_SHORT[i]}</p>
                <p className={cn('text-sm font-semibold mt-0.5', isToday(day) ? 'text-indigo-400' : 'text-zinc-200')}>
                  {format(day, 'd')}
                </p>
              </div>
            ))}
          </div>

          {/* All-day events */}
          {weekDays.some(d => allDayEventsForDay(d).length > 0) && (
            <div className="grid grid-cols-8 border-b border-zinc-800">
              <div className="p-2 text-xs text-zinc-600">Todo el día</div>
              {weekDays.map((day, i) => (
                <div key={i} className="p-1 border-l border-zinc-800 space-y-0.5">
                  {allDayEventsForDay(day).map(ev => (
                    <div key={ev.id} className="rounded text-xs bg-indigo-600/20 text-indigo-300 px-1.5 py-0.5 truncate">
                      {ev.title}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Time grid */}
          <div className="overflow-auto max-h-96">
            <div className="grid grid-cols-8 relative">
              {/* Hours */}
              <div className="space-y-0">
                {HOURS.map(h => (
                  <div key={h} className="h-12 flex items-start pt-1 pr-2">
                    <span className="text-xs text-zinc-600 w-full text-right">
                      {h.toString().padStart(2, '0')}:00
                    </span>
                  </div>
                ))}
              </div>

              {/* Days */}
              {weekDays.map((day, dayIdx) => (
                <div
                  key={dayIdx}
                  className={cn(
                    'relative border-l border-zinc-800',
                    isToday(day) && 'bg-indigo-600/5'
                  )}
                  style={{ height: HOURS.length * 48 }}
                >
                  {/* Hour lines */}
                  {HOURS.map((_, hi) => (
                    <div
                      key={hi}
                      className="absolute left-0 right-0 border-t border-zinc-800/50"
                      style={{ top: hi * 48 }}
                    />
                  ))}

                  {/* Events */}
                  {loading
                    ? null
                    : eventsForDay(day).map(event => {
                        const { top, height } = getEventStyle(event)
                        return (
                          <div
                            key={event.id}
                            className={cn(
                              'absolute left-0.5 right-0.5 rounded px-1 py-0.5 text-xs overflow-hidden cursor-pointer hover:opacity-90 transition-opacity',
                              event.is_protected
                                ? 'bg-zinc-700/80 text-zinc-300'
                                : 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/30'
                            )}
                            style={{ top, height: Math.max(height, 20) }}
                            title={event.title}
                          >
                            <span className="font-medium line-clamp-2">{event.title}</span>
                          </div>
                        )
                      })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Today's events list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Hoy</h3>
            {todayEvents.length === 0 ? (
              <p className="text-xs text-zinc-500">Sin eventos hoy</p>
            ) : (
              <div className="space-y-2">
                {todayEvents.map(event => (
                  <EventCard key={event.id} event={event} onDelete={handleDelete} compact />
                ))}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Próximos</h3>
            {upcomingEvents.length === 0 ? (
              <p className="text-xs text-zinc-500">Sin próximos eventos</p>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map(event => (
                  <EventCard key={event.id} event={event} onDelete={handleDelete} compact />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
