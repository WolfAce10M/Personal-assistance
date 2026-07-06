import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

// Cliente sin cookies para trabajo en background (motor de agentes).
// Usa la service role key si existe; si no, la anon key (sin RLS en este proyecto).
export function createServiceClient(): SupabaseClient {
  if (!_client) {
    _client = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    )
  }
  return _client
}
