'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Filter } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TaskCard } from '@/components/tasks/task-card'
import { TaskForm } from '@/components/tasks/task-form'
import type { Task, TaskStatus, TaskCategory, Priority } from '@/types'

const TAB_STATUSES: Record<string, TaskStatus | 'all'> = {
  all: 'all',
  pending: 'pending',
  in_progress: 'in_progress',
  completed: 'completed',
  blocked: 'blocked',
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tasks')
      if (res.ok) {
        const data: Task[] = await res.json()
        setTasks(data)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const handleSave = (task: Task) => {
    setTasks(prev => {
      const idx = prev.findIndex(t => t.id === task.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = task
        return next
      }
      return [task, ...prev]
    })
  }

  const handleUpdate = (task: Task) => {
    setTasks(prev => prev.map(t => (t.id === task.id ? task : t)))
  }

  const filtered = tasks.filter(task => {
    const statusMatch = activeTab === 'all' || task.status === TAB_STATUSES[activeTab]
    const categoryMatch = categoryFilter === 'all' || task.category === categoryFilter
    const priorityMatch = priorityFilter === 'all' || task.priority === priorityFilter
    const searchMatch =
      !search ||
      task.title.toLowerCase().includes(search.toLowerCase()) ||
      (task.description ?? '').toLowerCase().includes(search.toLowerCase()) ||
      task.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
    return statusMatch && categoryMatch && priorityMatch && searchMatch
  })

  const countFor = (status: string) =>
    status === 'all'
      ? tasks.length
      : tasks.filter(t => t.status === TAB_STATUSES[status]).length

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Tareas"
        subtitle="Gestiona tus tareas y pendientes"
        actions={
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Nueva tarea
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start overflow-x-auto">
            {[
              { key: 'all', label: 'Todas' },
              { key: 'pending', label: 'Pendientes' },
              { key: 'in_progress', label: 'En progreso' },
              { key: 'completed', label: 'Completadas' },
              { key: 'blocked', label: 'Bloqueadas' },
            ].map(tab => (
              <TabsTrigger key={tab.key} value={tab.key} className="gap-1.5">
                {tab.label}
                <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
                  {countFor(tab.key)}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Filters */}
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Buscar tareas..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-36">
                  <Filter className="h-3.5 w-3.5 mr-1.5 text-zinc-400" />
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="work">💼 Trabajo</SelectItem>
                  <SelectItem value="business">📊 Negocios</SelectItem>
                  <SelectItem value="personal">🏠 Personal</SelectItem>
                  <SelectItem value="health">💪 Salud</SelectItem>
                  <SelectItem value="learning">📚 Aprendizaje</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Prioridad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="urgent">🔴 Urgente</SelectItem>
                  <SelectItem value="high">🟠 Alta</SelectItem>
                  <SelectItem value="medium">🟡 Media</SelectItem>
                  <SelectItem value="low">🟢 Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Task lists per tab */}
          {Object.keys(TAB_STATUSES).map(tabKey => (
            <TabsContent key={tabKey} value={tabKey}>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 rounded-xl bg-zinc-800/50 animate-pulse" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="text-4xl mb-3">✅</div>
                  <p className="text-sm font-medium text-zinc-400">No hay tareas</p>
                  <p className="text-xs text-zinc-600 mt-1">
                    {search || categoryFilter !== 'all' || priorityFilter !== 'all'
                      ? 'Prueba con otros filtros'
                      : 'Crea tu primera tarea con el botón de arriba'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map(task => (
                    <TaskCard key={task.id} task={task} onUpdate={handleUpdate} />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <TaskForm open={formOpen} onOpenChange={setFormOpen} onSave={handleSave} />
    </div>
  )
}
