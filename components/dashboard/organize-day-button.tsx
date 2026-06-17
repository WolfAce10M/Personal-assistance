'use client'

import { Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface OrganizeDayButtonProps {
  onClick: () => void
  isLoading: boolean
}

export function OrganizeDayButton({ onClick, isLoading }: OrganizeDayButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={isLoading}
      size="lg"
      className="gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/20 border-0 font-semibold"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Organizando...
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          Organízame el día
        </>
      )}
    </Button>
  )
}
