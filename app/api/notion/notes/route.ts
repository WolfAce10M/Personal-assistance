import { NextRequest, NextResponse } from 'next/server'
import { createPage, appendToPage } from '@/lib/notion/client'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

async function getNotesPageId(): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('ai_memory')
      .select('value')
      .eq('category', 'notion')
      .eq('key', 'notes_page_id')
      .maybeSingle()
    return data?.value ?? null
  } catch { return null }
}

export async function POST(req: NextRequest) {
  try {
    const { title, content, source = 'web' } = await req.json()
    if (!content?.trim()) return NextResponse.json({ error: 'Contenido requerido' }, { status: 400 })

    const notesPageId = await getNotesPageId()
    if (!notesPageId) return NextResponse.json({ error: 'Notion no configurado. Ve a Ajustes → Notion → Configurar.' }, { status: 400 })

    const date = format(new Date(), "d 'de' MMMM yyyy, HH:mm", { locale: es })
    const pageTitle = title?.trim() || `Nota — ${date}`
    const fullContent = `Fuente: ${source}\nFecha: ${date}\n\n${content}`

    const page = await createPage(notesPageId, pageTitle, fullContent)

    return NextResponse.json({ ok: true, pageId: page.id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    console.error('Notion notes error:', err)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
