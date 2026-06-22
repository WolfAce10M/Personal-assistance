import { NextRequest, NextResponse } from 'next/server'
import { addDatabaseRow, queryDatabase } from '@/lib/notion/client'
import { createClient } from '@/lib/supabase/server'

async function getCrmDbId(): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('ai_memory')
      .select('value')
      .eq('category', 'notion')
      .eq('key', 'crm_db_id')
      .maybeSingle()
    return data?.value ?? null
  } catch { return null }
}

export async function POST(req: NextRequest) {
  try {
    const { name, empresa, email, telefono, estado = 'Lead', valor, notas } = await req.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

    const crmDbId = await getCrmDbId()
    if (!crmDbId) return NextResponse.json({ error: 'Notion no configurado' }, { status: 400 })

    const properties: Record<string, unknown> = {
      Name: { title: [{ type: 'text', text: { content: name } }] },
      Estado: { select: { name: estado } },
    }
    if (empresa) properties['Empresa'] = { rich_text: [{ type: 'text', text: { content: empresa } }] }
    if (email) properties['Email'] = { email }
    if (telefono) properties['Teléfono'] = { phone_number: telefono }
    if (valor) properties['Valor'] = { number: parseFloat(valor) }
    if (notas) properties['Notas'] = { rich_text: [{ type: 'text', text: { content: notas } }] }

    const page = await addDatabaseRow(crmDbId, properties)
    return NextResponse.json({ ok: true, pageId: page.id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    console.error('Notion CRM error:', err)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

export async function GET() {
  try {
    const crmDbId = await getCrmDbId()
    if (!crmDbId) return NextResponse.json({ contacts: [] })
    const { results } = await queryDatabase(crmDbId, 50)
    return NextResponse.json({ contacts: results })
  } catch {
    return NextResponse.json({ contacts: [] })
  }
}
