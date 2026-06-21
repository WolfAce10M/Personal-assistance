import { NextRequest, NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/google-calendar/client'

export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin
  const redirectUri = `${origin}/api/calendar/callback`
  const url = getAuthUrl(redirectUri)
  return NextResponse.json({ url })
}
