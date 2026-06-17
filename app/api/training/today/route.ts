import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'

export async function GET() {
  const supabase = await createClient()
  const today = format(new Date(), 'yyyy-MM-dd')

  const { data, error } = await supabase
    .from('training_sessions')
    .select('*')
    .eq('scheduled_date', today)
    .neq('status', 'skipped')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ session: data })
}
