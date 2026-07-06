'use client'

import { useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { COMPANY_TEMPLATES } from '@/lib/agents/roster'
import { agentIcon } from '@/components/company/agent-visuals'

interface CreateCompanyDialogProps {
  onCreate: (input: {
    name: string
    description?: string
    mission?: string
    template: string
  }) => Promise<unknown>
}

export function CreateCompanyDialog({ onCreate }: CreateCompanyDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [mission, setMission] = useState('')
  const [template, setTemplate] = useState('startup')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = async () => {
    if (!name.trim() || creating) return
    setCreating(true)
    setError(null)
    try {
      await onCreate({ name: name.trim(), mission: mission.trim() || undefined, template })
      setName('')
      setMission('')
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la empresa')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1.5 h-4 w-4" />
          Nueva empresa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Crear empresa</DialogTitle>
          <DialogDescription>
            Cada empresa es una estructura independiente con su propio Jarvis, auditor y equipo de especialistas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Nombre</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="P. ej. Agencia IA, Mi SaaS, Cartera 2026…"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">
              Misión (opcional, guía a todo el equipo)
            </label>
            <Textarea
              value={mission}
              onChange={e => setMission(e.target.value)}
              placeholder="P. ej. Facturar 10k€/mes vendiendo automatizaciones IA a pymes…"
              rows={2}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Estructura</label>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {COMPANY_TEMPLATES.map(t => {
                const Icon = agentIcon(t.icon)
                const selected = template === t.key
                return (
                  <button
                    key={t.key}
                    onClick={() => setTemplate(t.key)}
                    className={cn(
                      'flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors',
                      selected
                        ? 'border-indigo-500/60 bg-indigo-600/10'
                        : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                        selected ? 'bg-indigo-600/20' : 'bg-zinc-800'
                      )}
                    >
                      <Icon className={cn('h-4 w-4', selected ? 'text-indigo-400' : 'text-zinc-400')} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-zinc-200">{t.name}</p>
                      <p className="text-[10px] leading-snug text-zinc-500">{t.description}</p>
                      <p className="mt-0.5 text-[10px] text-zinc-600">
                        {t.specialties.length + 2} agentes
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <Button onClick={create} disabled={!name.trim() || creating} className="w-full">
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Crear empresa
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
