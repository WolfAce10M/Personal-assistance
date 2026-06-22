'use client'

import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { ChatInterface } from '@/components/assistant/chat-interface'
import { VoiceInput } from '@/components/assistant/voice-input'
import { useChat } from '@/hooks/use-chat'

const QUICK_ACTIONS = [
  'Organízame el día',
  '¿Qué tengo hoy?',
  'Apunta una tarea',
  '¿En qué enfocarme?',
  'Resumen semanal',
]

export default function AssistantPage() {
  const { messages, loading, sendMessage, loadHistory } = useChat()
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')
    await sendMessage(msg)
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Asistente IA" subtitle="Tu copiloto personal" />

      <ChatInterface messages={messages} isLoading={loading} />

      {/* Quick actions */}
      <div className="px-4 pb-2">
        <div className="flex flex-wrap gap-1.5">
          {QUICK_ACTIONS.map(action => (
            <button
              key={action}
              onClick={() => handleSend(action)}
              disabled={loading}
              className="rounded-full border border-zinc-700 bg-zinc-800/50 px-3 py-1 text-xs text-zinc-400 hover:border-indigo-500/50 hover:text-zinc-200 transition-colors disabled:opacity-50"
            >
              {action}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800 p-4">
        <div className="flex items-center gap-2">
          <VoiceInput onTranscript={(t) => setInput(prev => prev ? `${prev} ${t}` : t)} disabled={loading} />
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Escribe tu mensaje..."
            disabled={loading}
            className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
          />
          <Button onClick={() => handleSend()} disabled={loading || !input.trim()} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
