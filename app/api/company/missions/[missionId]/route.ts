import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Detalle de una misión con sus trabajos y agentes
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ missionId: string }> }
) {
  const { missionId } = await params
  const supabase = await createClient()

  const [missionRes, jobsRes] = await Promise.all([
    supabase.from('missions').select('*').eq('id', missionId).single(),
    supabase
      .from('agent_jobs')
      .select('*, agent:agents(id, name, specialty, icon, color, role)')
      .eq('mission_id', missionId)
      .order('phase')
      .order('created_at'),
  ])

  if (missionRes.error || !missionRes.data) {
    return NextResponse.json({ error: 'Misión no encontrada' }, { status: 404 })
  }

  return NextResponse.json({ mission: { ...missionRes.data, jobs: jobsRes.data ?? [] } })
}

// Cancelar una misión en curso
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ missionId: string }> }
) {
  const { missionId } = await params
  const supabase = await createClient()

  const { data: mission } = await supabase
    .from('missions')
    .select('id, company_id, status')
    .eq('id', missionId)
    .single()
  if (!mission) return NextResponse.json({ error: 'Misión no encontrada' }, { status: 404 })

  if (mission.status === 'planning' || mission.status === 'running') {
    await supabase
      .from('missions')
      .update({ status: 'cancelled', completed_at: new Date().toISOString() })
      .eq('id', missionId)
    await supabase
      .from('agents')
      .update({ status: 'idle', current_job_id: null })
      .eq('company_id', mission.company_id)
    await supabase
      .from('agent_jobs')
      .update({ status: 'failed', review_notes: 'Misión cancelada por el usuario' })
      .eq('mission_id', missionId)
      .in('status', ['queued', 'running', 'reviewing', 'revision'])
  }

  return NextResponse.json({ ok: true })
}
