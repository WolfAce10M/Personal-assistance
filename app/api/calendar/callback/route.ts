import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOAuthClient } from '@/lib/google-calendar/client'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/calendar?error=no_code', req.url))
  }

  try {
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || new URL(req.url).host
    const proto = req.headers.get('x-forwarded-proto') || 'https'
    const redirectUri = `${proto}://${host}/api/calendar/callback`
    const oauth2Client = getOAuthClient(redirectUri)
    const { tokens } = await oauth2Client.getToken(code)

    const supabase = await createClient()
    const { data: existing } = await supabase.from('profiles').select('id').maybeSingle()

    if (existing) {
      await supabase.from('profiles').update({ google_tokens: tokens }).eq('id', existing.id)
    } else {
      await supabase.from('profiles').insert({
        email: 'user@pos.app',
        google_tokens: tokens,
      })
    }

    return NextResponse.redirect(new URL('/calendar?connected=true', req.url))
  } catch (err) {
    console.error('OAuth callback error:', err)
    return NextResponse.redirect(new URL('/calendar?error=oauth_failed', req.url))
  }
}
