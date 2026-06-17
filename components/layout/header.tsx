'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: es })

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md px-4 md:px-6 h-14">
      <div>
        <h1 className="text-sm font-semibold text-zinc-100">{title}</h1>
        {subtitle && <p className="text-xs text-zinc-500 capitalize">{subtitle || today}</p>}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500" />
        </Button>
      </div>
    </header>
  )
}
