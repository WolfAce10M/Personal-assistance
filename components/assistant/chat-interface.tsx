'use client'

import { useEffect, useRef } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Bot, User, Loader2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/types'

interface ChatInterfaceProps {
  messages: ChatMessage[]
  isLoading?: boolean
  streamingContent?: string
}

export function ChatInterface({ messages, isLoading, streamingContent }: ChatInterfaceProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent, isLoading])

  const formatMessageTime = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'HH:mm', { locale: es })
    } catch {
      return ''
    }
  }

  return (
    <ScrollArea className="flex-1 px-4 py-2">
      <div className="space-y-4 pb-4">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600/20 mb-4">
              <Bot className="h-7 w-7 text-indigo-400" />
            </div>
            <p className="text-sm font-medium text-zinc-300">Tu asistente personal</p>
            <p className="text-xs text-zinc-500 mt-1 max-w-xs">
              Hola! Soy tu asistente IA. Puedo ayudarte a organizar tu día, apuntar tareas, consultar tu agenda y mucho más.
            </p>
          </div>
        )}

        {messages.map(message => (
          <div
            key={message.id}
            className={cn(
              'flex gap-3',
              message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            )}
          >
            {/* Avatar */}
            <div
              className={cn(
                'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
                message.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-800 text-zinc-300'
              )}
            >
              {message.role === 'user' ? (
                <User className="h-4 w-4" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
            </div>

            {/* Bubble */}
            <div
              className={cn(
                'max-w-[75%] rounded-2xl px-4 py-2.5',
                message.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-sm'
                  : 'bg-zinc-800 text-zinc-100 rounded-tl-sm'
              )}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
              <p
                className={cn(
                  'text-xs mt-1',
                  message.role === 'user' ? 'text-indigo-200' : 'text-zinc-500'
                )}
              >
                {formatMessageTime(message.created_at)}
                {message.channel && message.channel !== 'web' && (
                  <span className="ml-1">· {message.channel}</span>
                )}
              </p>
            </div>
          </div>
        ))}

        {/* Streaming response */}
        {streamingContent && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-300">
              <Bot className="h-4 w-4" />
            </div>
            <div className="max-w-[75%] rounded-2xl rounded-tl-sm bg-zinc-800 px-4 py-2.5">
              <p className="text-sm whitespace-pre-wrap leading-relaxed text-zinc-100">
                {streamingContent}
                <span className="inline-block w-1.5 h-4 bg-indigo-400 ml-0.5 animate-pulse rounded-sm" />
              </p>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && !streamingContent && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-300">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-zinc-800 px-4 py-3">
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  )
}
