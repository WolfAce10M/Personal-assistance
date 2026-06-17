'use client'

import { useEffect, useState } from 'react'
import { BookOpen, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { PersonalDevEntry } from '@/types'

const typeEmoji: Record<string, string> = {
  book: '📖',
  course: '🎓',
  reflection: '🧘',
  learning: '💡',
  other: '✨',
}

export function PersonalDevCard() {
  const [entries, setEntries] = useState<PersonalDevEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/personal-dev?status=active&limit=3')
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-cyan-400" />
            <CardTitle>Desarrollo personal</CardTitle>
          </div>
          <a href="/personal-dev" className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1">
            Ver todo <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-12 rounded-lg bg-zinc-800 animate-pulse" />)}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-zinc-500">Sin actividades activas</p>
            <a href="/personal-dev" className="text-xs text-indigo-400 hover:underline mt-1 block">
              Añadir libro o curso →
            </a>
          </div>
        ) : (
          <ul className="space-y-3">
            {entries.map((entry) => (
              <li key={entry.id} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">{typeEmoji[entry.type]}</span>
                  <p className="text-sm text-zinc-100 truncate flex-1">{entry.title}</p>
                  <span className="text-xs text-zinc-400">{entry.progress}%</span>
                </div>
                <Progress value={entry.progress} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
