import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { findTemplate, genericTemplate, SPECIALIST_TEMPLATES } from '@/lib/agents/roster'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('company_id', id)
    .order('sort_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const hired = new Set((data ?? []).filter(a => a.is_active).map(a => a.specialty))
  const available = SPECIALIST_TEMPLATES.filter(t => !hired.has(t.specialty)).map(t => ({
    specialty: t.specialty,
    name: t.name,
    icon: t.icon,
    color: t.color,
    description: t.description,
  }))

  return NextResponse.json({ agents: data, available })
}

// Contratar un especialista (de plantilla o personalizado)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await req.json()

  if (!body.specialty?.trim()) {
    return NextResponse.json({ error: 'La especialidad es obligatoria' }, { status: 400 })
  }

  const specialty = body.specialty.trim().toLowerCase().replace(/\s+/g, '-')
  const t = findTemplate(specialty) ?? genericTemplate(specialty)

  const { data, error } = await supabase
    .from('agents')
    .upsert(
      {
        company_id: id,
        role: t.role,
        specialty: t.specialty,
        name: body.name?.trim() || t.name,
        icon: t.icon,
        color: t.color,
        description: body.description?.trim() || t.description,
        system_prompt: body.system_prompt?.trim() || t.systemPrompt,
        model_policy: body.model_policy ?? 'auto',
        sort_order: t.sortOrder,
        is_active: true,
      },
      { onConflict: 'company_id,specialty' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ agent: data }, { status: 201 })
}
