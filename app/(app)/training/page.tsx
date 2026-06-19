'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, startOfWeek, addDays, isToday, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, Sparkles, Dumbbell } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SessionCard } from '@/components/training/session-card'
import { ExerciseLog } from '@/components/training/exercise-log'
import type { TrainingSession } from '@/types'

const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export default function TrainingPage() {
  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [loading, setLoading] = useState(true)
  const [creatingPlan, setCreatingPlan] = useState(false)
  const [planMessage, setPlanMessage] = useState('')
  const [logSessionId, setLogSessionId] = useState<string | null>(null)

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/training')
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const handleUpdate = (updated: TrainingSession) => {
    setSessions(prev => prev.map(s => (s.id === updated.id ? updated : s)))
  }

  const handleExerciseSave = (sessionId: string, exercises: TrainingSession['exercises']) => {
    setSessions(prev =>
      prev.map(s => (s.id === sessionId ? { ...s, exercises } : s))
    )
  }

  const handleCreateAIPlan = async () => {
    setCreatingPlan(true)
    setPlanMessage('')
    try {
      const res = await fetch('/api/ai/training-plan', { method: 'POST' })
      const data = await res.json()
      setPlanMessage(data.plan ? `Plan "${data.plan.name}" creado con ${data.sessions?.length ?? 0} sesiones` : 'Plan creado correctamente')
      await fetchSessions()
    } catch {
      setPlanMessage('Error al crear el plan. Inténtalo de nuevo.')
    } finally {
      setCreatingPlan(false)
    }
  }

  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const todaySessions = sessions.filter(s => {
    if (!s.scheduled_date) return false
    return isToday(parseISO(s.scheduled_date))
  })

  const weekSessions = sessions.filter(s => {
    if (!s.scheduled_date) return false
    const d = parseISO(s.scheduled_date)
    return d >= weekStart && d <= addDays(weekStart, 6)
  })

  const historySessions = sessions.filter(s => s.status === 'completed' || s.status === 'skipped')

  const sessionForDay = (day: Date) =>
    weekSessions.filter(s => {
      if (!s.scheduled_date) return false
      const d = parseISO(s.scheduled_date)
      return format(d, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
    })

  const activeLogSession = sessions.find(s => s.id === logSessionId)

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Entrenamiento"
        subtitle="Sigue tu progreso físico"
        actions={
          <Button size="sm" onClick={handleCreateAIPlan} disabled={creatingPlan}>
            <Sparkles className="h-4 w-4" />
            {creatingPlan ? 'Generando...' : 'Crear plan con IA'}
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">
        {planMessage && (
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-600/5 p-3">
            <p className="text-xs text-indigo-300">{planMessage}</p>
          </div>
        )}

        <Tabs defaultValue="today">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="today">Hoy</TabsTrigger>
            <TabsTrigger value="week">Semana</TabsTrigger>
            <TabsTrigger value="history">Historial</TabsTrigger>
            <TabsTrigger value="log">Registrar</TabsTrigger>
          </TabsList>

          {/* HOY */}
          <TabsContent value="today">
            {loading ? (
              <div className="space-y-3">
                <div className="h-40 rounded-xl bg-zinc-800/50 animate-pulse" />
              </div>
            ) : todaySessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-4xl mb-3">🏋️</div>
                <p className="text-sm font-medium text-zinc-400">Sin sesión programada hoy</p>
                <p className="text-xs text-zinc-600 mt-1">¡Día de descanso o crea un plan con IA!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todaySessions.map(session => (
                  <SessionCard key={session.id} session={session} onUpdate={handleUpdate} isToday />
                ))}
              </div>
            )}
          </TabsContent>

          {/* SEMANA */}
          <TabsContent value="week">
            <div className="grid grid-cols-7 gap-1 mb-4">
              {weekDays.map((day, i) => {
                const daySessions = sessionForDay(day)
                const isDayToday = isToday(day)
                return (
                  <div
                    key={i}
                    className={`rounded-lg p-2 text-center ${isDayToday ? 'bg-indigo-600/20 border border-indigo-500/30' : 'bg-zinc-900 border border-zinc-800'}`}
                  >
                    <p className="text-xs text-zinc-500 mb-1">{DAYS_ES[i]}</p>
                    <p className={`text-sm font-semibold ${isDayToday ? 'text-indigo-300' : 'text-zinc-300'}`}>
                      {format(day, 'd')}
                    </p>
                    {daySessions.length > 0 && (
                      <div className="mt-1 flex justify-center">
                        <Dumbbell className={`h-3 w-3 ${daySessions[0].status === 'completed' ? 'text-green-400' : 'text-indigo-400'}`} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="space-y-3">
              {weekSessions.length === 0 ? (
                <p className="text-center text-sm text-zinc-500 py-8">Sin sesiones esta semana</p>
              ) : (
                weekSessions.map(session => (
                  <SessionCard key={session.id} session={session} onUpdate={handleUpdate} isToday={isToday(parseISO(session.scheduled_date ?? ''))} />
                ))
              )}
            </div>
          </TabsContent>

          {/* HISTORIAL */}
          <TabsContent value="history">
            {historySessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm text-zinc-400">Sin historial de sesiones</p>
                <p className="text-xs text-zinc-600 mt-1">Completa sesiones para ver tu historial aquí</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historySessions.map(session => (
                  <SessionCard key={session.id} session={session} onUpdate={handleUpdate} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* REGISTRAR */}
          <TabsContent value="log">
            <div className="space-y-4">
              {/* Session selector */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Selecciona una sesión</CardTitle>
                </CardHeader>
                <CardContent>
                  {sessions.filter(s => s.status === 'scheduled').length === 0 ? (
                    <p className="text-xs text-zinc-500">No hay sesiones programadas para registrar</p>
                  ) : (
                    <div className="space-y-2">
                      {sessions.filter(s => s.status === 'scheduled').map(s => (
                        <button
                          key={s.id}
                          onClick={() => setLogSessionId(s.id === logSessionId ? null : s.id)}
                          className={`w-full text-left rounded-lg border p-3 text-sm transition-all ${logSessionId === s.id ? 'border-indigo-500/50 bg-indigo-600/10' : 'border-zinc-800 hover:border-zinc-700'}`}
                        >
                          <span className="font-medium text-zinc-100">{s.name}</span>
                          {s.scheduled_date && (
                            <span className="ml-2 text-xs text-zinc-500">
                              {format(parseISO(s.scheduled_date), "d MMM", { locale: es })}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {activeLogSession && (
                <ExerciseLog
                  sessionId={activeLogSession.id}
                  exercises={activeLogSession.exercises}
                  onSave={exercises => handleExerciseSave(activeLogSession.id, exercises)}
                />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
