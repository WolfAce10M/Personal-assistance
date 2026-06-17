'use client'

import { useState, useEffect, useCallback } from 'react'
import { Goal, GoalType, GoalStatus } from '@/types'

export function useGoals(filters: { type?: GoalType; status?: GoalStatus; limit?: number } = {}) {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.type) params.set('type', filters.type)
      if (filters.status) params.set('status', filters.status)
      if (filters.limit) params.set('limit', String(filters.limit))
      const res = await fetch(`/api/goals?${params}`)
      const data = await res.json()
      setGoals(data.goals ?? [])
    } finally {
      setLoading(false)
    }
  }, [filters.type, filters.status, filters.limit]) // eslint-disable-line

  useEffect(() => { fetch_() }, [fetch_])

  const createGoal = async (goal: Partial<Goal>) => {
    const res = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goal),
    })
    const data = await res.json()
    if (data.goal) setGoals((prev) => [data.goal, ...prev])
    return data.goal
  }

  const updateGoal = async (id: string, updates: Partial<Goal>) => {
    const res = await fetch(`/api/goals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const data = await res.json()
    if (data.goal) setGoals((prev) => prev.map((g) => (g.id === id ? data.goal : g)))
    return data.goal
  }

  const deleteGoal = async (id: string) => {
    await fetch(`/api/goals/${id}`, { method: 'DELETE' })
    setGoals((prev) => prev.filter((g) => g.id !== id))
  }

  return { goals, loading, createGoal, updateGoal, deleteGoal, refresh: fetch_ }
}
