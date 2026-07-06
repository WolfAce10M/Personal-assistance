'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Dumbbell,
  BookOpen,
  Target,
  MessageSquare,
  Building2,
  Settings,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/tasks', icon: CheckSquare, label: 'Tareas' },
  { href: '/calendar', icon: Calendar, label: 'Calendario' },
  { href: '/training', icon: Dumbbell, label: 'Entrenamiento' },
  { href: '/personal-dev', icon: BookOpen, label: 'Desarrollo' },
  { href: '/goals', icon: Target, label: 'Objetivos' },
  { href: '/assistant', icon: MessageSquare, label: 'Asistente' },
  { href: '/company', icon: Building2, label: 'Empresa' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-56 flex-col border-r border-zinc-800 bg-zinc-950 z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-zinc-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 shrink-0">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-100">POS</p>
          <p className="text-xs text-zinc-500">Personal OS</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-1">
          {nav.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href))
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-indigo-600/15 text-indigo-400'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Settings */}
      <div className="border-t border-zinc-800 p-2">
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
        >
          <Settings className="h-4 w-4 shrink-0" />
          <span>Ajustes</span>
        </Link>
      </div>
    </aside>
  )
}
