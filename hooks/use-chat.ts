'use client'

import { useState, useCallback, useRef } from 'react'
import { ChatMessage } from '@/types'

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const loadHistory = useCallback(async () => {
    const res = await fetch('/api/ai/chat?limit=50&channel=web')
    const data = await res.json()
    setMessages(data.messages ?? [])
  }, [])

  const sendMessage = useCallback(async (content: string) => {
    const userMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      channel: 'web',
      metadata: {},
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    const placeholderMsg: ChatMessage = {
      id: `placeholder-${Date.now()}`,
      role: 'assistant',
      content: '',
      channel: 'web',
      metadata: {},
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, placeholderMsg])

    try {
      abortRef.current = new AbortController()
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, channel: 'web' }),
        signal: abortRef.current.signal,
      })
      const data = await res.json()

      const assistantMsg: ChatMessage = {
        id: data.message?.id ?? `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        channel: 'web',
        metadata: {},
        created_at: new Date().toISOString(),
      }

      setMessages((prev) => {
        const withoutPlaceholder = prev.filter((m) => !m.id.startsWith('placeholder-'))
        return [...withoutPlaceholder, assistantMsg]
      })
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setMessages((prev) => {
          const withoutPlaceholder = prev.filter((m) => !m.id.startsWith('placeholder-'))
          return [...withoutPlaceholder, {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: 'Lo siento, ocurrió un error. Por favor intenta de nuevo.',
            channel: 'web',
            metadata: {},
            created_at: new Date().toISOString(),
          }]
        })
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const clearHistory = () => setMessages([])

  return { messages, loading, sendMessage, loadHistory, clearHistory }
}
