/**
 * POST /api/admin/cancel — cancela una reserva (protegido por el middleware).
 * Al cancelar, el hueco queda libre automáticamente (deja de contar como activo).
 */
export const prerender = false;

import type { APIRoute } from 'astro';
import { setStatus } from '../../../lib/bookings';

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'BAD_JSON' }), { status: 400 });
  }
  const id = String(body.id ?? '');
  if (!id) return new Response(JSON.stringify({ error: 'NO_ID' }), { status: 400 });

  try {
    await setStatus(id, 'cancelled');
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'SERVER_ERROR' }), { status: 500 });
  }
};
