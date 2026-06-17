'use client'

import { useState } from 'react'
import { Plus, Trash2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Exercise } from '@/types'

interface ExerciseLogProps {
  sessionId: string
  exercises: Exercise[]
  onSave: (exercises: Exercise[]) => void
}

const emptyExercise = (): Exercise => ({
  name: '',
  sets: undefined,
  reps: '',
  weight: '',
  duration_minutes: undefined,
  notes: '',
})

export function ExerciseLog({ sessionId, exercises: initial, onSave }: ExerciseLogProps) {
  const [exercises, setExercises] = useState<Exercise[]>(
    initial.length > 0 ? initial : [emptyExercise()]
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const updateExercise = (index: number, field: keyof Exercise, value: string | number | undefined) => {
    setExercises(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
    setSaved(false)
  }

  const addExercise = () => {
    setExercises(prev => [...prev, emptyExercise()])
  }

  const removeExercise = (index: number) => {
    setExercises(prev => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const valid = exercises.filter(e => e.name.trim())
      const res = await fetch(`/api/training/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exercises: valid }),
      })
      if (res.ok) {
        onSave(valid)
        setSaved(true)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Registro de ejercicios</CardTitle>
          <div className="flex items-center gap-2">
            {saved && <span className="text-xs text-green-400">Guardado</span>}
            <Button size="sm" variant="ghost" onClick={addExercise} className="h-7 text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Añadir
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {exercises.map((ex, i) => (
          <div key={i} className="rounded-lg border border-zinc-800 p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Nombre del ejercicio *"
                value={ex.name}
                onChange={e => updateExercise(i, 'name', e.target.value)}
                className="flex-1 h-8 text-xs"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0 text-red-400 hover:text-red-300"
                onClick={() => removeExercise(i)}
                disabled={exercises.length === 1}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-zinc-500">Series</label>
                <Input
                  type="number"
                  placeholder="3"
                  min={1}
                  value={ex.sets ?? ''}
                  onChange={e => updateExercise(i, 'sets', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-zinc-500">Reps</label>
                <Input
                  placeholder="8-12"
                  value={ex.reps ?? ''}
                  onChange={e => updateExercise(i, 'reps', e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-zinc-500">Peso</label>
                <Input
                  placeholder="60kg"
                  value={ex.weight ?? ''}
                  onChange={e => updateExercise(i, 'weight', e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-zinc-500">Duración (min)</label>
                <Input
                  type="number"
                  placeholder="20"
                  min={1}
                  value={ex.duration_minutes ?? ''}
                  onChange={e => updateExercise(i, 'duration_minutes', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-zinc-500">Notas</label>
                <Input
                  placeholder="Observaciones..."
                  value={ex.notes ?? ''}
                  onChange={e => updateExercise(i, 'notes', e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>
        ))}

        <Button
          className="w-full"
          onClick={handleSave}
          disabled={saving || exercises.every(e => !e.name.trim())}
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Guardando...' : 'Guardar ejercicios'}
        </Button>
      </CardContent>
    </Card>
  )
}
