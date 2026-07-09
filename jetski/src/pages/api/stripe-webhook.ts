/**
 * POST /api/stripe-webhook — Stripe nos avisa aquí del resultado del pago.
 * checkout.session.completed → reserva confirmada + emails
 * checkout.session.expired   → hueco liberado
 * Verifica la firma criptográfica: nadie puede falsificar confirmaciones.
 */
export const prerender = false;

import type { APIRoute } from 'astro';
import { stripe, STRIPE_WEBHOOK_SECRET } from '../../lib/server';
import { setStatus, getBooking, sendConfirmationEmails } from '../../lib/bookings';
import { fmtTime } from '../../data/booking';

export const POST: APIRoute = async ({ request }) => {
  const sig = request.headers.get('stripe-signature');
  if (!sig || !STRIPE_WEBHOOK_SECRET) return new Response('Missing signature', { status: 400 });

  let event;
  try {
    const payload = await request.text();
    event = await stripe().webhooks.constructEventAsync(payload, sig, STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.error('Webhook signature failed:', e);
    return new Response('Bad signature', { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const bookingId = session.metadata?.booking_id;
      if (bookingId) {
        await setStatus(bookingId, 'confirmed', session.id);
        const b = await getBooking(bookingId);
        if (b) {
          await sendConfirmationEmails({
            item: `${b.item_id} (${b.type})`,
            day: b.day,
            time: fmtTime(b.start_min),
            qty: b.qty,
            total: Number(b.total_eur),
            season: b.season,
            name: b.customer_name,
            email: b.customer_email,
            phone: b.customer_phone,
            locale: b.locale,
            id: b.id,
          });
        }
      }
    } else if (event.type === 'checkout.session.expired') {
      const bookingId = event.data.object.metadata?.booking_id;
      if (bookingId) await setStatus(bookingId, 'expired');
    }
    return new Response('ok');
  } catch (e) {
    console.error(e);
    return new Response('error', { status: 500 });
  }
};
