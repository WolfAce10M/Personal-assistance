'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Bell, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: es })

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md px-4 md:px-6 h-14 gap-2">
      <div className="min-w-0 flex-1">
        <h1 className="text-sm font-semibold text-zinc-100 truncate">{title}</h1>
        {subtitle && <p className="text-xs text-zinc-500 capitalize truncate">{subtitle || today}</p>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {actions}
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500" />
        </Button>
        <Link href="/settings" className="md:hidden">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </header>
  )
}
