'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { GoalCard } from '@/components/goals/goal-card'
import { GoalForm } from '@/components/goals/goal-form'
import type { Goal, GoalType } from '@/types'

const TABS: { key: GoalType | 'all'; label: string }[] = [
  { key: 'annual', label: 'Anuales' },
  { key: 'quarterly', label: 'Trimestrales' },
  { key: 'monthly', label: 'Mensuales' },
  { key: 'weekly', label: 'Semanales' },
]

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('annual')

  const fetchGoals = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/goals')
      if (res.ok) {
        const data = await res.json()
        setGoals(data.goals ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  const handleSave = (goal: Goal) => {
    setGoals(prev => {
      const idx = prev.findIndex(g => g.id === goal.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = goal
        return next
      }
      return [goal, ...prev]
    })
  }

  const handleUpdate = (goal: Goal) => {
    setGoals(prev => prev.map(g => (g.id === goal.id ? goal : g)))
  }

  const handleDelete = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id))
  }

  const goalsForTab = (type: string) =>
    goals.filter(g => g.type === type && !g.parent_goal_id)

  const countFor = (type: string) => goals.filter(g => g.type === type).length

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Objetivos"
        subtitle="Tu jerarquía de metas personales"
        actions={
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Nuevo objetivo
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-4 md:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start">
            {TABS.map(tab => (
              <TabsTrigger key={tab.key} value={tab.key} className="gap-1.5">
                {tab.label}
                <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
                  {countFor(tab.key)}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {TABS.map(tab => (
            <TabsContent key={tab.key} value={tab.key}>
              {loading ? (
                <div className="space-y-3 mt-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-32 rounded-xl bg-zinc-800/50 animate-pulse" />
                  ))}
                </div>
              ) : goalsForTab(tab.key).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="text-4xl mb-3">🎯</div>
                  <p className="text-sm font-medium text-zinc-400">No hay objetivos {tab.label.toLowerCase()}</p>
                  <p className="text-xs text-zinc-600 mt-1">Crea tu primer objetivo con el botón de arriba</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setFormOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Crear objetivo {tab.label.toLowerCase().slice(0, -1)}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 mt-2">
                  {goalsForTab(tab.key).map(goal => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      allGoals={goals}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <GoalForm
        open={formOpen}
        onOpenChange={setFormOpen}
        parentGoals={goals}
        onSave={handleSave}
      />
    </div>
  )
}
