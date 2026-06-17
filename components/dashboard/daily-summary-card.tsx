'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sun, Moon, Sunset } from 'lucide-react'

export function DailySummaryCard() {
  const [greeting, setGreeting] = useState('')
  const [icon, setIcon] = useState<React.ReactNode>(null)
  const [time, setTime] = useState('')

  useEffect(() => {
    const update = () => {
      const h = new Date().getHours()
      if (h >= 6 && h < 14) {
        setGreeting('Buenos días')
        setIcon(<Sun className="h-4 w-4 text-yellow-400" />)
      } else if (h >= 14 && h < 20) {
        setGreeting('Buenas tardes')
        setIcon(<Sunset className="h-4 w-4 text-orange-400" />)
      } else {
        setGreeting('Buenas noches')
        setIcon(<Moon className="h-4 w-4 text-indigo-400" />)
      }
      setTime(format(new Date(), 'HH:mm'))
    }
    update()
    const id = setInterval(update, 30000)
    return () => clearInterval(id)
  }, [])

  const today = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })

  return (
    <Card className="col-span-1">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle>{greeting}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-zinc-100 tabular-nums">{time}</p>
        <p className="text-sm text-zinc-400 mt-0.5 capitalize">{today}</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { label: 'Tareas', value: '—', color: 'text-blue-400' },
            { label: 'Eventos', value: '—', color: 'text-purple-400' },
            { label: 'Libre', value: '—h', color: 'text-green-400' },
          ].map((s) => (
            <div key={s.label} className="text-center rounded-lg bg-zinc-800/50 py-2">
              <p className={`text-sm font-semibold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-zinc-500">{s.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
