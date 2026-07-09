/**
 * POST /api/contact — formulario de contacto → email al negocio.
 * Incluye honeypot antispam (campo oculto "website").
 */
export const prerender = false;

import type { APIRoute } from 'astro';
import { sendEmail, NOTIFY_EMAIL, hasMail } from '../../lib/server';

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'BAD_JSON' }, 400);
  }

  // Honeypot: los bots rellenan este campo invisible; los humanos no.
  if (String(body.website ?? '')) return json({ ok: true });

  const name = String(body.name ?? '').trim().slice(0, 80);
  const email = String(body.email ?? '').trim().slice(0, 120);
  const message = String(body.message ?? '').trim().slice(0, 2000);
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 5) {
    return json({ error: 'BAD_INPUT' }, 400);
  }

  const to = NOTIFY_EMAIL;
  if (!to || !hasMail()) {
    console.log(`[demo-contact] ${name} <${email}>: ${message}`);
    return json({ ok: true, demo: true });
  }

  const ok = await sendEmail(
    to,
    `📩 Contacto web: ${name}`,
    `<div style="font-family:Arial;font-size:15px">
      <p><strong>${name}</strong> &lt;${email}&gt;</p>
      <p style="white-space:pre-wrap">${message.replace(/</g, '&lt;')}</p>
    </div>`
  );
  return json(ok ? { ok: true } : { error: 'SEND_FAILED' }, ok ? 200 : 500);
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
