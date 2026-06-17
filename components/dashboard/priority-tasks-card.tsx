'use client'

import { useEffect, useState } from 'react'
import { CheckSquare, Circle, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Task } from '@/types'
import { priorityConfig } from '@/lib/utils'

export function PriorityTasksCard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/tasks?priority=urgent,high&status=pending,in_progress&limit=5')
      .then((r) => r.json())
      .then((d) => setTasks(d.tasks ?? []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false))
  }, [])

  const toggle = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)))
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-blue-400" />
            <CardTitle>Tareas prioritarias</CardTitle>
          </div>
          <a href="/tasks" className="text-xs text-zinc-500 hover:text-zinc-300">Ver todo</a>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 rounded-lg bg-zinc-800 animate-pulse" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-400">Sin tareas urgentes</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => {
              const p = priorityConfig[task.priority]
              return (
                <li
                  key={task.id}
                  className="flex items-center gap-3 rounded-lg bg-zinc-800/50 px-3 py-2 group"
                >
                  <button onClick={() => toggle(task)} className="shrink-0">
                    {task.status === 'completed' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Circle className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                    )}
                  </button>
                  <span className={`flex-1 text-sm truncate ${task.status === 'completed' ? 'line-through text-zinc-600' : 'text-zinc-100'}`}>
                    {task.title}
                  </span>
                  <Badge className={`shrink-0 ${p.bg} border text-xs`}>
                    <span className={p.color}>{p.label}</span>
                  </Badge>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
