'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Company, CompanyState } from '@/types/company'

export function useCompanies() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await fetch('/api/company')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCompanies(data.companies ?? [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar empresas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(fetchCompanies, 0)
    return () => clearTimeout(timer)
  }, [fetchCompanies])

  const createCompany = async (input: {
    name: string
    description?: string
    mission?: string
    template: string
  }) => {
    const res = await fetch('/api/company', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Error al crear la empresa')
    await fetchCompanies()
    return data.company as Company
  }

  const deleteCompany = async (id: string) => {
    await fetch(`/api/company/${id}`, { method: 'DELETE' })
    setCompanies(prev => prev.filter(c => c.id !== id))
  }

  return { companies, loading, error, createCompany, deleteCompany, refresh: fetchCompanies }
}

// Estado en vivo de una empresa: polling rápido mientras hay misión activa
export function useCompanyState(companyId: string) {
  const [state, setState] = useState<CompanyState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const activeRef = useRef(false)

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/company/${companyId}/state`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setState(data)
      setError(null)
      activeRef.current = Boolean(data.active_mission)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar la empresa')
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const tick = async () => {
      await fetchState()
      timer = setTimeout(tick, activeRef.current ? 2500 : 8000)
    }
    timer = setTimeout(tick, 0)
    return () => clearTimeout(timer)
  }, [fetchState])

  const launchMission = async (objective: string) => {
    const res = await fetch(`/api/company/${companyId}/missions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ objective }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Error al lanzar la misión')
    activeRef.current = true
    await fetchState()
    return data.mission
  }

  const cancelMission = async (missionId: string) => {
    await fetch(`/api/company/missions/${missionId}`, { method: 'DELETE' })
    await fetchState()
  }

  const updateCompany = async (updates: Partial<Company>) => {
    const res = await fetch(`/api/company/${companyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Error al actualizar')
    await fetchState()
    return data.company
  }

  const hireAgent = async (specialty: string) => {
    const res = await fetch(`/api/company/${companyId}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ specialty }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Error al contratar')
    await fetchState()
    return data.agent
  }

  const fireAgent = async (agentId: string) => {
    await fetch(`/api/company/${companyId}/agents/${agentId}`, { method: 'DELETE' })
    await fetchState()
  }

  return {
    state,
    loading,
    error,
    refresh: fetchState,
    launchMission,
    cancelMission,
    updateCompany,
    hireAgent,
    fireAgent,
  }
}
