import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isToday, isTomorrow, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, pattern = 'PPP') {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, pattern, { locale: es })
}

export function formatTime(date: string | Date) {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'HH:mm')
}

export function formatRelative(date: string | Date) {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (isToday(d)) return `Hoy a las ${format(d, 'HH:mm')}`
  if (isTomorrow(d)) return `Mañana a las ${format(d, 'HH:mm')}`
  return formatDistanceToNow(d, { addSuffix: true, locale: es })
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export const priorityConfig = {
  urgent: { label: 'Urgente', color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20' },
  high: { label: 'Alta', color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20' },
  medium: { label: 'Media', color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  low: { label: 'Baja', color: 'text-green-500', bg: 'bg-green-500/10 border-green-500/20' },
}

export const statusConfig = {
  pending: { label: 'Pendiente', color: 'text-zinc-400' },
  in_progress: { label: 'En progreso', color: 'text-blue-400' },
  completed: { label: 'Completada', color: 'text-green-400' },
  blocked: { label: 'Bloqueada', color: 'text-red-400' },
  cancelled: { label: 'Cancelada', color: 'text-zinc-600' },
}

export const categoryConfig = {
  work: { label: 'Trabajo', emoji: '💼' },
  business: { label: 'Negocios', emoji: '📊' },
  personal: { label: 'Personal', emoji: '🏠' },
  health: { label: 'Salud', emoji: '💪' },
  learning: { label: 'Aprendizaje', emoji: '📚' },
}

export const goalTypeConfig = {
  annual: { label: 'Anual', color: 'text-purple-400' },
  quarterly: { label: 'Trimestral', color: 'text-blue-400' },
  monthly: { label: 'Mensual', color: 'text-cyan-400' },
  weekly: { label: 'Semanal', color: 'text-green-400' },
}
