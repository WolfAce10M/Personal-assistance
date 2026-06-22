import { NextRequest, NextResponse } from 'next/server'
import { getNotion, getParentPageId, createPage, createDatabase } from '@/lib/notion/client'
import { createClient } from '@/lib/supabase/server'

// Creates (or verifies) the Personal Assistance workspace structure in Notion
export async function POST(req: NextRequest) {
  try {
    const notion = getNotion()
    const parentId = getParentPageId()

    // Check if we already have IDs stored in Supabase
    const supabase = await createClient()
    const { data: existing } = await supabase
      .from('ai_memory')
      .select('key,value')
      .eq('category', 'notion')

    const stored: Record<string, string> = {}
    for (const row of existing ?? []) {
      stored[row.key] = row.value
    }

    const results: Record<string, string> = {}

    // 1 — CRM database
    if (!stored['crm_db_id']) {
      const db = await createDatabase(parentId, '📋 CRM — Contactos y Deals', {
        Estado: {
          select: {
            options: [
              { name: 'Lead', color: 'yellow' },
              { name: 'En proceso', color: 'blue' },
              { name: 'Cerrado', color: 'green' },
              { name: 'Perdido', color: 'red' },
            ],
          },
        },
        Empresa: { rich_text: {} },
        Email: { email: {} },
        Teléfono: { phone_number: {} },
        Valor: { number: { format: 'euro' } },
        Notas: { rich_text: {} },
        Fecha: { date: {} },
      })
      results['crm_db_id'] = db.id
      await supabase.from('ai_memory').upsert({ category: 'notion', key: 'crm_db_id', value: db.id })
    } else {
      results['crm_db_id'] = stored['crm_db_id']
    }

    // 2 — Briefings database
    if (!stored['briefings_db_id']) {
      const db = await createDatabase(parentId, '☀️ Briefings Diarios', {
        Fecha: { date: {} },
        Resumen: { rich_text: {} },
        Prioridad: {
          select: {
            options: [
              { name: 'Alta', color: 'red' },
              { name: 'Media', color: 'yellow' },
              { name: 'Normal', color: 'blue' },
            ],
          },
        },
      })
      results['briefings_db_id'] = db.id
      await supabase.from('ai_memory').upsert({ category: 'notion', key: 'briefings_db_id', value: db.id })
    } else {
      results['briefings_db_id'] = stored['briefings_db_id']
    }

    // 3 — Notas page (parent for note sub-pages)
    if (!stored['notes_page_id']) {
      const page = await createPage(parentId, '📝 Notas', 'Notas guardadas desde el asistente.')
      results['notes_page_id'] = page.id
      await supabase.from('ai_memory').upsert({ category: 'notion', key: 'notes_page_id', value: page.id })
    } else {
      results['notes_page_id'] = stored['notes_page_id']
    }

    // 4 — Tareas database (synced from POS)
    if (!stored['tasks_db_id']) {
      const db = await createDatabase(parentId, '✅ Tareas', {
        Estado: {
          select: {
            options: [
              { name: 'Pendiente', color: 'yellow' },
              { name: 'En progreso', color: 'blue' },
              { name: 'Completada', color: 'green' },
            ],
          },
        },
        Prioridad: {
          select: {
            options: [
              { name: 'Alta', color: 'red' },
              { name: 'Media', color: 'yellow' },
              { name: 'Baja', color: 'gray' },
            ],
          },
        },
        Fecha: { date: {} },
      })
      results['tasks_db_id'] = db.id
      await supabase.from('ai_memory').upsert({ category: 'notion', key: 'tasks_db_id', value: db.id })
    } else {
      results['tasks_db_id'] = stored['tasks_db_id']
    }

    // 5 — Objetivos database
    if (!stored['goals_db_id']) {
      const db = await createDatabase(parentId, '🎯 Objetivos', {
        Tipo: {
          select: {
            options: [
              { name: 'Negocio', color: 'blue' },
              { name: 'Personal', color: 'green' },
              { name: 'Fitness', color: 'orange' },
              { name: 'Finanzas', color: 'yellow' },
            ],
          },
        },
        Progreso: { number: { format: 'percent' } },
        Estado: {
          select: {
            options: [
              { name: 'Activo', color: 'green' },
              { name: 'Pausado', color: 'yellow' },
              { name: 'Completado', color: 'blue' },
            ],
          },
        },
        Fecha_limite: { date: {} },
      })
      results['goals_db_id'] = db.id
      await supabase.from('ai_memory').upsert({ category: 'notion', key: 'goals_db_id', value: db.id })
    } else {
      results['goals_db_id'] = stored['goals_db_id']
    }

    return NextResponse.json({ ok: true, ids: results })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    console.error('Notion setup error:', err)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('ai_memory')
      .select('key,value')
      .eq('category', 'notion')

    const ids: Record<string, string> = {}
    for (const row of data ?? []) ids[row.key] = row.value
    return NextResponse.json({ ok: true, connected: Object.keys(ids).length > 0, ids })
  } catch {
    return NextResponse.json({ ok: false, connected: false, ids: {} })
  }
}
