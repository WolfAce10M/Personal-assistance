/**
 * POST /api/book — crea la reserva y devuelve la URL de pago de Stripe.
 * 1) Recalcula el precio en servidor (temporada incluida) — nunca se fía del cliente.
 * 2) Crea la reserva 'pending' de forma atómica (sin solapes) con caducidad.
 * 3) Crea la sesión de Stripe Checkout y redirige al pago.
 * Sin Stripe configurado (modo demo o pago en base): confirma directamente.
 */
export const prerender = false;

import type { APIRoute } from 'astro';
import { quote, createPending, setStatus, sendConfirmationEmails } from '../../lib/bookings';
import { hasStripe, stripe, SITE_URL } from '../../lib/server';
import { fmtTime } from '../../data/booking';

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'BAD_JSON' }, 400);
  }

  // Validación de datos del cliente
  const name = str(body.name, 80);
  const email = str(body.email, 120);
  const phone = str(body.phone, 40);
  const locale = ['es', 'ca', 'fr', 'en', 'de', 'nl'].includes(String(body.locale)) ? String(body.locale) : 'es';
  const notes = str(body.notes ?? '', 500);
  if (!name || name.length < 2) return json({ error: 'BAD_NAME' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'BAD_EMAIL' }, 400);
  if (!phone || phone.length < 6) return json({ error: 'BAD_PHONE' }, 400);

  // Presupuesto oficial en servidor
  const { quote: q, error } = quote({
    type: String(body.type),
    itemId: String(body.itemId),
    day: String(body.day),
    startMin: Number(body.startMin),
    minutes: Number(body.minutes),
    qty: Number(body.qty),
  });
  if (!q) return json({ error }, 400);

  try {
    // Reserva pendiente (atómica; el hueco queda retenido HOLD_MINUTES)
    const created = await createPending(q, { name, email, phone, locale, notes });
    if ('error' in created) return json({ error: created.error }, 409);
    const bookingId = created.id;

    const summary = {
      item: q.itemName,
      day: q.day,
      time: fmtTime(q.startMin),
      qty: q.qty,
      total: q.total,
      season: q.season,
      name,
      email,
      phone,
      locale,
      id: bookingId,
    };

    if (!hasStripe()) {
      // MODO DEMO / pago en base: confirmar directamente y avisar por email.
      await setStatus(bookingId, 'confirmed');
      await sendConfirmationEmails(summary);
      return json({ redirect: `${base(locale)}/reservas/gracias?demo=1&id=${bookingId}` });
    }

    // Stripe Checkout — el pago confirma la reserva vía webhook.
    const session = await stripe().checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      locale: (locale === 'ca' ? 'es' : locale) as 'es' | 'fr' | 'en' | 'de' | 'nl',
      line_items: [
        {
          quantity: q.qty,
          price_data: {
            currency: 'eur',
            unit_amount: Math.round(q.unitPrice * 100),
            product_data: {
              name: q.itemName,
              description: `${q.day} · ${fmtTime(q.startMin)} · ${q.minutes} min`,
            },
          },
        },
      ],
      metadata: { booking_id: bookingId, locale },
      success_url: `${SITE_URL}${base(locale)}/reservas/gracias?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}${base(locale)}/reservas?cancelled=1`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 min como la retención
    });

    return json({ redirect: session.url });
  } catch (e) {
    console.error(e);
    return json({ error: 'SERVER_ERROR' }, 500);
  }
};

const base = (locale: string) => (locale === 'es' ? '' : `/${locale}`);
const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
