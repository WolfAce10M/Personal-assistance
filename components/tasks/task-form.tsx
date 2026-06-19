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
import type { Task, Priority, TaskCategory } from '@/types'

interface TaskFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: Task
  onSave: (task: Task) => void
}

const defaultForm = {
  title: '',
  description: '',
  priority: 'medium' as Priority,
  category: 'personal' as TaskCategory,
  due_date: '',
  estimated_minutes: '',
  tags: '',
}

export function TaskForm({ open, onOpenChange, task, onSave }: TaskFormProps) {
  const [form, setForm] = useState({
    title: task?.title ?? defaultForm.title,
    description: task?.description ?? defaultForm.description,
    priority: task?.priority ?? defaultForm.priority,
    category: task?.category ?? defaultForm.category,
    due_date: task?.due_date ? task.due_date.split('T')[0] : defaultForm.due_date,
    estimated_minutes: task?.estimated_minutes?.toString() ?? defaultForm.estimated_minutes,
    tags: task?.tags?.join(', ') ?? defaultForm.tags,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
        priority: form.priority,
        category: form.category,
        due_date: form.due_date || undefined,
        estimated_minutes: form.estimated_minutes ? parseInt(form.estimated_minutes) : undefined,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      }
      const url = task ? `/api/tasks/${task.id}` : '/api/tasks'
      const method = task ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Error al guardar la tarea')
      const data = await res.json()
      onSave(data.task)
      onOpenChange(false)
      if (!task) {
        setForm({ ...defaultForm })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? 'Editar tarea' : 'Nueva tarea'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Título *</label>
            <Input
              placeholder="¿Qué hay que hacer?"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Descripción</label>
            <Textarea
              placeholder="Detalles adicionales..."
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Prioridad</label>
              <Select value={form.priority} onValueChange={v => set('priority', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">🔴 Urgente</SelectItem>
                  <SelectItem value="high">🟠 Alta</SelectItem>
                  <SelectItem value="medium">🟡 Media</SelectItem>
                  <SelectItem value="low">🟢 Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Categoría</label>
              <Select value={form.category} onValueChange={v => set('category', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="work">💼 Trabajo</SelectItem>
                  <SelectItem value="business">📊 Negocios</SelectItem>
                  <SelectItem value="personal">🏠 Personal</SelectItem>
                  <SelectItem value="health">💪 Salud</SelectItem>
                  <SelectItem value="learning">📚 Aprendizaje</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Fecha límite</label>
              <Input
                type="date"
                value={form.due_date}
                onChange={e => set('due_date', e.target.value)}
                className="[color-scheme:dark]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Tiempo estimado (min)</label>
              <Input
                type="number"
                placeholder="30"
                min={1}
                value={form.estimated_minutes}
                onChange={e => set('estimated_minutes', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Etiquetas (separadas por coma)</label>
            <Input
              placeholder="urgente, cliente, propuesta..."
              value={form.tags}
              onChange={e => set('tags', e.target.value)}
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : task ? 'Guardar cambios' : 'Crear tarea'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
