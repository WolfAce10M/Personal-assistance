'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Sparkles } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { DevEntryCard } from '@/components/personal-dev/dev-entry-card'
import { DevForm } from '@/components/personal-dev/dev-form'
import type { PersonalDevEntry, PersonalDevType } from '@/types'

const TABS: { key: string; label: string; filter: (e: PersonalDevEntry) => boolean }[] = [
  { key: 'active', label: 'Activo', filter: e => e.status === 'active' },
  { key: 'books', label: 'Libros', filter: e => e.type === 'book' },
  { key: 'courses', label: 'Cursos', filter: e => e.type === 'course' },
  { key: 'reflections', label: 'Reflexiones', filter: e => e.type === 'reflection' },
  { key: 'completed', label: 'Completado', filter: e => e.status === 'completed' },
]

export default function PersonalDevPage() {
  const [entries, setEntries] = useState<PersonalDevEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [suggestion, setSuggestion] = useState('')
  const [loadingSuggestion, setLoadingSuggestion] = useState(false)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/personal-dev')
      if (res.ok) {
        const data = await res.json()
        setEntries(data.entries ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSuggestion = useCallback(async () => {
    setLoadingSuggestion(true)
    try {
      const res = await fetch('/api/ai/dev-suggestion')
      if (res.ok) {
        const data = await res.json()
        setSuggestion(data.suggestion)
      }
    } finally {
      setLoadingSuggestion(false)
    }
  }, [])

  useEffect(() => {
    fetchEntries()
    fetchSuggestion()
  }, [fetchEntries, fetchSuggestion])

  const handleSave = (entry: PersonalDevEntry) => {
    setEntries(prev => {
      const idx = prev.findIndex(e => e.id === entry.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = entry
        return next
      }
      return [entry, ...prev]
    })
  }

  const handleDelete = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  const countForTab = (tab: typeof TABS[0]) => entries.filter(tab.filter).length

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Desarrollo Personal"
        subtitle="Libros, cursos y reflexiones"
        actions={
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Añadir actividad
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">
        {/* Daily Suggestion */}
        <Card className="border-indigo-500/20 bg-indigo-600/5">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="text-xs font-medium text-indigo-400">Sugerencia del día</span>
                </div>
                {loadingSuggestion ? (
                  <div className="h-4 bg-zinc-800/50 animate-pulse rounded w-3/4" />
                ) : suggestion ? (
                  <p className="text-sm text-zinc-300">{suggestion}</p>
                ) : (
                  <p className="text-sm text-zinc-500">
                    Dedica al menos 20 minutos hoy a tu desarrollo personal. ¡Pequeños pasos, grandes resultados!
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs flex-shrink-0"
                onClick={fetchSuggestion}
                disabled={loadingSuggestion}
              >
                Renovar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="active">
          <TabsList className="w-full justify-start overflow-x-auto">
            {TABS.map(tab => (
              <TabsTrigger key={tab.key} value={tab.key} className="gap-1.5">
                {tab.label}
                <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
                  {countForTab(tab)}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {TABS.map(tab => {
            const tabEntries = entries.filter(tab.filter)
            return (
              <TabsContent key={tab.key} value={tab.key}>
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-36 rounded-xl bg-zinc-800/50 animate-pulse" />
                    ))}
                  </div>
                ) : tabEntries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="text-4xl mb-3">
                      {tab.key === 'books' ? '📖' : tab.key === 'courses' ? '🎓' : tab.key === 'reflections' ? '💭' : '🌱'}
                    </div>
                    <p className="text-sm font-medium text-zinc-400">
                      No hay entradas en {tab.label.toLowerCase()}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => setFormOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Añadir actividad
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    {tabEntries.map(entry => (
                      <DevEntryCard
                        key={entry.id}
                        entry={entry}
                        onUpdate={handleSave}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            )
          })}
        </Tabs>
      </div>

      <DevForm open={formOpen} onOpenChange={setFormOpen} onSave={handleSave} />
    </div>
  )
}
