import { NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/google-calendar/client'

export async function GET() {
  const url = getAuthUrl()
  return NextResponse.json({ url })
}
