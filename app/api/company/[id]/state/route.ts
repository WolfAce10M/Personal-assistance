import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const AGENT_FIELDS = 'id, name, specialty, icon, color, role'

// Estado completo de la empresa en una sola llamada (para polling en vivo)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const since = searchParams.get('since')

  const [companyRes, agentsRes, missionsRes] = await Promise.all([
    supabase.from('companies').select('*').eq('id', id).single(),
    supabase
      .from('agents')
      .select('*')
      .eq('company_id', id)
      .eq('is_active', true)
      .order('sort_order')
      .order('created_at'),
    supabase
      .from('missions')
      .select('*')
      .eq('company_id', id)
      .order('created_at', { ascending: false })
      .limit(15),
  ])

  if (companyRes.error || !companyRes.data) {
    return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })
  }

  const missions = missionsRes.data ?? []
  const activeMission = missions.find(m => m.status === 'planning' || m.status === 'running') ?? null

  let activityQuery = supabase
    .from('agent_activities')
    .select(`*, agent:agents(${AGENT_FIELDS})`)
    .eq('company_id', id)
    .order('created_at', { ascending: false })
    .limit(60)
  if (since) activityQuery = activityQuery.gt('created_at', since)

  const [jobsRes, activitiesRes] = await Promise.all([
    activeMission
      ? supabase
          .from('agent_jobs')
          .select(`*, agent:agents(${AGENT_FIELDS})`)
          .eq('mission_id', activeMission.id)
          .order('phase')
          .order('created_at')
      : Promise.resolve({ data: [] }),
    activityQuery,
  ])

  return NextResponse.json({
    company: companyRes.data,
    agents: agentsRes.data ?? [],
    missions,
    active_mission: activeMission,
    jobs: jobsRes.data ?? [],
    activities: (activitiesRes.data ?? []).reverse(),
  })
}
