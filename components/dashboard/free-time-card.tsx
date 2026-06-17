'use client'

import { Clock, Coffee } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function FreeTimeCard() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-teal-400" />
          <CardTitle>Tiempo libre disponible</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <p className="text-3xl font-bold text-zinc-100">—</p>
            <p className="text-xs text-zinc-500 mt-0.5">horas disponibles hoy</p>
          </div>
          <div className="rounded-xl bg-teal-500/10 border border-teal-500/20 p-3">
            <Coffee className="h-6 w-6 text-teal-400" />
          </div>
        </div>
        <p className="text-xs text-zinc-500 mt-3">
          Conecta Google Calendar para calcular tu tiempo libre real basado en tus eventos.
        </p>
      </CardContent>
    </Card>
  )
}
