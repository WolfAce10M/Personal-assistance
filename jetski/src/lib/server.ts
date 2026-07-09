/**
 * Clientes de servidor: Supabase (BD), Stripe (pagos) y Resend (email).
 * Si faltan claves en .env se activa el MODO DEMO: el flujo funciona de
 * punta a punta sin cobrar ni guardar, para poder probar la web.
 * ESTE ARCHIVO SOLO SE IMPORTA DESDE ENDPOINTS (nunca llega al navegador).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const env = (k: string) => import.meta.env[k] ?? process.env[k] ?? '';

export const SUPABASE_URL = env('SUPABASE_URL');
export const SUPABASE_KEY = env('SUPABASE_SERVICE_ROLE_KEY');
export const STRIPE_KEY = env('STRIPE_SECRET_KEY');
export const STRIPE_WEBHOOK_SECRET = env('STRIPE_WEBHOOK_SECRET');
export const RESEND_KEY = env('RESEND_API_KEY');
export const NOTIFY_EMAIL = env('BOOKINGS_NOTIFY_EMAIL'); // correo del negocio
export const FROM_EMAIL = env('FROM_EMAIL') || 'reservas@costabravarentjetski.com';
export const SITE_URL = env('PUBLIC_SITE_URL') || 'http://localhost:4321';

export const hasDb = () => Boolean(SUPABASE_URL && SUPABASE_KEY);
export const hasStripe = () => Boolean(STRIPE_KEY);
export const hasMail = () => Boolean(RESEND_KEY);

let _db: SupabaseClient | null = null;
export function db(): SupabaseClient {
  if (!_db) _db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  return _db;
}

let _stripe: Stripe | null = null;
export function stripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(STRIPE_KEY);
  return _stripe;
}

/** Envío de email vía Resend (API HTTP, sin SDK). No lanza: devuelve ok/err. */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!hasMail()) {
    console.log(`[demo-email] to=${to} subject="${subject}"`);
    return true;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `Costa Brava Rent Jet Ski <${FROM_EMAIL}>`, to: [to], subject, html }),
    });
    if (!res.ok) console.error('Resend error:', res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error('Resend fetch failed:', e);
    return false;
  }
}
