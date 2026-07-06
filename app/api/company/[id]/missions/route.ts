import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runMission } from '@/lib/agents/engine'

// Las misiones pueden tardar varios minutos (varios modelos en paralelo).
// 300s es el máximo del plan Hobby de Vercel; en Pro puede subirse a 800.
export const maxDuration = 300

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('missions')
    .select('*')
    .eq('company_id', id)
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ missions: data })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await req.json()

  if (!body.objective?.trim()) {
    return NextResponse.json({ error: 'El objetivo es obligatorio' }, { status: 400 })
  }

  const { data: company } = await supabase.from('companies').select('id, status').eq('id', id).single()
  if (!company) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })
  if (company.status !== 'active') {
    return NextResponse.json({ error: 'La empresa está pausada. Actívala para lanzar misiones.' }, { status: 409 })
  }

  const { data: running } = await supabase
    .from('missions')
    .select('id')
    .eq('company_id', id)
    .in('status', ['planning', 'running'])
    .limit(1)
  if (running && running.length > 0) {
    return NextResponse.json(
      { error: 'Ya hay una misión en curso. Espera a que termine.' },
      { status: 409 }
    )
  }

  const { data: mission, error } = await supabase
    .from('missions')
    .insert({ company_id: id, objective: body.objective.trim() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // El motor corre en background tras responder; el dashboard lo sigue por polling
  after(() => runMission(mission.id))

  return NextResponse.json({ mission }, { status: 201 })
}
