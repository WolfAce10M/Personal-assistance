import { createElement } from 'react'
import {
  Bot,
  Building2,
  Calculator,
  CandlestickChart,
  Clapperboard,
  Cog,
  Globe,
  Handshake,
  Landmark,
  Megaphone,
  PenTool,
  Rocket,
  Scale,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

const ICONS: Record<string, LucideIcon> = {
  bot: Bot,
  'building-2': Building2,
  calculator: Calculator,
  'candlestick-chart': CandlestickChart,
  clapperboard: Clapperboard,
  cog: Cog,
  globe: Globe,
  handshake: Handshake,
  landmark: Landmark,
  megaphone: Megaphone,
  'pen-tool': PenTool,
  rocket: Rocket,
  scale: Scale,
  'settings-2': Settings2,
  'shield-check': ShieldCheck,
  'shopping-cart': ShoppingCart,
  sparkles: Sparkles,
  target: Target,
  'trending-up': TrendingUp,
  users: Users,
  wallet: Wallet,
}

export function agentIcon(icon: string): LucideIcon {
  return ICONS[icon] ?? Bot
}

// Renderiza el icono de un agente sin crear componentes durante el render
export function AgentGlyph({ icon, className }: { icon: string; className?: string }) {
  return createElement(agentIcon(icon), { className })
}

// Tailwind necesita clases estáticas: mapa completo por color de agente
interface ColorClasses {
  bg: string
  text: string
  ring: string
  dot: string
}

const COLORS: Record<string, ColorClasses> = {
  indigo: { bg: 'bg-indigo-600/20', text: 'text-indigo-400', ring: 'ring-indigo-500/40', dot: 'bg-indigo-400' },
  emerald: { bg: 'bg-emerald-600/20', text: 'text-emerald-400', ring: 'ring-emerald-500/40', dot: 'bg-emerald-400' },
  blue: { bg: 'bg-blue-600/20', text: 'text-blue-400', ring: 'ring-blue-500/40', dot: 'bg-blue-400' },
  violet: { bg: 'bg-violet-600/20', text: 'text-violet-400', ring: 'ring-violet-500/40', dot: 'bg-violet-400' },
  cyan: { bg: 'bg-cyan-600/20', text: 'text-cyan-400', ring: 'ring-cyan-500/40', dot: 'bg-cyan-400' },
  teal: { bg: 'bg-teal-600/20', text: 'text-teal-400', ring: 'ring-teal-500/40', dot: 'bg-teal-400' },
  sky: { bg: 'bg-sky-600/20', text: 'text-sky-400', ring: 'ring-sky-500/40', dot: 'bg-sky-400' },
  amber: { bg: 'bg-amber-600/20', text: 'text-amber-400', ring: 'ring-amber-500/40', dot: 'bg-amber-400' },
  yellow: { bg: 'bg-yellow-600/20', text: 'text-yellow-400', ring: 'ring-yellow-500/40', dot: 'bg-yellow-400' },
  rose: { bg: 'bg-rose-600/20', text: 'text-rose-400', ring: 'ring-rose-500/40', dot: 'bg-rose-400' },
  orange: { bg: 'bg-orange-600/20', text: 'text-orange-400', ring: 'ring-orange-500/40', dot: 'bg-orange-400' },
  fuchsia: { bg: 'bg-fuchsia-600/20', text: 'text-fuchsia-400', ring: 'ring-fuchsia-500/40', dot: 'bg-fuchsia-400' },
  lime: { bg: 'bg-lime-600/20', text: 'text-lime-400', ring: 'ring-lime-500/40', dot: 'bg-lime-400' },
  stone: { bg: 'bg-stone-600/20', text: 'text-stone-400', ring: 'ring-stone-500/40', dot: 'bg-stone-400' },
  green: { bg: 'bg-green-600/20', text: 'text-green-400', ring: 'ring-green-500/40', dot: 'bg-green-400' },
  slate: { bg: 'bg-slate-600/20', text: 'text-slate-400', ring: 'ring-slate-500/40', dot: 'bg-slate-400' },
  zinc: { bg: 'bg-zinc-600/20', text: 'text-zinc-400', ring: 'ring-zinc-500/40', dot: 'bg-zinc-400' },
}

export function agentColors(color: string): ColorClasses {
  return COLORS[color] ?? COLORS.zinc
}

// Estado visual de un agente
export const AGENT_STATUS_META: Record<
  string,
  { label: string; dotClass: string; pulse: boolean }
> = {
  idle: { label: 'En espera', dotClass: 'bg-zinc-500', pulse: false },
  thinking: { label: 'Pensando', dotClass: 'bg-violet-400', pulse: true },
  working: { label: 'Trabajando', dotClass: 'bg-indigo-400', pulse: true },
  reviewing: { label: 'Revisando', dotClass: 'bg-amber-400', pulse: true },
  error: { label: 'Error', dotClass: 'bg-red-400', pulse: false },
}
