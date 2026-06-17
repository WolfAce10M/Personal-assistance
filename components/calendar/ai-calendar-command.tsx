'use client'

import { useState, useRef } from 'react'
import { Send, Sparkles, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AICalendarCommandProps {
  onCommandResult?: (result: string) => void
}

const SUGGESTIONS = [
  'Mueve la reunión de mañana a las 4pm',
  'Bloquéame 2 horas para trabajo profundo',
  '¿Tengo tiempo libre esta tarde?',
  'Organiza mi mañana con descansos',
]

export function AICalendarCommand({ onCommandResult }: AICalendarCommandProps) {
  const [command, setCommand] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ message: string; success: boolean } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (text: string) => {
    const cmd = text.trim()
    if (!cmd) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/ai/calendar-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd }),
      })
      const data = await res.json()
      const msg = data.message ?? (res.ok ? 'Comando ejecutado correctamente' : 'Error al procesar el comando')
      setResult({ message: msg, success: res.ok })
      onCommandResult?.(msg)
      if (res.ok) setCommand('')
    } catch {
      setResult({ message: 'Error de conexión. Inténtalo de nuevo.', success: false })
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(command)
    }
  }

  return (
    <div className="rounded-xl border border-indigo-500/20 bg-indigo-600/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-indigo-400 flex-shrink-0" />
        <span className="text-sm font-medium text-indigo-300">Asistente de calendario</span>
      </div>

      <div className="flex gap-2">
        <Input
          ref={inputRef}
          placeholder="Escribe un comando en lenguaje natural..."
          value={command}
          onChange={e => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          className="flex-1 bg-zinc-900/50 border-zinc-700 text-sm"
        />
        <Button
          onClick={() => handleSubmit(command)}
          disabled={loading || !command.trim()}
          size="icon"
          className="flex-shrink-0"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Result */}
      {result && (
        <div className={cn(
          'rounded-lg p-3 text-xs',
          result.success
            ? 'bg-green-600/10 border border-green-500/20 text-green-300'
            : 'bg-red-600/10 border border-red-500/20 text-red-300'
        )}>
          {result.message}
        </div>
      )}

      {/* Suggestions */}
      {!loading && !result && (
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              onClick={() => {
                setCommand(s)
                inputRef.current?.focus()
              }}
              className="rounded-full border border-zinc-700 bg-zinc-800/50 px-2.5 py-1 text-xs text-zinc-400 hover:border-indigo-500/50 hover:text-zinc-200 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
