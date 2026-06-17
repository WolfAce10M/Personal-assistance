'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface VoiceInputProps {
  onTranscript: (text: string) => void
  disabled?: boolean
}

// Extend window for SpeechRecognition browser APIs
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition
    webkitSpeechRecognition?: new () => SpeechRecognition
  }
}

interface SpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  readonly length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean
  readonly length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  readonly transcript: string
  readonly confidence: number
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string
  readonly message: string
}

export function VoiceInput({ onTranscript, disabled }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [interim, setInterim] = useState('')
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition ?? window.webkitSpeechRecognition
    setIsSupported(!!SpeechRecognitionAPI)
  }, [])

  const startRecording = useCallback(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!SpeechRecognitionAPI) return

    const recognition = new SpeechRecognitionAPI()
    recognition.lang = 'es-ES'
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimText = ''
      let finalText = ''
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalText += result[0].transcript
        } else {
          interimText += result[0].transcript
        }
      }
      setInterim(interimText)
      if (finalText) {
        onTranscript(finalText.trim())
        setInterim('')
      }
    }

    recognition.onerror = () => {
      setIsRecording(false)
      setInterim('')
    }

    recognition.onend = () => {
      setIsRecording(false)
      setInterim('')
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }, [onTranscript])

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop()
    setIsRecording(false)
    setInterim('')
  }, [])

  const handleClick = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  if (!isSupported) return null

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleClick}
        disabled={disabled}
        className={cn(
          'h-9 w-9 relative transition-colors',
          isRecording && 'text-red-400 hover:text-red-300'
        )}
        title={isRecording ? 'Detener grabación' : 'Iniciar grabación de voz'}
      >
        {isRecording ? (
          <>
            <span className="absolute inset-0 rounded-lg bg-red-500/10 animate-ping opacity-75" />
            <MicOff className="h-4 w-4 relative z-10" />
          </>
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>
      {interim && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-xs text-zinc-400 text-center shadow-xl">
          {interim}...
        </div>
      )}
    </div>
  )
}
