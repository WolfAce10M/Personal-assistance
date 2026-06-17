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
import type { PersonalDevEntry, PersonalDevType } from '@/types'

interface DevFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry?: PersonalDevEntry
  onSave: (entry: PersonalDevEntry) => void
}

const defaultForm = {
  type: 'book' as PersonalDevType,
  title: '',
  description: '',
  notes: '',
}

export function DevForm({ open, onOpenChange, entry, onSave }: DevFormProps) {
  const [form, setForm] = useState({
    type: entry?.type ?? defaultForm.type,
    title: entry?.title ?? defaultForm.title,
    description: entry?.description ?? defaultForm.description,
    notes: entry?.notes ?? defaultForm.notes,
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
        type: form.type,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        notes: form.notes.trim() || undefined,
      }
      const url = entry ? `/api/personal-dev/${entry.id}` : '/api/personal-dev'
      const method = entry ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Error al guardar la actividad')
      const saved: PersonalDevEntry = await res.json()
      onSave(saved)
      onOpenChange(false)
      if (!entry) setForm({ ...defaultForm })
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
          <DialogTitle>{entry ? 'Editar actividad' : 'Añadir actividad'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Tipo</label>
            <Select value={form.type} onValueChange={v => set('type', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="book">📖 Libro</SelectItem>
                <SelectItem value="course">🎓 Curso</SelectItem>
                <SelectItem value="reflection">💭 Reflexión</SelectItem>
                <SelectItem value="learning">🧠 Aprendizaje</SelectItem>
                <SelectItem value="other">✨ Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Título *</label>
            <Input
              placeholder="Nombre del libro, curso o tema..."
              value={form.title}
              onChange={e => set('title', e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Descripción</label>
            <Textarea
              placeholder="¿De qué trata? ¿Por qué lo estás haciendo?"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Notas / Aprendizajes</label>
            <Textarea
              placeholder="Ideas clave, aprendizajes, reflexiones..."
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : entry ? 'Guardar cambios' : 'Añadir actividad'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
