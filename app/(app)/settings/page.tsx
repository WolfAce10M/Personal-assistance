'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Calendar, Bot, Zap, MessageSquare, Shield,
  ExternalLink, CheckCircle2, AlertCircle
} from 'lucide-react'

const autonomyDescriptions = [
  { level: 1, label: 'Solo sugerencias', description: 'La IA solo sugiere. Tú decides todo.' },
  { level: 2, label: 'Semi-automático', description: 'Puede crear tareas y bloques de tiempo.' },
  { level: 3, label: 'Automático', description: 'Reorganiza automáticamente elementos no protegidos.' },
  { level: 4, label: 'Avanzado', description: 'Ejecuta acciones avanzadas definidas por ti.' },
]

export default function SettingsPage() {
  const [autonomyLevel, setAutonomyLevel] = useState(1)
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [telegramChatId, setTelegramChatId] = useState('')
  const [saving, setSaving] = useState(false)

  const saveTelegramChatId = async () => {
    setSaving(true)
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegram_chat_id: telegramChatId }),
    })
    setSaving(false)
  }

  const saveAutonomyLevel = async () => {
    setSaving(true)
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autonomy_level: autonomyLevel }),
    })
    setSaving(false)
    alert('Nivel de autonomía guardado')
  }

  const connectCalendar = async () => {
    const res = await fetch('/api/calendar/auth')
    const { url } = await res.json()
    window.location.href = url
  }

  const setupTelegramWebhook = async () => {
    const res = await fetch('/api/telegram?setup=webhook')
    const data = await res.json()
    if (data.ok) alert('Webhook de Telegram configurado correctamente')
  }

  const sendTestBriefing = async () => {
    setSaving(true)
    await fetch('/api/telegram/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'briefing' }),
    })
    setSaving(false)
    alert('Briefing enviado')
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Ajustes" />
      <div className="flex-1 p-4 md:p-6 max-w-2xl mx-auto w-full space-y-6">

        {/* Google Calendar */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <CardTitle>Google Calendar</CardTitle>
                <CardDescription>Integra tu calendario para eventos inteligentes</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {calendarConnected ? (
                <div className="flex items-center gap-2 text-sm text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Conectado
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <AlertCircle className="h-4 w-4" />
                  No conectado
                </div>
              )}
              <Button onClick={connectCalendar} variant={calendarConnected ? 'outline' : 'default'} className="w-full sm:w-auto">
                <ExternalLink className="h-4 w-4 mr-2" />
                {calendarConnected ? 'Reconectar' : 'Conectar Google Calendar'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Telegram */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-cyan-600/20 flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-cyan-400" />
              </div>
              <div>
                <CardTitle>Telegram</CardTitle>
                <CardDescription>Recibe recordatorios y chatea via Telegram</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Tu Chat ID de Telegram</label>
              <div className="flex gap-2">
                <Input
                  placeholder="123456789"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                />
                <Button variant="outline" size="sm" onClick={saveTelegramChatId} disabled={saving}>Guardar</Button>
              </div>
              <p className="text-xs text-zinc-600 mt-1.5">
                Obtén tu Chat ID enviando /start a @userinfobot en Telegram
              </p>
            </div>
            <Separator />
            <div className="flex flex-col gap-2">
              <div>
                <p className="text-sm font-medium text-zinc-100">Webhook del bot</p>
                <p className="text-xs text-zinc-500">Configura para recibir mensajes</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" size="sm" onClick={setupTelegramWebhook} className="w-full sm:w-auto">
                  Configurar webhook
                </Button>
                <Button variant="outline" size="sm" onClick={sendTestBriefing} disabled={saving} className="w-full sm:w-auto">
                  Enviar briefing test
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Autonomy Level */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-violet-600/20 flex items-center justify-center">
                <Zap className="h-4 w-4 text-violet-400" />
              </div>
              <div>
                <CardTitle>Nivel de Autonomía de IA</CardTitle>
                <CardDescription>Controla cuánto puede hacer la IA automáticamente</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {autonomyDescriptions.map((a) => (
                <button
                  key={a.level}
                  onClick={() => setAutonomyLevel(a.level)}
                  className={`text-left rounded-lg border p-3 transition-all ${
                    autonomyLevel === a.level
                      ? 'border-indigo-500 bg-indigo-600/10'
                      : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={autonomyLevel === a.level ? 'default' : 'secondary'} className="text-xs">
                      Nivel {a.level}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-zinc-100">{a.label}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{a.description}</p>
                </button>
              ))}
            </div>
            <Button className="w-full mt-4" onClick={saveAutonomyLevel} disabled={saving}>Guardar nivel de autonomía</Button>
          </CardContent>
        </Card>

        {/* AI Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-indigo-600/20 flex items-center justify-center">
                <Bot className="h-4 w-4 text-indigo-400" />
              </div>
              <div>
                <CardTitle>Asistente IA</CardTitle>
                <CardDescription>Configura el comportamiento del asistente</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              'Recordatorios automáticos por Telegram',
              'Briefing diario al despertar',
              'Alertas de tareas vencidas',
              'Sugerencias de entrenamiento',
            ].map((setting) => (
              <div key={setting} className="flex items-center justify-between">
                <span className="text-sm text-zinc-300">{setting}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-9 h-5 bg-zinc-700 rounded-full peer peer-checked:bg-indigo-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                </label>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Protected Events */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-amber-600/20 flex items-center justify-center">
                <Shield className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <CardTitle>Eventos protegidos</CardTitle>
                <CardDescription>La IA nunca moverá eventos protegidos</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-400">
              Marca eventos en el Calendario como protegidos para que la IA nunca los mueva automáticamente.
              Los eventos protegidos se identifican con un ícono de candado (🔒).
            </p>
            <Button variant="outline" className="mt-3 w-full" asChild>
              <a href="/calendar">Gestionar eventos protegidos</a>
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
