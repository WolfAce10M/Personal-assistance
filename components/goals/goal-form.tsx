'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Goal, GoalType } from '@/types'

interface GoalFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal?: Goal
  parentGoals?: Goal[]
  onSave: (goal: Goal) => void
}

const defaultForm = {
  title: '',
  description: '',
  type: 'monthly' as GoalType,
  target_date: '',
  parent_goal_id: '',
}

export function GoalForm({ open, onOpenChange, goal, parentGoals = [], onSave }: GoalFormProps) {
  const [form, setForm] = useState({
    title: goal?.title ?? defaultForm.title,
    description: goal?.description ?? defaultForm.description,
    type: goal?.type ?? defaultForm.type,
    target_date: goal?.target_date ? goal.target_date.split('T')[0] : defaultForm.target_date,
    parent_goal_id: goal?.parent_goal_id ?? defaultForm.parent_goal_id,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) {
      setError('El título es obligatorio')
      return
    }
    setLoading(true)
    setError('')
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        type: form.type,
        target_date: form.target_date || undefined,
        parent_goal_id: form.parent_goal_id || undefined,
      }
      const url = goal ? `/api/goals/${goal.id}` : '/api/goals'
      const method = goal ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Error al guardar el objetivo')
      const data = await res.json()
      onSave(data.goal)
      onOpenChange(false)
      if (!goal) setForm({ ...defaultForm })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{goal ? 'Editar objetivo' : 'Nuevo objetivo'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Título *</label>
            <Input
              placeholder="¿Qué quieres lograr?"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Descripción</label>
            <Textarea
              placeholder="Describe tu objetivo con más detalle..."
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Tipo</label>
              <Select value={form.type} onValueChange={v => set('type', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">🎯 Anual</SelectItem>
                  <SelectItem value="quarterly">📅 Trimestral</SelectItem>
                  <SelectItem value="monthly">🗓️ Mensual</SelectItem>
                  <SelectItem value="weekly">📆 Semanal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Fecha objetivo</label>
              <Input
                type="date"
                value={form.target_date}
                onChange={e => set('target_date', e.target.value)}
                className="[color-scheme:dark]"
              />
            </div>
          </div>
          {parentGoals.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Objetivo padre (opcional)</label>
              <Select value={form.parent_goal_id} onValueChange={v => set('parent_goal_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin objetivo padre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin objetivo padre</SelectItem>
                  {parentGoals.map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : goal ? 'Guardar cambios' : 'Crear objetivo'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
