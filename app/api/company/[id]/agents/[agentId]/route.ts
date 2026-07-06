import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; agentId: string }> }
) {
  const { id, agentId } = await params
  const supabase = await createClient()
  const body = await req.json()

  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.description !== undefined) updates.description = body.description
  if (body.system_prompt !== undefined) updates.system_prompt = body.system_prompt
  if (body.model_policy !== undefined) updates.model_policy = body.model_policy
  if (body.is_active !== undefined) updates.is_active = body.is_active

  const { data, error } = await supabase
    .from('agents')
    .update(updates)
    .eq('id', agentId)
    .eq('company_id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ agent: data })
}

// Despedir a un especialista (director y auditor no se pueden eliminar)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; agentId: string }> }
) {
  const { id, agentId } = await params
  const supabase = await createClient()

  const { data: agent } = await supabase
    .from('agents')
    .select('role')
    .eq('id', agentId)
    .eq('company_id', id)
    .single()

  if (!agent) return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 })
  if (agent.role !== 'specialist') {
    return NextResponse.json({ error: 'El director y el auditor no se pueden eliminar' }, { status: 400 })
  }

  const { error } = await supabase.from('agents').delete().eq('id', agentId).eq('company_id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
