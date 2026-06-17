'use client'

import { useState } from 'react'
import { OrganizeDayButton } from './organize-day-button'
import { DailySummaryCard } from './daily-summary-card'
import { UpcomingMeetingsCard } from './upcoming-meetings-card'
import { PriorityTasksCard } from './priority-tasks-card'
import { ActiveGoalsCard } from './active-goals-card'
import { TrainingTodayCard } from './training-today-card'
import { PersonalDevCard } from './personal-dev-card'
import { FreeTimeCard } from './free-time-card'
import { AlertsCard } from './alerts-card'

export function DashboardView() {
  const [isOrganizing, setIsOrganizing] = useState(false)
  const [dailyPlan, setDailyPlan] = useState<string | null>(null)

  const handleOrganizeDay = async () => {
    setIsOrganizing(true)
    try {
      const res = await fetch('/api/ai/organize-day', { method: 'POST' })
      const data = await res.json()
      setDailyPlan(data.plan)
    } catch (e) {
      console.error(e)
    } finally {
      setIsOrganizing(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Organize Day CTA */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Buenos días</h2>
          <p className="text-sm text-zinc-400">Aquí está tu resumen del día</p>
        </div>
        <OrganizeDayButton onClick={handleOrganizeDay} isLoading={isOrganizing} />
      </div>

      {/* Daily plan from AI */}
      {dailyPlan && (
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-600/5 p-4">
          <p className="text-xs font-medium text-indigo-400 mb-2">✨ Plan del día generado por IA</p>
          <p className="text-sm text-zinc-300 whitespace-pre-wrap">{dailyPlan}</p>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <DailySummaryCard />
        <UpcomingMeetingsCard />
        <PriorityTasksCard />
        <ActiveGoalsCard />
        <TrainingTodayCard />
        <PersonalDevCard />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FreeTimeCard />
        <AlertsCard />
      </div>
    </div>
  )
}
