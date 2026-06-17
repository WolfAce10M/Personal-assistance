'use client'

import { useEffect, useState } from 'react'
import { Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Goal } from '@/types'
import { goalTypeConfig } from '@/lib/utils'

export function ActiveGoalsCard() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/goals?status=active&limit=4')
      .then((r) => r.json())
      .then((d) => setGoals(d.goals ?? []))
      .catch(() => setGoals([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-amber-400" />
            <CardTitle>Objetivos activos</CardTitle>
          </div>
          <a href="/goals" className="text-xs text-zinc-500 hover:text-zinc-300">Ver todo</a>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-14 rounded-lg bg-zinc-800 animate-pulse" />
            ))}
          </div>
        ) : goals.length === 0 ? (
          <div className="text-center py-6">
            <Target className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">Sin objetivos activos</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {goals.map((goal) => {
              const t = goalTypeConfig[goal.type]
              return (
                <li key={goal.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className={`shrink-0 text-xs ${t.color} border-current/20`}>
                        {t.label}
                      </Badge>
                      <p className="text-sm text-zinc-100 truncate">{goal.title}</p>
                    </div>
                    <span className="text-xs text-zinc-400 shrink-0">{goal.progress}%</span>
                  </div>
                  <Progress value={goal.progress} className="h-1" />
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
