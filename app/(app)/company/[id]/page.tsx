'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Pause, Play, Users, Zap } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { AgentCard } from '@/components/company/agent-card'
import { ActivityFeed } from '@/components/company/activity-feed'
import { MissionComposer } from '@/components/company/mission-composer'
import { MissionList } from '@/components/company/mission-list'
import { MissionDetailDialog } from '@/components/company/mission-detail-dialog'
import { HireAgentDialog } from '@/components/company/hire-agent-dialog'
import { useCompanyState } from '@/hooks/use-company'
import type { Agent } from '@/types/company'

export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const {
    state,
    loading,
    error,
    launchMission,
    cancelMission,
    updateCompany,
    hireAgent,
    fireAgent,
  } = useCompanyState(id)
  const [selectedMission, setSelectedMission] = useState<string | null>(null)

  if (loading && !state) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
      </div>
    )
  }

  if (error || !state) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-sm text-red-400">{error ?? 'Empresa no encontrada'}</p>
        <Link href="/company" className="text-xs text-indigo-400 hover:underline">
          ← Volver a empresas
        </Link>
      </div>
    )
  }

  const { company, agents, missions, active_mission, jobs, activities } = state
  const jobByAgent = new Map(
    jobs
      .filter(j => j.status === 'running' || j.status === 'reviewing' || j.status === 'revision')
      .map(j => [j.agent_id, j])
  )
  const completedMissions = missions.filter(m => m.status === 'completed').length
  const totalTokens = missions.reduce((sum, m) => sum + (m.total_tokens ?? 0), 0)
  const isPaused = company.status === 'paused'

  const handleFire = (agent: Agent) => {
    if (confirm(`¿Despedir a ${agent.name}?`)) fireAgent(agent.id)
  }

  return (
    <div className="flex h-full flex-col">
      <Header
        title={company.name}
        subtitle={company.mission || 'Empresa IA'}
        actions={
          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-1.5" title="En modo automático, Jarvis encadena nuevas misiones al terminar cada una">
              <Zap className={company.auto_mode ? 'h-3.5 w-3.5 text-amber-400' : 'h-3.5 w-3.5 text-zinc-600'} />
              <span className="hidden text-xs text-zinc-400 sm:inline">Auto</span>
              <Switch
                checked={company.auto_mode}
                onCheckedChange={checked => updateCompany({ auto_mode: checked })}
              />
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateCompany({ status: isPaused ? 'active' : 'paused' })}
            >
              {isPaused ? <Play className="mr-1 h-3 w-3" /> : <Pause className="mr-1 h-3 w-3" />}
              {isPaused ? 'Activar' : 'Pausar'}
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-7xl space-y-4">
          {/* Barra superior: volver + stats */}
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/company"
              className="flex items-center gap-1 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Empresas
            </Link>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {isPaused && <Badge variant="secondary">Pausada</Badge>}
              <Badge variant="secondary">
                <Users className="mr-1 h-3 w-3" />
                {agents.length} agentes
              </Badge>
              <Badge variant="success">{completedMissions} misiones completadas</Badge>
              <Badge variant="secondary">{(totalTokens / 1000).toFixed(1)}k tokens</Badge>
            </div>
          </div>

          {/* Lanzador de misiones */}
          <MissionComposer
            activeMission={active_mission ?? null}
            onLaunch={launchMission}
            onCancel={cancelMission}
            disabled={isPaused}
          />

          {/* Oficina: agentes + actividad */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Equipo
                </h2>
                <HireAgentDialog agents={agents} onHire={hireAgent} />
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {agents.map(agent => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    currentJob={jobByAgent.get(agent.id)}
                    onFire={handleFire}
                  />
                ))}
              </div>
            </div>

            <div className="h-[420px] lg:h-auto lg:min-h-[420px]">
              <ActivityFeed activities={activities} live={Boolean(active_mission)} />
            </div>
          </div>

          {/* Historial de misiones */}
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Misiones
            </h2>
            <MissionList
              missions={missions}
              activeJobs={jobs}
              onSelect={m => setSelectedMission(m.id)}
            />
          </div>
        </div>
      </div>

      <MissionDetailDialog missionId={selectedMission} onClose={() => setSelectedMission(null)} />
    </div>
  )
}
