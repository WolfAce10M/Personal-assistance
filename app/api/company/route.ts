import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { seedAgents } from '@/lib/agents/engine'
import { findCompanyTemplate } from '@/lib/agents/roster'

export async function GET() {
  const supabase = await createClient()

  const { data: companies, error } = await supabase
    .from('companies')
    .select('*, agents(id, name, specialty, icon, color, role, status)')
    .neq('status', 'archived')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: running } = await supabase
    .from('missions')
    .select('company_id')
    .in('status', ['planning', 'running'])

  const runningByCompany = new Map<string, number>()
  for (const m of running ?? []) {
    runningByCompany.set(m.company_id, (runningByCompany.get(m.company_id) ?? 0) + 1)
  }

  return NextResponse.json({
    companies: (companies ?? []).map(c => ({
      ...c,
      running_missions: runningByCompany.get(c.id) ?? 0,
    })),
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
  }

  const template = findCompanyTemplate(body.template ?? 'custom')

  const { data: company, error } = await supabase
    .from('companies')
    .insert({
      name: body.name.trim(),
      description: body.description ?? null,
      mission: body.mission ?? null,
      template: template.key,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try {
    await seedAgents(supabase, company.id, template.specialties)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al crear el equipo' },
      { status: 500 }
    )
  }

  return NextResponse.json({ company }, { status: 201 })
}
