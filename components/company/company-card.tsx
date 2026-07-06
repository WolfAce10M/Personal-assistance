'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Building2, Loader2, Trash2, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { agentIcon, agentColors } from '@/components/company/agent-visuals'
import type { Company } from '@/types/company'

interface CompanyCardProps {
  company: Company
  onDelete: (company: Company) => void
}

export function CompanyCard({ company, onDelete }: CompanyCardProps) {
  const agents = company.agents ?? []
  const working = agents.filter(a => a.status !== 'idle' && a.status !== 'error').length
  const isRunning = (company.running_missions ?? 0) > 0

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Link
        href={`/company/${company.id}`}
        className={cn(
          'group relative block rounded-xl border bg-zinc-900 p-5 transition-colors hover:border-zinc-700',
          isRunning ? 'border-indigo-500/40' : 'border-zinc-800'
        )}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-zinc-100">{company.name}</p>
              {company.status === 'paused' && (
                <Badge variant="secondary" className="text-[10px]">Pausada</Badge>
              )}
              {company.auto_mode && (
                <Badge variant="warning" className="text-[10px]">
                  <Zap className="mr-0.5 h-2.5 w-2.5" />
                  auto
                </Badge>
              )}
            </div>
            <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">
              {company.mission || company.description || 'Sin misión definida'}
            </p>
          </div>
          <button
            onClick={e => {
              e.preventDefault()
              onDelete(company)
            }}
            className="rounded-md p-1.5 text-zinc-600 opacity-0 transition-opacity hover:bg-zinc-800 hover:text-red-400 group-hover:opacity-100"
            title="Eliminar empresa"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Mini-equipo */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex -space-x-1.5">
            {agents.slice(0, 8).map(a => {
              const Icon = agentIcon(a.icon)
              const colors = agentColors(a.color)
              const busy = a.status !== 'idle' && a.status !== 'error'
              return (
                <div
                  key={a.id}
                  title={a.name}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full border-2 border-zinc-900',
                    colors.bg,
                    busy && 'ring-1 ring-indigo-400'
                  )}
                >
                  <Icon className={cn('h-3 w-3', colors.text)} />
                </div>
              )
            })}
            {agents.length > 8 && (
              <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-zinc-900 bg-zinc-800 text-[9px] font-medium text-zinc-400">
                +{agents.length - 8}
              </div>
            )}
          </div>

          {isRunning ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-indigo-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              {working > 0 ? `${working} bots trabajando` : 'Misión en curso'}
            </span>
          ) : (
            <span className="text-xs text-zinc-600">{agents.length} agentes</span>
          )}
        </div>
      </Link>
    </motion.div>
  )
}
