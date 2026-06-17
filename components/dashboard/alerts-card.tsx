'use client'

import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const sampleAlerts = [
  { type: 'warning', message: 'Tienes 3 tareas con fecha límite hoy' },
  { type: 'info', message: 'No has registrado entrenamiento en 3 días' },
]

export function AlertsCard() {
  const alerts = sampleAlerts

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <CardTitle>Alertas</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="flex items-center gap-3 py-3">
            <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
            <p className="text-sm text-zinc-400">Todo en orden. Sin alertas.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {alerts.map((alert, i) => (
              <li key={i} className={`flex items-start gap-2.5 rounded-lg px-3 py-2 ${
                alert.type === 'warning'
                  ? 'bg-amber-500/10 border border-amber-500/20'
                  : 'bg-blue-500/10 border border-blue-500/20'
              }`}>
                <AlertTriangle className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${
                  alert.type === 'warning' ? 'text-amber-400' : 'text-blue-400'
                }`} />
                <p className="text-xs text-zinc-300">{alert.message}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
