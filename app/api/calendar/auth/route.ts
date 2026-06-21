import { NextRequest, NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/google-calendar/client'

export async function GET(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || new URL(req.url).host
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  const redirectUri = `${proto}://${host}/api/calendar/callback`
  const url = getAuthUrl(redirectUri)
  // Return both the URL and redirect so frontend can use either approach
  return NextResponse.json({ url, redirectUri })
}
