'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Send, Wifi, WifiOff } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ChatInterface } from '@/components/assistant/chat-interface'
import { VoiceInput } from '@/components/assistant/voice-input'
import type { ChatMessage } from '@/types'

const QUICK_ACTIONS = [
  'Organízame mañana',
  '¿Qué tengo hoy?',
  'Apunta una tarea',
  'Recuérdame algo',
  '¿En qué debería enfocarme?',
  'Resumen semanal',
]

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [isConnected, setIsConnected] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/chat?limit=50&channel=web')
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages ?? [])
      }
    } catch {
      setIsConnected(false)
    }
  }, [])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  const sendMessage = async (text: string) => {
    const msg = text.trim()
    if (!msg || isLoading) return

    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: msg,
      channel: 'web',
      metadata: {},
      created_at: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setStreamingContent('')

    try {
      // Try streaming first
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, channel: 'web' }),
      })

      if (!res.ok) throw new Error('Error al enviar mensaje')

      const contentType = res.headers.get('content-type') ?? ''

      if (contentType.includes('text/event-stream') || contentType.includes('text/plain')) {
        // Streaming response
        const reader = res.body?.getReader()
        const decoder = new TextDecoder()
        let accumulated = ''

        if (reader) {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            const chunk = decoder.decode(value, { stream: true })
            // Handle SSE format
            const lines = chunk.split('\n')
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') break
                try {
                  const parsed = JSON.parse(data)
                  const content = parsed.choices?.[0]?.delta?.content ?? parsed.content ?? ''
                  accumulated += content
                  setStreamingContent(accumulated)
                } catch {
                  accumulated += data
                  setStreamingContent(accumulated)
                }
              }
            }
          }
        }

        if (accumulated) {
          const assistantMessage: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: accumulated,
            channel: 'web',
            metadata: {},
            created_at: new Date().toISOString(),
          }
          setMessages(prev => [...prev.filter(m => m.id !== userMessage.id), userMessage, assistantMessage])
        }
      } else {
        // Regular JSON response
        const data = await res.json()
        const assistantMessage: ChatMessage = {
          id: data.id ?? `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.reply ?? data.content ?? 'Lo siento, no pude procesar tu mensaje.',
          channel: 'web',
          metadata: data.metadata ?? {},
          created_at: data.created_at ?? new Date().toISOString(),
        }
        setMessages(prev => [...prev.filter(m => m.id !== userMessage.id), userMessage, assistantMessage])
      }

      setIsConnected(true)
    } catch {
      setIsConnected(false)
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor, inténtalo de nuevo.',
        channel: 'web',
        metadata: {},
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev.filter(m => m.id !== userMessage.id), userMessage, errorMessage])
    } finally {
      setIsLoading(false)
      setStreamingContent('')
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleVoiceTranscript = (text: string) => {
    setInput(prev => prev ? `${prev} ${text}` : text)
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Asistente IA"
        subtitle="Tu copiloto personal"
        actions={
          <Badge variant={isConnected ? 'success' : 'destructive'} className="gap-1">
            {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isConnected ? 'Conectado' : 'Sin conexión'}
          </Badge>
        }
      />

      {/* Chat area */}
      <ChatInterface
        messages={messages}
        isLoading={isLoading}
        streamingContent={streamingContent}
      />

      {/* Quick actions */}
      <div className="px-4 pb-2">
        <div className="flex flex-wrap gap-1.5">
          {QUICK_ACTIONS.map(action => (
            <button
              key={action}
              onClick={() => sendMessage(action)}
              disabled={isLoading}
              className="rounded-full border border-zinc-700 bg-zinc-800/50 px-3 py-1 text-xs text-zinc-400 hover:border-indigo-500/50 hover:text-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {action}
            </button>
          ))}
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-zinc-800 p-4">
        <div className="flex items-center gap-2">
          <VoiceInput onTranscript={handleVoiceTranscript} disabled={isLoading} />
          <Input
            ref={inputRef}
            placeholder="Escribe tu mensaje..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={isLoading || !input.trim()}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-zinc-600 text-center mt-2">
          Canal: web · Presiona Enter para enviar
        </p>
      </div>
    </div>
  )
}
