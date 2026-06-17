'use client'

import { useState, useEffect, useCallback } from 'react'
import { Task, TaskStatus, Priority, TaskCategory } from '@/types'

interface TaskFilters {
  status?: TaskStatus | TaskStatus[]
  priority?: Priority | Priority[]
  category?: TaskCategory
  search?: string
  limit?: number
}

export function useTasks(filters: TaskFilters = {}) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filters.status) {
        const statuses = Array.isArray(filters.status) ? filters.status : [filters.status]
        params.set('status', statuses.join(','))
      }
      if (filters.priority) {
        const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority]
        params.set('priority', priorities.join(','))
      }
      if (filters.category) params.set('category', filters.category)
      if (filters.search) params.set('q', filters.search)
      if (filters.limit) params.set('limit', String(filters.limit))

      const res = await fetch(`/api/tasks?${params}`)
      const data = await res.json()
      setTasks(data.tasks ?? [])
    } catch {
      setError('Error al cargar tareas')
    } finally {
      setLoading(false)
    }
  }, [filters.status, filters.priority, filters.category, filters.search, filters.limit]) // eslint-disable-line

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const createTask = async (task: Partial<Task>) => {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    })
    const data = await res.json()
    if (data.task) {
      setTasks((prev) => [data.task, ...prev])
    }
    return data.task
  }

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const data = await res.json()
    if (data.task) {
      setTasks((prev) => prev.map((t) => (t.id === id ? data.task : t)))
    }
    return data.task
  }

  const deleteTask = async (id: string) => {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  const toggleStatus = async (task: Task) => {
    const newStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed'
    return updateTask(task.id, { status: newStatus })
  }

  return { tasks, loading, error, createTask, updateTask, deleteTask, toggleStatus, refresh: fetchTasks }
}
